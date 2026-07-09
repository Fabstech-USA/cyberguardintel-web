import { Suspense } from "react";

import { EvidenceBrowserClient } from "@/components/evidence/EvidenceBrowserClient";

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col p-8">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading evidence…</div>
        }
      >
        <EvidenceBrowserClient />
      </Suspense>
    </main>
  );
}
