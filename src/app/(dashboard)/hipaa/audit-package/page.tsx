import { AuditPackageWizard } from "@/components/shared/AuditPackageExport";

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit package export
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One-click generation of a complete HIPAA audit package: evidence,
          policies, risk assessment, BAA inventory, training records, PHI flow
          map, and audit logs, ZIP-formatted for HHS or business partner review.
        </p>
      </div>
      <AuditPackageWizard />
    </div>
  );
}
