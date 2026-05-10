"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PhiMapBundle } from "@/lib/phi-map-server";
import { PhiFlowDataClassification } from "@/generated/prisma";
import { PHI_MAP_SYSTEM_TYPES } from "@/lib/phi-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { PhiFlowDiagram } from "@/components/hipaa/PhiFlowDiagram";
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
import { cn } from "@/lib/utils";

type DeleteConfirmState =
  | { kind: "closed" }
  | { kind: "system"; systemId: string }
  | { kind: "flow"; edgeId: string };

type NoticeState = { title: string; message: string } | null;

const LEGEND = [
  { key: "core_phi", label: "Core PHI system", swatch: "bg-[#B9F5D8]" },
  { key: "storage", label: "Storage", swatch: "bg-[#D0E1FD]" },
  { key: "external_gap", label: "External · PHI gap", swatch: "bg-[#FDBDBB]" },
  { key: "deidentified", label: "De-identified", swatch: "bg-[#E9D5FF]" },
] as const;

const PATIENT_NODE_ID = "node-patient";

type Props = {
  initialBundle: PhiMapBundle;
  canMutate: boolean;
};

type InspectPanelContent =
  | {
      variant: "prose";
      title: string;
      body: string;
    }
  | {
      variant: "system";
      title: string;
      rows: { label: string; value: string }[];
      description?: string;
    };

function humanizeSystemType(raw: string): string {
  const t = raw.trim();
  if (!t) return "—";
  return t
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseNodeSelection(
  bundle: PhiMapBundle,
  nodeId: string | null
): InspectPanelContent | null {
  if (!nodeId) return null;
  if (nodeId === PATIENT_NODE_ID) {
    return {
      variant: "prose",
      title: "Patient",
      body:
        "Entry point for PHI originating from individuals receiving care. Flows from this node represent data the organization receives or creates on behalf of patients.",
    };
  }
  if (nodeId.startsWith("sys-")) {
    const id = nodeId.slice(4);
    const s = bundle.systems.find((x) => x.id === id);
    if (!s) return null;
    const phiListed = s.phiTypes.length > 0;
    const phiValue = phiListed
      ? s.phiTypes.join(", ")
      : s.containsPhi
        ? "None listed"
        : "None listed (not marked as containing PHI)";
    const life = [
      s.phiCreates && "Creates",
      s.phiTransmits && "Transmits",
      s.phiStores && "Stores",
      s.phiDestroys && "Destroys",
    ].filter(Boolean);
    const lifeValue =
      life.length > 0 ? life.join(" · ") : "None selected";
    const desc = s.description?.trim();

    const rows: { label: string; value: string }[] = [
      { label: "System type", value: humanizeSystemType(s.systemType) },
      { label: "PHI fields", value: phiValue },
      {
        label: "Encryption at rest",
        value: s.encryptionAtRest ? "Yes" : "No",
      },
      {
        label: "Encryption in transit",
        value: s.encryptionInTransit ? "Yes" : "No",
      },
      { label: "PHI lifecycle", value: lifeValue },
    ];
    if (s.baaRecord) {
      rows.push({
        label: "Linked BAA",
        value: `${s.baaRecord.vendorName} (${s.baaRecord.status})`,
      });
    }
    return {
      variant: "system",
      title: s.name,
      rows,
      ...(desc ? { description: desc } : {}),
    };
  }
  if (nodeId.startsWith("int-")) {
    const id = nodeId.slice(4);
    const i = bundle.integrations.find((x) => x.id === id);
    if (!i) return null;
    return {
      variant: "prose",
      title: i.displayName,
      body: `Connected integration (${i.type}). Status: ${i.status}. PHI flows through this integration when shown on the map.`,
    };
  }
  return null;
}

function parseSelectedSystemId(nodeId: string | null): string | null {
  if (!nodeId?.startsWith("sys-")) return null;
  return nodeId.slice(4);
}

function parseSelectedIntegrationId(nodeId: string | null): string | null {
  if (!nodeId?.startsWith("int-")) return null;
  return nodeId.slice(4);
}

function edgeTargetLabel(
  e: PhiMapBundle["edges"][number]
): string {
  return (
    e.targetPhiSystem?.name ??
    e.targetIntegration?.displayName ??
    "Unknown"
  );
}

function edgeSourceName(
  e: PhiMapBundle["edges"][number],
  bundle: PhiMapBundle
): string {
  const src = bundle.systems.find((s) => s.id === e.sourcePhiSystemId);
  return src?.name ?? e.sourcePhiSystem?.name ?? "Unknown";
}

export function PhiMapClient({
  initialBundle,
  canMutate,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setBundle(initialBundle);
  }, [initialBundle]);
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [systemBusy, setSystemBusy] = useState(false);
  const [flowBusy, setFlowBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    kind: "closed",
  });
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/hipaa/phi-map");
    if (!res.ok) return;
    const data = (await res.json()) as PhiMapBundle;
    setBundle(data);
    router.refresh();
  }, [router]);

  const inspect = useMemo(
    () => parseNodeSelection(bundle, selectedNodeId),
    [bundle, selectedNodeId]
  );

  const selectedSystemId = parseSelectedSystemId(selectedNodeId);
  const selectedIntegrationId = parseSelectedIntegrationId(selectedNodeId);

  const flowsFromSystem = useMemo(() => {
    if (!selectedSystemId) return [];
    return bundle.edges.filter((e) => e.sourcePhiSystemId === selectedSystemId);
  }, [bundle.edges, selectedSystemId]);

  const flowsToSystem = useMemo(() => {
    if (!selectedSystemId) return [];
    return bundle.edges.filter((e) => e.targetPhiSystemId === selectedSystemId);
  }, [bundle.edges, selectedSystemId]);

  const flowsViaIntegration = useMemo(() => {
    if (!selectedIntegrationId) return [];
    return bundle.edges.filter(
      (e) =>
        e.targetIntegrationId === selectedIntegrationId ||
        e.viaIntegrationId === selectedIntegrationId
    );
  }, [bundle.edges, selectedIntegrationId]);

  const runConfirmedDelete = useCallback(async () => {
    if (deleteConfirm.kind === "closed" || !canMutate) return;
    setDeletePending(true);
    try {
      if (deleteConfirm.kind === "system") {
        const res = await fetch(
          `/api/hipaa/phi-map/systems/${deleteConfirm.systemId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setNotice({
            title: "Could not delete system",
            message: j.error ?? "Delete failed",
          });
          return;
        }
        setSelectedNodeId(null);
      } else {
        const res = await fetch(
          `/api/hipaa/phi-map/edges/${deleteConfirm.edgeId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setNotice({
            title: "Could not delete flow",
            message: j.error ?? "Delete failed",
          });
          return;
        }
      }
      setDeleteConfirm({ kind: "closed" });
      await refetch();
    } finally {
      setDeletePending(false);
    }
  }, [deleteConfirm, canMutate, refetch]);

  const deleteConfirmOpen = deleteConfirm.kind !== "closed";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">PHI flow map</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Where protected health information is created, transmitted, stored,
            and destroyed across your systems. Auto-mapped from your
            integrations.
          </p>
        </div>
        {canMutate ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingFlowId(null);
                setFlowDialogOpen(true);
              }}
            >
              Add flow
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingSystemId(null);
                setSystemDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              Add system
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-3">
        {LEGEND.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            <span
              className={cn("size-3 shrink-0 rounded-sm", item.swatch)}
              aria-hidden
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 space-y-2">
          <PhiFlowDiagram
            bundle={bundle}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>
        <aside className="w-full shrink-0 space-y-3 rounded-xl border border-border bg-card p-4 lg:w-[min(100%,380px)]">
          {inspect ? (
            <>
              <h2 className="text-lg font-semibold leading-tight">{inspect.title}</h2>
              {inspect.variant === "system" ? (
                <div className="space-y-3 text-sm">
                  <dl className="space-y-3">
                    {inspect.rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="mt-1 leading-snug text-foreground">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {inspect.description ? (
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Notes
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {inspect.description}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {inspect.body}
                </p>
              )}
              {canMutate && selectedSystemId ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSystemId(selectedSystemId);
                      setSystemDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 size-3.5" aria-hidden />
                    Edit system
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (selectedSystemId) {
                        setDeleteConfirm({
                          kind: "system",
                          systemId: selectedSystemId,
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-1.5 size-3.5" aria-hidden />
                    Delete system
                  </Button>
                </div>
              ) : null}
              {canMutate && selectedSystemId ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Data flows
                  </h3>
                  {flowsFromSystem.length === 0 && flowsToSystem.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No flows yet. Use Add flow or edit an existing flow below.
                    </p>
                  ) : null}
                  {flowsFromSystem.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      <li className="font-medium text-muted-foreground">Outgoing</li>
                      {flowsFromSystem.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                        >
                          <span className="min-w-0 break-words">
                            → {edgeTargetLabel(e)}
                            {e.isExternalVendorFlow ? " · external" : ""}
                            {e.dataClassification ===
                            PhiFlowDataClassification.DE_IDENTIFIED
                              ? " · de-ID"
                              : ""}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Edit flow"
                              onClick={() => {
                                setEditingFlowId(e.id);
                                setFlowDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:text-destructive"
                              title="Delete flow"
                              onClick={() =>
                                setDeleteConfirm({ kind: "flow", edgeId: e.id })
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {flowsToSystem.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      <li className="font-medium text-muted-foreground">Incoming</li>
                      {flowsToSystem.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                        >
                          <span className="min-w-0 break-words">
                            ← {edgeSourceName(e, bundle)}
                            {e.isExternalVendorFlow ? " · external" : ""}
                            {e.dataClassification ===
                            PhiFlowDataClassification.DE_IDENTIFIED
                              ? " · de-ID"
                              : ""}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Edit flow"
                              onClick={() => {
                                setEditingFlowId(e.id);
                                setFlowDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:text-destructive"
                              title="Delete flow"
                              onClick={() =>
                                setDeleteConfirm({ kind: "flow", edgeId: e.id })
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {canMutate && selectedIntegrationId && flowsViaIntegration.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Related flows
                  </h3>
                  <ul className="space-y-1.5 text-xs">
                    {flowsViaIntegration.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                      >
                        <span className="min-w-0 break-words">
                          {e.sourcePhiSystem?.name ?? "System"} →{" "}
                          {edgeTargetLabel(e)}
                          {e.viaIntegrationId === selectedIntegrationId
                            ? " (via)"
                            : ""}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title="Edit flow"
                            onClick={() => {
                              setEditingFlowId(e.id);
                              setFlowDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            title="Delete flow"
                            onClick={() =>
                              setDeleteConfirm({ kind: "flow", edgeId: e.id })
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click a node to inspect. Connections and encryption state update
              automatically as integrations sync.
            </p>
          )}
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Connections and encryption state update automatically as integrations
            sync.
          </p>
        </aside>
      </div>

      {bundle.phiGapCount > 0 ? (
        <div
          className="flex gap-3 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
          <div>
            <p className="font-medium">
              {bundle.phiGapCount} external PHI flow
              {bundle.phiGapCount === 1 ? "" : "s"} without a BAA
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-red-100/90">
              {bundle.phiGapSummaries.map((g) => (
                <li key={g.edgeId}>
                  <span className="font-medium">{g.targetLabel}</span>
                  {": "}
                  {g.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <SystemFormDialog
        open={systemDialogOpen}
        onOpenChange={(v) => {
          setSystemDialogOpen(v);
          if (!v) setEditingSystemId(null);
        }}
        bundle={bundle}
        editingSystemId={editingSystemId}
        busy={systemBusy}
        setBusy={setSystemBusy}
        onSaved={refetch}
      />
      <FlowFormDialog
        open={flowDialogOpen}
        onOpenChange={(v) => {
          setFlowDialogOpen(v);
          if (!v) setEditingFlowId(null);
        }}
        bundle={bundle}
        editingFlowId={editingFlowId}
        busy={flowBusy}
        setBusy={setFlowBusy}
        onSaved={refetch}
      />

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm({ kind: "closed" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm.kind === "system"
                ? "Delete PHI system?"
                : deleteConfirm.kind === "flow"
                  ? "Delete data flow?"
                  : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.kind === "system"
                ? "All data flows from or to this system will be removed. This cannot be undone."
                : deleteConfirm.kind === "flow"
                  ? "This flow will be removed from the map. This cannot be undone."
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={() => void runConfirmedDelete()}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={notice !== null}
        onOpenChange={(open) => {
          if (!open) setNotice(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{notice?.title ?? ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {notice?.message ?? ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button type="button">OK</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SystemFormDialog({
  open,
  onOpenChange,
  bundle,
  editingSystemId,
  busy,
  setBusy,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bundle: PhiMapBundle;
  editingSystemId: string | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onSaved: () => Promise<void>;
}): React.JSX.Element {
  const isEdit = Boolean(editingSystemId);
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState<string>("emr");
  const [description, setDescription] = useState("");
  const [phiTypesStr, setPhiTypesStr] = useState("");
  const [containsPhi, setContainsPhi] = useState(true);
  const [encryptionAtRest, setEncryptionAtRest] = useState(false);
  const [encryptionInTransit, setEncryptionInTransit] = useState(false);
  const [phiCreates, setPhiCreates] = useState(false);
  const [phiTransmits, setPhiTransmits] = useState(false);
  const [phiStores, setPhiStores] = useState(false);
  const [phiDestroys, setPhiDestroys] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (editingSystemId) {
      const s = bundle.systems.find((x) => x.id === editingSystemId);
      if (s) {
        setName(s.name);
        setSystemType(
          (PHI_MAP_SYSTEM_TYPES as readonly string[]).includes(s.systemType)
            ? s.systemType
            : "other"
        );
        setDescription(s.description ?? "");
        setPhiTypesStr(s.phiTypes.join(", "));
        setContainsPhi(s.containsPhi || s.phiTypes.length > 0);
        setEncryptionAtRest(s.encryptionAtRest);
        setEncryptionInTransit(s.encryptionInTransit);
        setPhiCreates(s.phiCreates);
        setPhiTransmits(s.phiTransmits);
        setPhiStores(s.phiStores);
        setPhiDestroys(s.phiDestroys);
        return;
      }
    }
    setName("");
    setSystemType("emr");
    setDescription("");
    setPhiTypesStr("");
    setContainsPhi(true);
    setEncryptionAtRest(false);
    setEncryptionInTransit(false);
    setPhiCreates(false);
    setPhiTransmits(false);
    setPhiStores(false);
    setPhiDestroys(false);
  }, [open, editingSystemId, bundle.systems]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Name is required");
      return;
    }
    const phiTypes = phiTypesStr
      ? phiTypesStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const containsPhiEffective = containsPhi || phiTypes.length > 0;
    const payload = {
      name: trimmed,
      systemType: systemType as (typeof PHI_MAP_SYSTEM_TYPES)[number],
      description: description.trim() || undefined,
      phiTypes,
      containsPhi: containsPhiEffective,
      encryptionAtRest,
      encryptionInTransit,
      phiCreates,
      phiTransmits,
      phiStores,
      phiDestroys,
    };
    setBusy(true);
    try {
      const url = isEdit
        ? `/api/hipaa/phi-map/systems/${editingSystemId}`
        : "/api/hipaa/phi-map/systems";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      onOpenChange(false);
      await onSaved();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit system" : "Add system"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(ev) => void handleSubmit(ev)}>
          <div className="space-y-2">
            <Label htmlFor="phi-name">Name</Label>
            <Input
              id="phi-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
              placeholder="Epic EHR"
            />
          </div>
          <div className="space-y-2">
            <Label>System type</Label>
            <Select value={systemType} onValueChange={setSystemType} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {PHI_MAP_SYSTEM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phi-desc">Description (optional)</Label>
            <Input
              id="phi-desc"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Short scope"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phi-types">PHI fields (comma-separated)</Label>
            <Input
              id="phi-types"
              value={phiTypesStr}
              onChange={(ev) => setPhiTypesStr(ev.target.value)}
              placeholder="demographics, diagnoses, medications"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={containsPhi}
                onChange={(ev) => setContainsPhi(ev.target.checked)}
              />
              Contains PHI
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={encryptionAtRest}
                onChange={(ev) => setEncryptionAtRest(ev.target.checked)}
              />
              Encrypt at rest
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={encryptionInTransit}
                onChange={(ev) => setEncryptionInTransit(ev.target.checked)}
              />
              Encrypt in transit
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phiCreates}
                onChange={(ev) => setPhiCreates(ev.target.checked)}
              />
              Creates PHI
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phiTransmits}
                onChange={(ev) => setPhiTransmits(ev.target.checked)}
              />
              Transmits PHI
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phiStores}
                onChange={(ev) => setPhiStores(ev.target.checked)}
              />
              Stores PHI
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phiDestroys}
                onChange={(ev) => setPhiDestroys(ev.target.checked)}
              />
              Destroys PHI
            </label>
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NONE = "__none__";

function FlowFormDialog({
  open,
  onOpenChange,
  bundle,
  editingFlowId,
  busy,
  setBusy,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bundle: PhiMapBundle;
  editingFlowId: string | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onSaved: () => Promise<void>;
}): React.JSX.Element {
  const isEdit = Boolean(editingFlowId);
  const [targetKind, setTargetKind] = useState<"system" | "integration">("system");
  const [sourceId, setSourceId] = useState("");
  const [targetSysId, setTargetSysId] = useState("");
  const [targetIntId, setTargetIntId] = useState("");
  const [viaId, setViaId] = useState(NONE);
  const [baaId, setBaaId] = useState(NONE);
  const [classification, setClassification] = useState<string>(
    PhiFlowDataClassification.PHI
  );
  const [externalFlow, setExternalFlow] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (editingFlowId) {
      const edge = bundle.edges.find((x) => x.id === editingFlowId);
      if (edge) {
        setSourceId(edge.sourcePhiSystemId);
        if (edge.targetPhiSystemId) {
          setTargetKind("system");
          setTargetSysId(edge.targetPhiSystemId);
          setTargetIntId(bundle.integrations[0]?.id ?? "");
        } else if (edge.targetIntegrationId) {
          setTargetKind("integration");
          setTargetIntId(edge.targetIntegrationId);
          setTargetSysId(bundle.systems[0]?.id ?? "");
        }
        setViaId(edge.viaIntegrationId ?? NONE);
        setBaaId(edge.baaRecordId ?? NONE);
        setClassification(edge.dataClassification);
        setExternalFlow(edge.isExternalVendorFlow);
        return;
      }
    }
    if (bundle.integrations.length === 0) {
      setTargetKind("system");
    }
    const firstSys = bundle.systems[0]?.id ?? "";
    const secondSys = bundle.systems[1]?.id ?? firstSys;
    setSourceId(firstSys);
    setTargetSysId(secondSys);
    setTargetIntId(bundle.integrations[0]?.id ?? "");
    setViaId(NONE);
    setBaaId(NONE);
    setClassification(PhiFlowDataClassification.PHI);
    setExternalFlow(false);
  }, [open, editingFlowId, bundle]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr(null);
    if (!sourceId) {
      setErr("Source system is required");
      return;
    }
    if (targetKind === "system") {
      if (!targetSysId) {
        setErr("Target system is required");
        return;
      }
    } else if (!targetIntId) {
      setErr("Target integration is required");
      return;
    }

    setBusy(true);
    try {
      if (isEdit && editingFlowId) {
        const body: Record<string, unknown> = {
          sourcePhiSystemId: sourceId,
          targetPhiSystemId:
            targetKind === "system" ? targetSysId : null,
          targetIntegrationId:
            targetKind === "integration" ? targetIntId : null,
          viaIntegrationId: viaId === NONE ? null : viaId,
          baaRecordId: baaId === NONE ? null : baaId,
          isExternalVendorFlow: externalFlow,
          dataClassification: classification,
        };
        const res = await fetch(`/api/hipaa/phi-map/edges/${editingFlowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? res.statusText);
        }
      } else {
        const body: Record<string, unknown> = {
          sourcePhiSystemId: sourceId,
          isExternalVendorFlow: externalFlow,
          dataClassification: classification,
        };
        if (targetKind === "system") {
          body.targetPhiSystemId = targetSysId;
        } else {
          body.targetIntegrationId = targetIntId;
        }
        if (viaId !== NONE) body.viaIntegrationId = viaId;
        if (baaId !== NONE) body.baaRecordId = baaId;
        const res = await fetch("/api/hipaa/phi-map/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? res.statusText);
        }
      }
      onOpenChange(false);
      await onSaved();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit flow" : "Add flow"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(ev) => void handleSubmit(ev)}>
          <div className="space-y-2">
            <Label>From (PHI system)</Label>
            <Select
              value={sourceId || undefined}
              onValueChange={setSourceId}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {bundle.systems.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={targetKind === "system" ? "default" : "outline"}
                onClick={() => setTargetKind("system")}
              >
                System
              </Button>
              <Button
                type="button"
                size="sm"
                variant={targetKind === "integration" ? "default" : "outline"}
                onClick={() => setTargetKind("integration")}
              >
                Integration
              </Button>
            </div>
          </div>

          {targetKind === "system" ? (
            <div className="space-y-2">
              <Label>To (PHI system)</Label>
              <Select
                value={targetSysId || undefined}
                onValueChange={setTargetSysId}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Target system" />
                </SelectTrigger>
                <SelectContent>
                  {bundle.systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>To (integration)</Label>
              <Select
                value={targetIntId || undefined}
                onValueChange={setTargetIntId}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Target integration" />
                </SelectTrigger>
                <SelectContent>
                  {bundle.integrations.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.displayName} ({i.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Via integration (optional)</Label>
            <Select value={viaId} onValueChange={setViaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {bundle.integrations.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>BAA (optional)</Label>
            <Select value={baaId} onValueChange={setBaaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {bundle.baaRecords.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.vendorName} ({b.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data on this flow</Label>
            <Select value={classification} onValueChange={setClassification}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PhiFlowDataClassification.PHI}>PHI</SelectItem>
                <SelectItem value={PhiFlowDataClassification.DE_IDENTIFIED}>
                  De-identified
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={externalFlow}
              onChange={(ev) => setExternalFlow(ev.target.checked)}
            />
            External vendor flow (disclosure outside org)
          </label>

          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                bundle.systems.length === 0 ||
                (targetKind === "integration" && bundle.integrations.length === 0)
              }
            >
              {busy ? "Saving…" : isEdit ? "Save changes" : "Save flow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
