"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { BaaStatus } from "@/generated/prisma";
import {
  getBaaBadgeClassName,
  getBaaBadgeVariant,
  getBaaStatusLabel,
  type BaaBadgeVariant,
} from "@/lib/baa";
import type { BaaTrackerBundle } from "@/lib/baa-server";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BaaRow = BaaTrackerBundle["records"][number];
type Summary = BaaTrackerBundle["summary"];
type StatusFilter = "all" | "SIGNED" | "PENDING" | "EXPIRED" | "NOT_REQUIRED";

type TemplateResponse = {
  document_title: string;
  full_markdown: string;
  summary: string;
};

type FormState = {
  vendorName: string;
  vendorEmail: string;
  services: string;
  status: BaaStatus;
  signedAt: string;
  expiresAt: string;
  notes: string;
};

type TemplateDraft = {
  vendorName: string;
  vendorEmail: string;
  services: string;
  notes: string;
  documentTitle: string;
  templateBody: string;
  summary: string;
};

type ToastState = {
  id: number;
  kind: "success" | "error";
  title: string;
  message: string;
} | null;

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  SIGNED: "Signed",
  PENDING: "Pending",
  EXPIRED: "Expired",
  NOT_REQUIRED: "Not required",
};

const EMPTY_FORM: FormState = {
  vendorName: "",
  vendorEmail: "",
  services: "",
  status: BaaStatus.PENDING,
  signedAt: "",
  expiresAt: "",
  notes: "",
};

const EMPTY_TEMPLATE: TemplateDraft = {
  vendorName: "",
  vendorEmail: "",
  services: "",
  notes: "",
  documentTitle: "",
  templateBody: "",
  summary: "",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = parseISO(iso);
  if (!isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

function formatDateCell(iso: string | null): string {
  if (!iso) return "—";
  const date = parseISO(iso);
  if (!isValid(date)) return "—";
  return format(date, "MMM dd, yyyy");
}

function formatExpiryCell(row: BaaRow): string {
  if (!row.expiresAt) return "—";
  const date = parseISO(row.expiresAt);
  if (!isValid(date)) return "—";
  const base = format(date, "MMM dd, yyyy");
  if (row.expiryState === "expired") return base;
  if (row.expiryState === "warning" && row.daysUntilExpiry !== null) {
    return `${base} (${row.daysUntilExpiry}d)`;
  }
  return base;
}

function summaryCards(summary: Summary) {
  return [
    {
      label: "Total vendors",
      value: summary.totalVendors,
      cardClass:
        "border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-950/30",
      valueClass: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Signed",
      value: summary.signed,
      cardClass:
        "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/30",
      valueClass: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Pending",
      value: summary.pending,
      cardClass:
        "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/30",
      valueClass: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Expired",
      value: summary.expired,
      cardClass:
        "border-red-200/80 bg-red-50/80 dark:border-red-900/70 dark:bg-red-950/30",
      valueClass: "text-red-700 dark:text-red-300",
    },
    {
      label: "Not required",
      value: summary.notRequired,
      cardClass:
        "border-sky-200/80 bg-sky-50/80 dark:border-sky-900/70 dark:bg-sky-950/30",
      valueClass: "text-sky-700 dark:text-sky-300",
    },
  ];
}

function rowHighlightClass(row: BaaRow): string {
  if (row.expiryState === "expired") {
    return "border-l-4 border-l-destructive bg-destructive/5";
  }
  if (row.expiryState === "warning") {
    return "border-l-4 border-l-amber-400 bg-amber-50/70 dark:bg-amber-950/20";
  }
  return "";
}

function buildFormState(row: BaaRow | null): FormState {
  if (!row) return EMPTY_FORM;
  return {
    vendorName: row.vendorName,
    vendorEmail: row.vendorEmail ?? "",
    services: row.services,
    status: row.effectiveStatus,
    signedAt: toDateInputValue(row.signedAt),
    expiresAt: toDateInputValue(row.expiresAt),
    notes: row.notes ?? "",
  };
}

function buildTemplateDraftFromForm(form: FormState): TemplateDraft {
  return {
    vendorName: form.vendorName,
    vendorEmail: form.vendorEmail,
    services: form.services,
    notes: form.notes,
    documentTitle: "",
    templateBody: "",
    summary: "",
  };
}

export function BaaTable({
  initialBundle,
  organizationName,
  hipaaEntityType,
  canMutate,
}: {
  initialBundle: BaaTrackerBundle;
  organizationName: string;
  hipaaEntityType: string;
  canMutate: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [bundle, setBundle] = useState(initialBundle);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BaaRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<BaaRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(EMPTY_TEMPLATE);

  useEffect(() => {
    if (!toast) return;
    const timeoutMs = toast.kind === "error" ? 6000 : 3500;
    const timeout = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bundle.records.filter((row) => {
      if (filter !== "all" && row.effectiveStatus !== filter) return false;
      if (!needle) return true;
      return (
        row.vendorName.toLowerCase().includes(needle) ||
        row.services.toLowerCase().includes(needle) ||
        (row.vendorEmail ?? "").toLowerCase().includes(needle)
      );
    });
  }, [bundle.records, filter, search]);

  async function refetch(): Promise<void> {
    const res = await fetch("/api/hipaa/baa");
    const data = (await res.json().catch(() => null)) as BaaTrackerBundle | null;
    if (!res.ok || !data) {
      throw new Error("Could not refresh BAA tracker.");
    }
    setBundle(data);
    router.refresh();
  }

  function showToast(
    kind: "success" | "error",
    title: string,
    message: string
  ): void {
    setToast({
      id: Date.now(),
      kind,
      title,
      message,
    });
  }

  function openCreateDialog(): void {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: BaaRow): void {
    setEditingRow(row);
    setForm(buildFormState(row));
    setSelectedFile(null);
    setDialogOpen(true);
  }

  function openTemplateModal(prefill?: TemplateDraft): void {
    setTemplateError(null);
    setTemplateDraft(prefill ?? EMPTY_TEMPLATE);
    setTemplateOpen(true);
  }

  function closeDialog(): void {
    if (busy) return;
    setDialogOpen(false);
    setEditingRow(null);
    setSelectedFile(null);
    setForm(EMPTY_FORM);
  }

  async function uploadPdfIfNeeded(): Promise<string | null | undefined> {
    if (!selectedFile) return editingRow?.documentS3Key ?? undefined;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", selectedFile.name);

    const uploadRes = await fetch("/api/hipaa/baa/upload", {
      method: "POST",
      body: formData,
    });

    const uploadData = (await uploadRes.json().catch(() => ({}))) as {
      error?: string;
      key?: string;
    };

    if (!uploadRes.ok || !uploadData.key) {
      throw new Error(uploadData.error ?? "Could not prepare PDF upload.");
    }
    return uploadData.key;
  }

  async function saveRecord(): Promise<void> {
    setBusy(true);
    try {
      const documentS3Key = await uploadPdfIfNeeded();
      const payload = {
        vendorName: form.vendorName,
        vendorEmail: form.vendorEmail,
        services: form.services,
        status: form.status,
        signedAt: form.signedAt || null,
        expiresAt: form.expiresAt || null,
        notes: form.notes,
        ...(documentS3Key !== undefined ? { documentS3Key } : {}),
      };

      const res = await fetch(
        editingRow ? `/api/hipaa/baa/${editingRow.id}` : "/api/hipaa/baa",
        {
          method: editingRow ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not save vendor.");
      }

      await refetch();
      setDialogOpen(false);
      setEditingRow(null);
      setSelectedFile(null);
      setForm(EMPTY_FORM);
      showToast(
        "success",
        "Updated",
        editingRow ? "Vendor updated." : "Vendor added."
      );
    } catch (err) {
      showToast(
        "error",
        "Action failed",
        err instanceof Error ? err.message : "Could not save vendor."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(): Promise<void> {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/hipaa/baa/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not delete vendor.");
      }
      await refetch();
      setPendingDelete(null);
      showToast("success", "Updated", "Vendor removed.");
    } catch (err) {
      showToast(
        "error",
        "Action failed",
        err instanceof Error ? err.message : "Could not delete vendor."
      );
    } finally {
      setBusy(false);
    }
  }

  async function openPdf(row: BaaRow): Promise<void> {
    try {
      const res = await fetch(`/api/hipaa/baa/${row.id}/document`);
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "Could not load PDF.");
      }
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(
        "error",
        "Action failed",
        err instanceof Error ? err.message : "Could not load PDF."
      );
    }
  }

  async function generateTemplate(): Promise<void> {
    setTemplateBusy(true);
    setTemplateError(null);
    try {
      const res = await fetch("/api/ai/generate-baa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorName: templateDraft.vendorName,
          vendorEmail: templateDraft.vendorEmail || null,
          services: templateDraft.services,
          organizationName,
          hipaaEntityType,
          notes: templateDraft.notes || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | ({ error?: string } & Partial<TemplateResponse>)
        | null;
      if (!res.ok || !body?.full_markdown) {
        throw new Error(body?.error ?? "Could not generate template.");
      }
      setTemplateDraft((prev) => ({
        ...prev,
        documentTitle: body.document_title ?? "Business Associate Agreement",
        templateBody: body.full_markdown ?? "",
        summary: body.summary ?? "",
      }));
    } catch (err) {
      setTemplateError(
        err instanceof Error ? err.message : "Could not generate template."
      );
    } finally {
      setTemplateBusy(false);
    }
  }

  async function copyTemplate(): Promise<void> {
    if (!templateDraft.templateBody) return;
    try {
      await navigator.clipboard.writeText(templateDraft.templateBody);
      showToast("success", "Updated", "Template copied to clipboard.");
    } catch {
      setTemplateError("Could not copy the generated template.");
    }
  }

  const countsByFilter: Record<StatusFilter, number> = {
    all: bundle.summary.totalVendors,
    SIGNED: bundle.summary.signed,
    PENDING: bundle.summary.pending,
    EXPIRED: bundle.summary.expired,
    NOT_REQUIRED: bundle.summary.notRequired,
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {toast ? (
        <div className="fixed top-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <Alert
            variant={toast.kind === "error" ? "destructive" : "default"}
            className={cn(
              "border shadow-lg backdrop-blur-sm",
              toast.kind === "success" &&
                "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/90 dark:text-emerald-100"
            )}
          >
            {toast.kind === "success" ? (
              <CheckCircle2 aria-hidden />
            ) : (
              <AlertTriangle aria-hidden />
            )}
            <AlertTitle>{toast.title}</AlertTitle>
            <AlertDescription>{toast.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">BAA tracker</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Keep every vendor with PHI access in one place so expiring agreements
            are visible before an audit finds them.
          </p>
        </div>
        {canMutate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => openTemplateModal()}>
              <Sparkles className="mr-1.5 size-4" aria-hidden />
              Generate BAA template
            </Button>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="mr-1.5 size-4" aria-hidden />
              Add vendor
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards(bundle.summary).map((item) => (
          <Card
            key={item.label}
            size="sm"
            className={cn("border ring-1 ring-border/60", item.cardClass)}
          >
            <CardHeader className="gap-1">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                {item.label}
              </CardDescription>
              <CardTitle
                className={cn(
                  "text-4xl font-semibold tracking-tight sm:text-5xl",
                  item.valueClass
                )}
              >
                {item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {bundle.summary.expired > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>
            {bundle.summary.expired} expired BAA{bundle.summary.expired === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>
            Expired agreements are sorted to the top so you can renew or replace
            them before an audit.
          </AlertDescription>
        </Alert>
      ) : null}

      {bundle.summary.expiringSoon > 0 ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle>
            {bundle.summary.expiringSoon} BAA
            {bundle.summary.expiringSoon === 1 ? "" : "s"} expiring within 30 days
          </AlertTitle>
          <AlertDescription>
            Reminder emails fire at 30, 14, 7, and 0 days, but this view keeps
            the same agreements visible for manual follow-up.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="ring-1 ring-border">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key)}
                >
                  {FILTER_LABELS[key]} ({countsByFilter[key]})
                </Button>
              ))}
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, services, or email"
              className="w-full max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Services</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Signed</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No vendors match the current filter.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const badgeVariant = getBaaBadgeVariant(
                      row.effectiveStatus as BaaStatus
                    ) as BaaBadgeVariant;
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t align-top transition-colors",
                          rowHighlightClass(row)
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.vendorName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.vendorEmail ?? "No email recorded"}
                          </div>
                        </td>
                        <td className="max-w-md px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-2">{row.services}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={badgeVariant}
                            className={getBaaBadgeClassName(
                              row.effectiveStatus as BaaStatus
                            )}
                          >
                            {getBaaStatusLabel(row.effectiveStatus as BaaStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateCell(row.signedAt)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3",
                            row.expiryState === "expired" && "font-medium text-destructive",
                            row.expiryState === "warning" &&
                              "font-medium text-amber-700 dark:text-amber-300"
                          )}
                        >
                          {formatExpiryCell(row)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canMutate ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                              >
                                Edit
                              </Button>
                            ) : null}
                            {row.hasDocument ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void openPdf(row)}
                              >
                                PDF
                              </Button>
                            ) : canMutate ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                              >
                                <Upload className="mr-1.5 size-3.5" aria-hidden />
                                Upload PDF
                              </Button>
                            ) : null}
                            {canMutate ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => setPendingDelete(row)}
                              >
                                <Trash2 className="mr-1.5 size-3.5" aria-hidden />
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit vendor" : "Add vendor"}</DialogTitle>
            <DialogDescription>
              Track BAA status, expiry, and the signed PDF for this vendor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor name</Label>
              <Input
                id="vendor-name"
                value={form.vendorName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendorName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-email">Vendor email</Label>
              <Input
                id="vendor-email"
                type="email"
                value={form.vendorEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendorEmail: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="services">Services</Label>
              <textarea
                id="services"
                value={form.services}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, services: event.target.value }))
                }
                rows={3}
                className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as BaaStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BaaStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={BaaStatus.SIGNED}>Signed</SelectItem>
                  <SelectItem value={BaaStatus.EXPIRED}>Expired</SelectItem>
                  <SelectItem value={BaaStatus.NOT_REQUIRED}>Not required</SelectItem>
                  <SelectItem value={BaaStatus.TERMINATED}>Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signed-at">Signed date</Label>
              <Input
                id="signed-at"
                type="date"
                value={form.signedAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, signedAt: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">Expiry date</Label>
              <Input
                id="expires-at"
                type="date"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baa-pdf">Signed BAA PDF</Label>
              <Input
                id="baa-pdf"
                ref={uploadInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                {editingRow?.hasDocument && !selectedFile
                  ? "A signed PDF is already stored. Choose a new file to replace it."
                  : "Upload a signed BAA PDF to store it in S3."}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={4}
                className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          {!editingRow && canMutate ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">Need a draft agreement?</div>
                  <div className="text-xs text-muted-foreground">
                    Generate an AI BAA template using the vendor information in
                    this form.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openTemplateModal(buildTemplateDraftFromForm(form))}
                >
                  <Sparkles className="mr-1.5 size-4" aria-hidden />
                  Generate template
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveRecord()} disabled={busy}>
              {busy ? "Saving..." : editingRow ? "Save changes" : "Create vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>AI-generated BAA template</DialogTitle>
            <DialogDescription>
              Generate a first-pass Business Associate Agreement for a new vendor,
              then review it before sending for signature.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-vendor-name">Vendor name</Label>
                <Input
                  id="template-vendor-name"
                  value={templateDraft.vendorName}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      vendorName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-vendor-email">Vendor email</Label>
                <Input
                  id="template-vendor-email"
                  value={templateDraft.vendorEmail}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      vendorEmail: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="template-services">Services</Label>
                <textarea
                  id="template-services"
                  value={templateDraft.services}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      services: event.target.value,
                    }))
                  }
                  rows={3}
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="template-notes">Context for the draft</Label>
                <textarea
                  id="template-notes"
                  value={templateDraft.notes}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="Optional context such as state law requirements, subcontractors, or expected safeguards."
                />
              </div>
            </div>

            {templateError ? (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden />
                <AlertTitle>Generation failed</AlertTitle>
                <AlertDescription>{templateError}</AlertDescription>
              </Alert>
            ) : null}

            {templateDraft.templateBody ? (
              <div className="space-y-3 rounded-xl border p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {templateDraft.documentTitle || "Business Associate Agreement"}
                  </div>
                  {templateDraft.summary ? (
                    <p className="text-sm text-muted-foreground">
                      {templateDraft.summary}
                    </p>
                  ) : null}
                </div>
                <textarea
                  readOnly
                  value={templateDraft.templateBody}
                  rows={16}
                  className="flex min-h-80 w-full rounded-lg border border-input bg-muted/20 px-3 py-2 font-mono text-xs shadow-xs outline-none"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyTemplate()}
              disabled={!templateDraft.templateBody}
            >
              Copy template
            </Button>
            <Button type="button" onClick={() => void generateTemplate()} disabled={templateBusy}>
              {templateBusy ? "Generating..." : "Generate template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!busy && !open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the BAA tracking row. Linked PHI map references will be
              cleared automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteRecord()} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

