import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Returns Clerk organization ids for the signed-in user (server-side).
 * Used from /post-auth when the client org list is empty so we can activate
 * a membership before Clerk's client cache catches up.
 */
export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (userId === null || userId === "") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 20,
  });

  const organizationIds: string[] = (memberships.data ?? []).map((m) => m.organization.id);
  return NextResponse.json({ organizationIds });
}
