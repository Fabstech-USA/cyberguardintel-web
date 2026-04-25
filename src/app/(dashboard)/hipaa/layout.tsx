import type { ReactNode } from "react";

import { DashboardFrameworkTabs } from "@/components/dashboard/DashboardFrameworkTabs";
import { HipaaWorkspaceNav } from "@/components/dashboard/HipaaWorkspaceNav";

export default function HipaaLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex w-full flex-col px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8 lg:px-8">
      <div className="w-full space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="space-y-0">
          <DashboardFrameworkTabs active="hipaa" />
          <HipaaWorkspaceNav />
        </div>
        <div className="pt-1">{children}</div>
      </div>
    </div>
  );
}
