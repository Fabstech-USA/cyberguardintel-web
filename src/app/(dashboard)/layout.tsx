import type { ReactNode } from "react";
import { UserMenu } from "./user-menu";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-background px-4">
        <UserMenu />
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

