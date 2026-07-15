import { NextResponse } from "next/server";

import { createOAuthState } from "@/lib/integrations/google-workspace";
import {
  buildOAuthAuthorizationUrl,
  getOAuthProvider,
  OAuthConfigError,
  OAUTH_STATE_COOKIE,
} from "@/lib/integrations/oauth-providers";
import { IntegrationLimitError } from "@/lib/integration-limits";
import { assertIntegrationCapacity } from "@/lib/integration-limits-server";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ type: string }> };

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { type } = await params;

  const provider = getOAuthProvider(type);
  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration type" }, { status: 404 });
  }

  return withTenant(async (_request, ctx: TenantContext) => {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { plan: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    try {
      await assertIntegrationCapacity(ctx.organizationId, org.plan, {
        excludeType: provider.type,
      });
    } catch (error) {
      if (error instanceof IntegrationLimitError) {
        const params = new URLSearchParams({
          error: error.code,
          used: String(error.used),
          limit: String(error.limit),
          plan: error.plan,
        });
        return NextResponse.redirect(
          new URL(`/integrations?${params.toString()}`, req.url)
        );
      }
      throw error;
    }

    try {
      const state = createOAuthState(ctx.organizationId);
      const authUrl = buildOAuthAuthorizationUrl(provider, state);
      const response = NextResponse.redirect(authUrl);
      response.cookies.set(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
      });
      return response;
    } catch (error) {
      if (error instanceof OAuthConfigError) {
        const params = new URLSearchParams({
          error: "oauth_not_configured",
          provider: provider.displayName,
        });
        return NextResponse.redirect(
          new URL(`/integrations?${params.toString()}`, req.url)
        );
      }
      throw error;
    }
  })(req);
}
