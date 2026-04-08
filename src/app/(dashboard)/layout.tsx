import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen w-full">{children}</div>;
}

