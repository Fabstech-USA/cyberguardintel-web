"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { PhiMapBundle } from "@/lib/phi-map-server";
import { layoutWithDagre } from "@/lib/phi-map-dagre";
import { PhiFlowDataClassification } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const PATIENT_NODE_ID = "node-patient";

const BUCKET_CLASS: Record<string, string> = {
  patient:
    "border-stone-300 bg-stone-100 text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-800/90 dark:text-stone-100",
  core_phi:
    "border-emerald-400/70 bg-emerald-50 text-emerald-950 shadow-sm dark:border-[#B9F5D8]/90 dark:bg-[#0f1a14] dark:text-[#B9F5D8] dark:shadow-[0_0_0_1px_rgba(185,245,216,0.25)]",
  storage:
    "border-sky-400/60 bg-sky-50 text-sky-950 shadow-sm dark:border-[#D0E1FD]/90 dark:bg-[#0f141f] dark:text-[#D0E1FD] dark:shadow-[0_0_0_1px_rgba(208,225,253,0.2)]",
  external_gap:
    "border-2 border-red-400 bg-red-50 text-red-950 shadow-sm dark:border-[#FDBDBB] dark:bg-[#1f0f0f] dark:text-[#FDBDBB] dark:shadow-[0_0_0_1px_rgba(253,189,187,0.35)]",
  deidentified:
    "border-violet-400/60 bg-violet-50 text-violet-950 shadow-sm dark:border-[#E9D5FF]/90 dark:bg-[#140f1a] dark:text-[#E9D5FF] dark:shadow-[0_0_0_1px_rgba(233,213,255,0.2)]",
  integration:
    "border-sky-400/50 border-dashed bg-sky-50/80 text-sky-950 dark:border-[#D0E1FD]/70 dark:bg-[#121218] dark:text-[#D0E1FD]",
};

export type PhiMapNodeData = {
  title: string;
  subtitle: string;
  bucket: string;
  kind: "patient" | "system" | "integration";
};

function PhiMapNodeView({ data, selected }: NodeProps<Node<PhiMapNodeData>>) {
  const bucket = data.bucket in BUCKET_CLASS ? data.bucket : "integration";
  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[240px] rounded-xl border px-3 py-2 text-left transition-shadow",
        BUCKET_CLASS[bucket],
        selected && "ring-2 ring-brand/60 ring-offset-2 ring-offset-background"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-none !bg-muted-foreground/50"
      />
      <div className="text-sm font-semibold leading-tight">{data.title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-none !bg-muted-foreground/50"
      />
    </div>
  );
}

const PhiMapNode = memo(PhiMapNodeView);

const nodeTypes = { phiMapNode: PhiMapNode };

function sysNodeId(id: string): string {
  return `sys-${id}`;
}

function intNodeId(id: string): string {
  return `int-${id}`;
}

function systemSubtitle(
  systemType: string,
  legendBucket: string
): string {
  const t = systemType.toLowerCase();
  if (legendBucket === "core_phi") return `${t.toUpperCase()} · Core PHI system`;
  if (legendBucket === "storage") return `${t.toUpperCase()} · Storage`;
  if (legendBucket === "external_gap") return `${t.toUpperCase()} · External · PHI`;
  if (legendBucket === "deidentified") return `${t.toUpperCase()} · De-identified`;
  return systemType;
}

function collectIntegrationIds(bundle: PhiMapBundle): Set<string> {
  const ids = new Set<string>();
  for (const e of bundle.edges) {
    if (e.targetIntegrationId) ids.add(e.targetIntegrationId);
    if (e.viaIntegrationId) ids.add(e.viaIntegrationId);
  }
  return ids;
}

function buildGraph(
  bundle: PhiMapBundle,
  edgeNeutralStroke: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const integrationIds = collectIntegrationIds(bundle);
  const intById = new Map(bundle.integrations.map((i) => [i.id, i]));

  const patientTargets = bundle.systems.filter(
    (s) => s.legendBucket === "core_phi"
  );
  const patientEdgesTo =
    patientTargets.length > 0
      ? patientTargets
      : bundle.systems.slice(0, 1);

  if (bundle.systems.length > 0) {
    nodes.push({
      id: PATIENT_NODE_ID,
      type: "phiMapNode",
      position: { x: 0, y: 0 },
      data: {
        title: "Patient",
        subtitle: "Source",
        bucket: "patient",
        kind: "patient",
      } satisfies PhiMapNodeData,
    });
    for (const s of patientEdgesTo) {
      edges.push({
        id: `patient-${s.id}`,
        source: PATIENT_NODE_ID,
        target: sysNodeId(s.id),
        style: { stroke: edgeNeutralStroke, strokeWidth: 1.5 },
      });
    }
  }

  for (const s of bundle.systems) {
    nodes.push({
      id: sysNodeId(s.id),
      type: "phiMapNode",
      position: { x: 0, y: 0 },
      data: {
        title: s.name,
        subtitle:
          s.description?.trim() ||
          systemSubtitle(s.systemType, s.legendBucket),
        bucket: s.legendBucket,
        kind: "system",
      } satisfies PhiMapNodeData,
    });
  }

  for (const iid of integrationIds) {
    const integ = intById.get(iid);
    if (!integ) continue;
    nodes.push({
      id: intNodeId(iid),
      type: "phiMapNode",
      position: { x: 0, y: 0 },
      data: {
        title: integ.displayName,
        subtitle: `Integration · ${integ.type}`,
        bucket: "integration",
        kind: "integration",
      } satisfies PhiMapNodeData,
    });
  }

  for (const e of bundle.edges) {
    const sourceId = sysNodeId(e.sourcePhiSystemId);
    const targetId = e.targetPhiSystemId
      ? sysNodeId(e.targetPhiSystemId)
      : e.targetIntegrationId
        ? intNodeId(e.targetIntegrationId)
        : "";

    if (!targetId) continue;

    const isDeId =
      e.dataClassification === PhiFlowDataClassification.DE_IDENTIFIED;
    const isGap = e.isPhiGap;

    if (e.viaIntegrationId) {
      const viaId = intNodeId(e.viaIntegrationId);
      const styleMid = {
        stroke: edgeNeutralStroke,
        strokeWidth: 1.5,
      } as const;
      edges.push({
        id: `e1-${e.id}`,
        source: sourceId,
        target: viaId,
        style: styleMid,
      });
      edges.push({
        id: `e2-${e.id}`,
        source: viaId,
        target: targetId,
        style: isDeId
          ? { stroke: "#a855f7", strokeWidth: 2, strokeDasharray: "6 4" }
          : isGap
            ? { stroke: "#f87171", strokeWidth: 2, strokeDasharray: "6 4" }
            : styleMid,
      });
    } else {
      edges.push({
        id: `e-${e.id}`,
        source: sourceId,
        target: targetId,
        style: isDeId
          ? { stroke: "#a855f7", strokeWidth: 2, strokeDasharray: "6 4" }
          : isGap
            ? { stroke: "#f87171", strokeWidth: 2, strokeDasharray: "6 4" }
            : { stroke: edgeNeutralStroke, strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

export type PhiFlowDiagramProps = {
  bundle: PhiMapBundle;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  className?: string;
};

export function PhiFlowDiagram({
  bundle,
  selectedNodeId,
  onSelectNode,
  className,
}: PhiFlowDiagramProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const flowColorMode = resolvedTheme === "dark" ? "dark" : "light";
  const edgeNeutralStroke =
    resolvedTheme === "dark" ? "oklch(0.65 0.02 260)" : "oklch(0.55 0.02 260)";
  const gridDotColor =
    resolvedTheme === "dark" ? "oklch(0.35 0 0)" : "oklch(0.75 0 0)";
  const miniMapMask =
    resolvedTheme === "dark" ? "rgb(0,0,0,0.45)" : "rgb(255,255,255,0.55)";

  const built = useMemo(
    () => buildGraph(bundle, edgeNeutralStroke),
    [bundle, edgeNeutralStroke]
  );
  const layouted = useMemo(
    () => layoutWithDagre(built.nodes, built.edges, "LR"),
    [built.nodes, built.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  useEffect(() => {
    const next = layoutWithDagre(built.nodes, built.edges, "LR");
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [built.nodes, built.edges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div
      className={cn(
        "h-[min(560px,calc(100vh-14rem))] min-h-[360px] w-full rounded-xl border border-border bg-muted",
        className
      )}
    >
      <ReactFlow
        colorMode={flowColorMode}
        nodes={nodes.map((n) => ({
          ...n,
          selected: n.id === selectedNodeId,
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.4}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
        className="bg-muted"
      >
        <Background gap={20} size={1} color={gridDotColor} />
        <Controls className="overflow-hidden rounded-md border border-border bg-card shadow-md" />
        <MiniMap
          className="overflow-hidden rounded-md border border-border bg-card shadow-md"
          nodeStrokeWidth={2}
          maskColor={miniMapMask}
        />
      </ReactFlow>
    </div>
  );
}
