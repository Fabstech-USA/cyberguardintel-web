import { AuditPackageWizard } from "@/components/shared/AuditPackageExport";

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight">
          Audit package export
        </h1>
        <p className="max-w-[560px] text-[13px] leading-relaxed text-muted-foreground">
          One-click generation of a complete HIPAA audit package: evidence,
          policies, risk assessment, BAA inventory, training records, PHI flow
          map, and audit logs — ZIP-formatted for HHS or business partner review.
        </p>
      </div>
      <AuditPackageWizard />
    </div>
  );
}
