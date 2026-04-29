"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, ShieldCheck, TriangleAlert, Plus } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/generated/prisma";

type Member = {
  clerkUserId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  clerkRole: string | null;
  role: OrgRole;
  mfaEnabled: boolean;
};

type InvitationRow = {
  id: string;
  emailAddress: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  url: string | null;
  invitedBy: {
    userId: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
  expiresInDays: number | null;
};

type MembersResponse = {
  members: Member[];
  invitationRows: InvitationRow[];
  invitations: Array<{
    id: string;
    emailAddress: string;
    status: string;
    role: string;
    createdAt: string;
  }>;
  anyMemberMissingMfa: boolean;
  currentUserRole: OrgRole;
  clerk: {
    membersCount: number;
    pendingInvitationsCount: number;
    maxAllowedMemberships: number;
  };
};

type PostInviteResponse = {
  error?: string;
  invitationRows?: InvitationRow[];
  clerk?: MembersResponse["clerk"];
};

function canManage(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canChangeRoles(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function assignableMemberRoles(actor: OrgRole | null): OrgRole[] {
  if (!actor) return [];
  if (actor === "OWNER") {
    return ["OWNER", "ADMIN", "MEMBER", "AUDITOR"];
  }
  if (actor === "ADMIN") {
    return ["ADMIN", "MEMBER", "AUDITOR"];
  }
  return [];
}

function roleLabel(role: OrgRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Member";
    case "AUDITOR":
      return "Auditor";
    default:
      return role satisfies never;
  }
}

function rolePillClass(role: OrgRole): string {
  switch (role) {
    case "OWNER":
      return "border border-border bg-muted text-foreground";
    case "ADMIN":
      return "border border-border bg-muted text-foreground";
    case "MEMBER":
      return "border border-border bg-muted/60 text-muted-foreground";
    case "AUDITOR":
      return "border border-border bg-muted text-foreground";
    default:
      return role satisfies never;
  }
}

function initials(name: string | null, email: string | null): string {
  const base = (name ?? "").trim();
  if (base) {
    const parts = base.split(/\s+/g).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

function formatInvitationDate(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy");
}

function invitationStatusBadgeVariant(
  status: string
):
  | "default"
  | "secondary"
  | "outline"
  | "destructive" {
  const s = status.toLowerCase();
  if (s === "pending") return "secondary";
  if (s === "accepted") return "default";
  if (s === "revoked" || s === "expired") return "outline";
  return "secondary";
}

function invitationStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "accepted") return "Accepted";
  if (s === "revoked") return "Revoked";
  if (s === "expired") return "Expired";
  return status;
}

export function MembersSettings(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<OrgRole | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitationRows, setInvitationRows] = useState<InvitationRow[]>([]);
  const [anyMissingMfa, setAnyMissingMfa] = useState(false);
  const [clerkOrg, setClerkOrg] = useState<MembersResponse["clerk"] | null>(
    null
  );

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("MEMBER");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managedMemberId, setManagedMemberId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"members" | "invitations">("members");

  const manageable = useMemo(
    () => (currentUserRole ? canManage(currentUserRole) : false),
    [currentUserRole]
  );
  const roleManageable = useMemo(
    () => (currentUserRole ? canChangeRoles(currentUserRole) : false),
    [currentUserRole]
  );

  const hasHiddenPendingInvites = useMemo(() => {
    if (!clerkOrg) return false;
    return (
      clerkOrg.pendingInvitationsCount > 0 && invitationRows.length === 0
    );
  }, [clerkOrg, invitationRows.length]);

  const displayedPendingCount = useMemo(() => {
    if (clerkOrg && clerkOrg.pendingInvitationsCount > 0) {
      return clerkOrg.pendingInvitationsCount;
    }
    return invitationRows.filter((i) => i.status.toLowerCase() === "pending")
      .length;
  }, [clerkOrg, invitationRows]);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/settings/members", { method: "GET" });
      const data = (await res.json()) as MembersResponse | { error: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Failed to load members.");
      }

      setCurrentUserRole((data as MembersResponse).currentUserRole);
      setMembers((data as MembersResponse).members);
      if ("clerk" in (data as MembersResponse)) {
        setClerkOrg((data as MembersResponse).clerk);
      }
      setInvitationRows((prev) => {
        const incoming = (data as MembersResponse).invitationRows ?? [];
        const byId = new Map<string, InvitationRow>();
        for (const inv of [...incoming, ...prev]) {
          byId.set(inv.id, inv);
        }
        return Array.from(byId.values()).sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt))
        );
      });
      setAnyMissingMfa((data as MembersResponse).anyMemberMissingMfa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite(): Promise<void> {
    setError(null);
    setSuccess(null);

    const emails = inviteEmails
      .split(/[,\n]/g)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setError("Enter at least one email.");
      return;
    }

    setBusyId("invite");
    try {
      const res = await fetch("/api/settings/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails, role: inviteRole }),
      });
      const data = (await res.json()) as PostInviteResponse;
      if (!res.ok) {
        if (data.clerk) {
          setClerkOrg(data.clerk);
        }
        const rows = data.invitationRows ?? [];
        if (rows.length > 0) {
          setInvitationRows((prev) => {
            const next = [...rows, ...prev];
            const byId = new Map(next.map((i) => [i.id, i]));
            return Array.from(byId.values());
          });
        }
        throw new Error(data.error ?? "Failed to invite members.");
      }

      setInviteEmails("");
      setSuccess("Invitations sent.");
      setInviteOpen(false);
      const rows = data.invitationRows ?? [];
      if (rows.length > 0) {
        setInvitationRows((prev) => {
          const next = [...rows, ...prev];
          const byId = new Map(next.map((i) => [i.id, i]));
          return Array.from(byId.values());
        });
      }
      // Reload memberships, but do not wipe optimistic invitations if Clerk
      // invitation listing is delayed in this instance.
      setTimeout(() => {
        void load();
      }, 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite members.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(clerkUserId: string, role: OrgRole): Promise<void> {
    setError(null);
    setSuccess(null);
    setBusyId(clerkUserId);

    try {
      const res = await fetch("/api/settings/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clerkUserId, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to change role.");
      }

      setMembers((prev) =>
        prev.map((m) => (m.clerkUserId === clerkUserId ? { ...m, role } : m))
      );
      setSuccess("Role updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(clerkUserId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    setBusyId(clerkUserId);

    try {
      const res = await fetch("/api/settings/members", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clerkUserId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove member.");
      }

      setMembers((prev) => prev.filter((m) => m.clerkUserId !== clerkUserId));
      setSuccess("Member removed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member.");
    } finally {
      setBusyId(null);
    }
  }

  const inviteFormPanel = inviteOpen ? (
    <div className="mt-4 rounded-lg border border-border p-4">
      <div className="grid gap-4 md:grid-cols-12 md:items-start">
        <div className="grid gap-2 md:col-span-7">
          <Label htmlFor="invite-emails">Email addresses</Label>
          <Input
            id="invite-emails"
            placeholder="name@company.com, other@company.com"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            disabled={!manageable || busyId === "invite" || loading}
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple emails with commas.
          </p>
        </div>
        <div className="grid gap-2 md:col-span-3">
          <Label>Role</Label>
          <Select
            value={inviteRole}
            onValueChange={(v) => setInviteRole(v as OrgRole)}
            disabled={!manageable || busyId === "invite" || loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {(["MEMBER", "ADMIN", "AUDITOR"] as OrgRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground opacity-0">
            Separate multiple emails with commas.
          </p>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label className="opacity-0">Send</Label>
          <Button
            onClick={() => void invite()}
            disabled={!manageable || busyId === "invite" || loading}
            className="w-full"
          >
            {busyId === "invite" ? "Inviting…" : "Send"}
          </Button>
          <p className="text-xs text-muted-foreground opacity-0">
            Separate multiple emails with commas.
          </p>
        </div>
      </div>
      {!manageable ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Only Owners and Admins can invite members.
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Members</h2>

      {anyMissingMfa ? (
        <div className="rounded-lg border border-border bg-amber-50/90 px-4 py-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <span className="font-semibold">
              {members.filter((m) => m.clerkUserId && !m.mfaEnabled).length} member
              without MFA
            </span>
            <span className="text-amber-900/80 dark:text-amber-100/80">
              — HIPAA 164.312(d) requires person authentication. MFA is enforced
              automatically on next sign-in.
            </span>
          </div>
        </div>
      ) : null}

      <Card className="p-6">
        <div
          className="flex flex-wrap items-start justify-between gap-4 border-b border-border"
          role="tablist"
          aria-label="Members and invitations"
        >
          <div className="flex gap-8">
            <button
              type="button"
              role="tab"
              aria-selected={subTab === "members"}
              onClick={() => setSubTab("members")}
              className={cn(
                "-mb-px border-b-2 bg-transparent px-0.5 pb-2.5 text-sm font-medium transition-colors",
                subTab === "members"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/80"
              )}
            >
              Members
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === "invitations"}
              onClick={() => setSubTab("invitations")}
              className={cn(
                "-mb-px border-b-2 bg-transparent px-0.5 pb-2.5 text-sm font-medium transition-colors",
                subTab === "invitations"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/80"
              )}
            >
              Invitations
            </button>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Button
              className="bg-emerald-700 text-white hover:bg-emerald-700/90"
              onClick={() => setInviteOpen((v) => !v)}
              disabled={!manageable || loading}
            >
              <Plus className="size-4" aria-hidden="true" />
              Invite member
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {subTab === "members" ? (
          <>
            <div className="mt-5">
              <h3 className="text-base font-semibold">Team members</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length} members ·{" "}
                {displayedPendingCount > 0
                  ? `${displayedPendingCount} pending invites · `
                  : ""}
                HIPAA 164.308(a)(3) workforce clearance
              </p>
            </div>

            {inviteFormPanel}

            <Separator className="my-4" />

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-xl border border-border">
                {members.map((m) => {
                  const isBusy = busyId === m.clerkUserId;
                  const isManaged = managedMemberId === m.clerkUserId;
                  return (
                    <div
                      key={m.clerkUserId}
                      className="border-b border-border last:border-b-0"
                    >
                      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-12 md:items-center">
                        <div className="flex min-w-0 items-center gap-3 md:col-span-5">
                          <Avatar>
                            <AvatarImage src={m.imageUrl ?? undefined} alt="" />
                            <AvatarFallback>
                              {initials(m.name, m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {m.name ?? m.email ?? m.clerkUserId}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {m.email ?? "—"}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-3 md:flex md:justify-center">
                          <span
                            className={`inline-flex min-w-[140px] items-center justify-center rounded-full px-3 py-1 text-sm ${rolePillClass(m.role)}`}
                          >
                            {roleLabel(m.role)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 md:col-span-2">
                          <span
                            className={`inline-flex size-5 items-center justify-center rounded-full border ${
                              m.mfaEnabled
                                ? "border-emerald-700/40 text-emerald-700"
                                : "border-amber-700/40 text-amber-700"
                            }`}
                            aria-hidden="true"
                          >
                            <ShieldCheck className="size-3.5" />
                          </span>
                          <span
                            className={`text-sm ${
                              m.mfaEnabled
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {m.mfaEnabled ? "MFA on" : "MFA required"}
                          </span>
                        </div>

                        <div className="flex items-center justify-end md:col-span-2">
                          <Button
                            variant={isManaged ? "outline" : "ghost"}
                            onClick={() =>
                              setManagedMemberId((prev) =>
                                prev === m.clerkUserId ? null : m.clerkUserId
                              )
                            }
                            disabled={!manageable || isBusy || loading}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>

                      {isManaged ? (
                        <div className="border-t border-border bg-muted/30 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm text-muted-foreground">
                                Role
                              </div>
                              {currentUserRole === "ADMIN" && m.role === "OWNER" ? (
                                <span className="text-sm text-muted-foreground">
                                  {roleLabel(m.role)} — only an Owner can change
                                  this member.
                                </span>
                              ) : (
                                <Select
                                  value={m.role}
                                  onValueChange={(v) =>
                                    void changeRole(m.clerkUserId, v as OrgRole)
                                  }
                                  disabled={
                                    !roleManageable || isBusy || loading
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {assignableMemberRoles(
                                      currentUserRole
                                    ).map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {roleLabel(r)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {!roleManageable ? (
                                <span className="text-sm text-muted-foreground">
                                  Only Owners and Admins can change roles.
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="destructive"
                                onClick={() => void removeMember(m.clerkUserId)}
                                disabled={!manageable || isBusy || loading}
                              >
                                {isBusy ? "Working…" : "Remove member"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setManagedMemberId(null)}
                                disabled={isBusy}
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {inviteFormPanel}
            <div className="mt-5">
              <h3 className="text-base font-semibold">Invitations</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {loading
                  ? "…"
                  : `${invitationRows.length} total · ${
                      displayedPendingCount > 0
                        ? `${displayedPendingCount} pending`
                        : "No pending"
                    }`}
              </p>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Loading invitations…
              </p>
            ) : (
              <>
                {clerkOrg &&
                hasHiddenPendingInvites &&
                invitationRows.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                    <div className="font-semibold">Pending invitations</div>
                    <p className="mt-1 text-amber-100/80">
                      Clerk reports{" "}
                      <span className="font-mono text-amber-100">
                        {clerkOrg.pendingInvitationsCount}
                      </span>{" "}
                      outstanding invitation
                      {clerkOrg.pendingInvitationsCount === 1 ? "" : "s"},
                      but the invitation list API is returning 0 items for this
                      org in this dev session. Open the Clerk dashboard for
                      this org and check{" "}
                      <span className="font-medium">Invitations</span>{" "}
                      (revoke/resend) — then refresh.
                    </p>
                  </div>
                ) : null}

                {invitationRows.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/20">
                    <div className="min-w-[900px] p-4">
                      <div className="grid grid-cols-12 items-center gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
                        <div className="col-span-12 md:col-span-3">Email</div>
                        <div className="col-span-12 md:col-span-3">Status</div>
                        <div className="col-span-12 md:col-span-4">
                          Invited by
                        </div>
                        <div className="col-span-12 md:col-span-1">Invited</div>
                        <div className="col-span-12 md:col-span-1 text-right" />
                      </div>

                      {invitationRows.map((inv) => {
                        const expiryLabel =
                          inv.status.toLowerCase() === "pending" &&
                          typeof inv.expiresInDays === "number" &&
                          inv.expiresInDays >= 0
                            ? inv.expiresInDays === 0
                              ? "Expires today"
                              : `Expires in ${inv.expiresInDays} day${
                                  inv.expiresInDays === 1 ? "" : "s"
                                }`
                            : null;

                        return (
                          <div
                            key={
                              inv.id.length > 0
                                ? inv.id
                                : `${inv.emailAddress}:${inv.createdAt}`
                            }
                            className="grid grid-cols-12 items-center gap-2 border-b border-border py-3 last:border-b-0"
                          >
                            <div className="col-span-12 min-w-0 md:col-span-3">
                              <div className="truncate text-sm font-medium">
                                {inv.emailAddress}
                              </div>
                              {inv.role ? (
                                <div className="truncate text-xs text-muted-foreground">
                                  Role: {inv.role}
                                </div>
                              ) : null}
                            </div>

                            <div className="col-span-12 flex flex-wrap items-center gap-2 md:col-span-3">
                              <Badge
                                variant={invitationStatusBadgeVariant(
                                  inv.status
                                )}
                              >
                                {invitationStatusLabel(inv.status)}
                              </Badge>
                              {expiryLabel ? (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  {expiryLabel}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="col-span-12 min-w-0 md:col-span-4">
                              {inv.invitedBy ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-7">
                                    <AvatarImage
                                      src={inv.invitedBy.imageUrl ?? undefined}
                                      alt=""
                                    />
                                    <AvatarFallback>
                                      {initials(
                                        inv.invitedBy.name,
                                        inv.invitedBy.email
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm">
                                      {inv.invitedBy.name ??
                                        inv.invitedBy.email ??
                                        "—"}
                                    </div>
                                    <div className="truncate text-sm text-muted-foreground">
                                      {inv.invitedBy.email ?? "—"}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  —
                                </div>
                              )}
                            </div>

                            <div className="col-span-12 text-sm text-muted-foreground md:col-span-1">
                              {formatInvitationDate(inv.createdAt)}
                            </div>

                            <div className="col-span-12 flex items-center justify-end md:col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Invitation actions"
                                disabled
                              >
                                <MoreHorizontal
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No invitations yet.
                  </p>
                )}
              </>
            )}
          </>
        )}

        <Separator className="my-4" />

        <p className="text-sm text-muted-foreground">
          Owners can delete the organization. Admins manage members, integrations,
          and policies. Members can view and contribute. Auditors get read-only
          access — perfect for external CPA firms.
        </p>

        <div className="mt-4">
          {success ? (
            <p className="text-sm text-muted-foreground">{success}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
}

