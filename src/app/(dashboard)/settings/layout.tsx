import type { ReactNode } from "react";

import { SettingsTabsNav } from "@/components/settings/SettingsTabsNav";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization, team members, billing, and security posture.
        </p>
      </header>

      <SettingsTabsNav />

      {children}
    </main>
  );
}

