"use client";

import type { ReactNode } from "react";

import { DashboardCollapsibleSidebar } from "@/components/dashboard/DashboardCollapsibleSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardLayoutProvider } from "@/components/dashboard/dashboard-layout-context";
import { ProductTourProvider } from "@/components/product-tour/ProductTourProvider";

export function DashboardShell({
  children,
  planChipText,
  productTourCompleted,
  orgOnboardingComplete,
}: {
  children: ReactNode;
  planChipText: string | null;
  productTourCompleted: boolean;
  orgOnboardingComplete: boolean;
}): React.JSX.Element {
  return (
    <DashboardLayoutProvider>
      <ProductTourProvider
        initialCompleted={productTourCompleted}
        orgOnboardingComplete={orgOnboardingComplete}
      >
        <div className="flex min-h-screen w-full flex-col sm:flex-row">
          <DashboardCollapsibleSidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background">
              <DashboardHeader planChipText={planChipText} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
              {children}
            </div>
          </div>
        </div>
      </ProductTourProvider>
    </DashboardLayoutProvider>
  );
}
