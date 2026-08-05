import { Suspense } from "react";
import { HipaaControlsClient } from "@/components/hipaa/HipaaControlsClient";

export default function HipaaControlsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <HipaaControlsClient />
    </Suspense>
  );
}
