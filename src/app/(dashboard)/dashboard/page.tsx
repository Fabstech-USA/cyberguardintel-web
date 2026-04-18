import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function DashboardHomePage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/post-auth");

  const user = await currentUser();

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      frameworks: {
        include: { framework: { select: { name: true, slug: true } } },
      },
      _count: {
        select: {
          members: true,
          policies: true,
          evidence: true,
          integrations: true,
        },
      },
    },
  });

  if (!org) redirect("/onboarding");
  if (org.onboardingStep !== null) redirect("/onboarding");

  const recentLogs = await prisma.auditLog.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      action: true,
      actorId: true,
      resourceType: true,
      createdAt: true,
    },
  });

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.firstName ?? "there"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {org.name} &mdash;{" "}
          <Badge variant="secondary" className="text-xs">
            {org.plan}
          </Badge>
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={org._count.members} />
        <StatCard title="Policies" value={org._count.policies} />
        <StatCard title="Evidence Items" value={org._count.evidence} />
        <StatCard title="Integrations" value={org._count.integrations} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Your compliance account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Industry" value={formatIndustry(org.industry)} />
            {org.employeeCount && (
              <Row label="Employees" value={org.employeeCount.toString()} />
            )}
            {org.hipaaSubjectType && (
              <Row
                label="HIPAA Type"
                value={org.hipaaSubjectType.replace(/_/g, " ")}
              />
            )}
            <Row label="Billing Email" value={org.billingEmail} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrolled Frameworks</CardTitle>
            <CardDescription>
              {org.frameworks.length === 0
                ? "No frameworks enrolled yet"
                : `${org.frameworks.length} framework${org.frameworks.length > 1 ? "s" : ""} active`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {org.frameworks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Go to Settings to enroll in a compliance framework.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {org.frameworks.map((of) => (
                  <Badge key={of.id} variant="outline">
                    {of.framework.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{log.action}</span>
                    <span className="ml-2 text-muted-foreground">
                      on {log.resourceType}
                    </span>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {log.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function formatIndustry(industry: string): string {
  return industry.charAt(0) + industry.slice(1).toLowerCase();
}
