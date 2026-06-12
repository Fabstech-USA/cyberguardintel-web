import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { encryptCredentials } from "@/lib/crypto";
import { parseOAuthState } from "@/lib/integrations/google-workspace";
import {
  exchangeOAuthCode,
  getOAuthProvider,
  OAUTH_STATE_COOKIE,
  serializeOAuthPayloadForStorage,
} from "@/lib/integrations/oauth-providers";
import { IntegrationLimitError } from "@/lib/integration-limits";
import { assertIntegrationCapacity } from "@/lib/integration-limits-server";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ type: string }> };

function redirectWithCookieClear(path: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(path, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { type } = await params;

  const provider = getOAuthProvider(type);
  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration type" }, { status: 404 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const parsedState = parseOAuthState(state);
  if (!parsedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  return withTenant(async (_request, ctx: TenantContext) => {
    if (parsedState.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { plan: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const existing = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: ctx.organizationId,
          type: provider.type,
        },
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      try {
        await assertIntegrationCapacity(ctx.organizationId, org.plan);
      } catch (error) {
        if (error instanceof IntegrationLimitError) {
          return redirectWithCookieClear(
            "/integrations?error=integration_limit_reached"
          );
        }
        throw error;
      }
    }

    const tokenPayload = await exchangeOAuthCode(provider, code);
    const encryptedCreds = encryptCredentials(
      serializeOAuthPayloadForStorage(tokenPayload)
    );

    const integration = await prisma.integration.upsert({
      where: {
        organizationId_type: {
          organizationId: ctx.organizationId,
          type: provider.type,
        },
      },
      create: {
        organizationId: ctx.organizationId,
        type: provider.type,
        displayName: provider.displayName,
        encryptedCreds,
        status: "ACTIVE",
        errorMessage: null,
      },
      update: {
        encryptedCreds,
        status: "ACTIVE",
        errorMessage: null,
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "integration.connected",
      resourceType: "Integration",
      resourceId: integration.id,
      metadata: { type: provider.type },
    });

    return redirectWithCookieClear(`/integrations?connected=${provider.type}`);
  })(req);
}
