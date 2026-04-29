import { Card } from "@/components/ui/card";

export default function Page(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Security posture controls are planned for Sprint 5.
        </p>
      </Card>
    </div>
  );
}

