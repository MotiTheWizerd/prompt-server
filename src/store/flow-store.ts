import { create } from "zustand";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import type {
  ExecutionState,
  NodeExecutionStatus,
  NodeOutput,
} from "@/lib/engine/types";
import { executeGraph } from "@/lib/engine/runner";
import { getDownstreamNodes, getUpstreamNodes } from "@/lib/engine/graph";
import { eventBus } from "@/lib/event-bus";
import { toastSuccess, toastError } from "@/lib/toast";
import { undoManager, type Snapshot } from "@/lib/undo-manager";
import type { FlowData } from "./types";

export type NodeData = Record<string, unknown>;

// ---- Helpers ----

const initialExecution: ExecutionState = {
  isRunning: false,
  nodeStatus: {},
  nodeOutputs: {},
  globalError: null,
  providerId: "mistral",
};

function createDefaultFlow(id: string, name: string): FlowData {
  return {
    id,
    name,
    nodes: [
      {
        id: "initial-prompt-1",
        type: "initialPrompt",
        position: { x: 300, y: 200 },
        data: { label: "Initial Prompt", text: "" },
      },
    ],
    edges: [],
    hoveredGroupId: null,
    execution: { ...initialExecution },
    isDirty: false,
    lastSavedAt: null,
  };
}

function generateFlowId(): string {
  return crypto.randomUUID();
}

/** Ensure parent nodes appear before their children in the array. */
function sortNodes(nodes: Node[]): Node[] {
  const parentIds = new Set(
    nodes.filter((n) => n.type === "group").map((n) => n.id)
  );
  const parents: Node[] = [];
  const children: Node[] = [];
  const topLevel: Node[] = [];

  for (const node of nodes) {
    if (parentIds.has(node.id)) {
      parents.push(node);
    } else if (node.parentId) {
      children.push(node);
    } else {
      topLevel.push(node);
    }
  }

  return [...parents, ...topLevel, ...children];
}

// ---- Store helpers ----

/** Immutably update a specific flow in the flows map. */
function patchFlow(
  flows: Record<string, FlowData>,
  flowId: string,
  patch: Partial<FlowData>
): Record<string, FlowData> {
  const flow = flows[flowId];
  if (!flow) return flows;
  return { ...flows, [flowId]: { ...flow, ...patch } };
}

/** Extract the undoable snapshot from a flow. */
function takeSnapshot(flow: FlowData): Snapshot {
  return { nodes: flow.nodes, edges: flow.edges };
}

// ---- Initial state (empty — dashboard populates after loading) ----

// ---- Store interface ----

interface FlowStoreState {
  // Tab state
  activeFlowId: string;
  flowIds: string[];
  flows: Record<string, FlowData>;

  // Active flow graph actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setNodeParent: (nodeId: string, parentId: string) => void;
  removeNodeFromGroup: (nodeId: string) => void;
  setHoveredGroupId: (id: string | null) => void;

  // Execution actions (operate on active flow)
  setProviderId: (providerId: string) => void;
  runFromNode: (triggerNodeId: string) => Promise<void>;
  resetExecution: () => void;

  // Tab management
  createFlow: (name?: string) => string;
  closeFlow: (flowId: string) => void;
  switchFlow: (flowId: string) => void;
  renameFlow: (flowId: string, name: string) => void;

  // Persistence helpers
  getFlowData: (flowId: string) => FlowData | undefined;
  loadFlowData: (flowData: FlowData) => void;
  markClean: (flowId: string) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;

  // Lightbox
  lightboxImage: string | null;
  openLightbox: (image: string) => void;
  closeLightbox: () => void;
}

export const useFlowStore = create<FlowStoreState>((set, get) => ({
  activeFlowId: "",
  flowIds: [],
  flows: {},

  // --- Lightbox ---
  lightboxImage: null,
  openLightbox: (image) => set({ lightboxImage: image }),
  closeLightbox: () => set({ lightboxImage: null }),

  // --- Undo / Redo ---

  undo: () => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow || flow.execution.isRunning) return;

    const restored = undoManager.undo(activeFlowId, takeSnapshot(flow));
    if (!restored) return;

    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: restored.nodes,
        edges: restored.edges,
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  redo: () => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow || flow.execution.isRunning) return;

    const restored = undoManager.redo(activeFlowId, takeSnapshot(flow));
    if (!restored) return;

    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: restored.nodes,
        edges: restored.edges,
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  // --- Active flow graph actions ---

  onNodesChange: (changes) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;

    // Capture undo snapshot before mutation
    if (!flow.execution.isRunning) {
      const hasRemove = changes.some((c) => c.type === "remove");
      const hasPosition = changes.some((c) => c.type === "position");
      const isOnlySelectOrDimension = changes.every(
        (c) => c.type === "select" || c.type === "dimensions"
      );
      if (!isOnlySelectOrDimension) {
        const before = takeSnapshot(flow);
        undoManager.pushSnapshot(activeFlowId, before, !hasRemove && hasPosition);
      }
    }

    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: applyNodeChanges(changes, flow.nodes),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  onEdgesChange: (changes) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;

    // Capture undo snapshot before mutation
    if (!flow.execution.isRunning) {
      const hasRemove = changes.some((c) => c.type === "remove");
      const isOnlySelect = changes.every((c) => c.type === "select");
      if (!isOnlySelect) {
        const before = takeSnapshot(flow);
        undoManager.pushSnapshot(activeFlowId, before, !hasRemove);
      }
    }

    set({
      flows: patchFlow(flows, activeFlowId, {
        edges: applyEdgeChanges(changes, flow.edges),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  onConnect: (connection) => {
    const sourceHandle = connection.sourceHandle || "text-out";
    const targetHandle = connection.targetHandle || "text-in";
    const isAdapterSource = sourceHandle === "adapter-out";
    const isAdapterTarget = targetHandle.startsWith("adapter-");

    // Reject cross-type connections (adapter ↔ text)
    if (isAdapterSource !== isAdapterTarget) return;

    const isAdapterEdge = isAdapterSource;
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;

    undoManager.pushSnapshot(activeFlowId, takeSnapshot(flow), false);

    set({
      flows: patchFlow(flows, activeFlowId, {
        edges: addEdge(
          {
            ...connection,
            animated: true,
            ...(isAdapterEdge && {
              style: {
                stroke: "#22c55e",
                strokeWidth: 2,
                strokeDasharray: "5 3",
              },
            }),
          },
          flow.edges
        ),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  addNode: (node) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;
    undoManager.pushSnapshot(activeFlowId, takeSnapshot(flow), false);
    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: sortNodes([...flow.nodes, node]),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  updateNodeData: (nodeId, data) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;
    if (!flow.execution.isRunning) {
      undoManager.pushSnapshot(activeFlowId, takeSnapshot(flow), true);
    }
    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: flow.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        ),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  setNodeParent: (nodeId, parentId) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;

    undoManager.pushSnapshot(activeFlowId, takeSnapshot(flow), false);

    const parent = flow.nodes.find((n) => n.id === parentId);
    const child = flow.nodes.find((n) => n.id === nodeId);
    if (!parent || !child) return;

    const relativePosition = {
      x: child.position.x - parent.position.x,
      y: child.position.y - parent.position.y,
    };

    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: sortNodes(
          flow.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  parentId,
                  position: relativePosition,
                  extent: "parent" as const,
                }
              : n
          )
        ),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  setHoveredGroupId: (id) => {
    const { activeFlowId, flows } = get();
    set({
      flows: patchFlow(flows, activeFlowId, { hoveredGroupId: id }),
    });
  },

  removeNodeFromGroup: (nodeId) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;

    undoManager.pushSnapshot(activeFlowId, takeSnapshot(flow), false);

    const child = flow.nodes.find((n) => n.id === nodeId);
    if (!child || !child.parentId) return;

    const parent = flow.nodes.find((n) => n.id === child.parentId);
    const absolutePosition = parent
      ? {
          x: child.position.x + parent.position.x,
          y: child.position.y + parent.position.y,
        }
      : child.position;

    set({
      flows: patchFlow(flows, activeFlowId, {
        nodes: sortNodes(
          flow.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  parentId: undefined,
                  extent: undefined,
                  position: absolutePosition,
                }
              : n
          )
        ),
        isDirty: true,
      }),
    });
    eventBus.emit("flow:dirty", { flowId: activeFlowId });
  },

  // --- Execution ---

  setProviderId: (providerId) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;
    set({
      flows: patchFlow(flows, activeFlowId, {
        execution: { ...flow.execution, providerId },
      }),
    });
  },

  resetExecution: () => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow) return;
    set({
      flows: patchFlow(flows, activeFlowId, {
        execution: { ...initialExecution, providerId: flow.execution.providerId },
      }),
    });
  },

  runFromNode: async (triggerNodeId: string) => {
    const { activeFlowId, flows } = get();
    const flow = flows[activeFlowId];
    if (!flow || flow.execution.isRunning) return;

    const flowId = activeFlowId; // capture for closure
    const { nodes, edges, execution } = flow;

    // Compute which nodes need to execute:
    // 1. The trigger node and everything downstream
    // 2. Any upstream ancestors that haven't been executed yet (no cached output)
    // 3. Adapter source nodes that feed into the execution set
    const downstreamIds = getDownstreamNodes(triggerNodeId, nodes, edges);

    // Include unexecuted upstream ancestors so mid-graph play works
    const upstreamIds = getUpstreamNodes(triggerNodeId, nodes, edges);
    for (const uid of upstreamIds) {
      if (!execution.nodeOutputs[uid]) {
        downstreamIds.add(uid);
      }
    }

    // Include adapter sources: if a node in the execution set has adapter inputs,
    // the source nodes must also execute so their outputs are available
    for (const edge of edges) {
      if (
        downstreamIds.has(edge.target) &&
        (edge.targetHandle || "").startsWith("adapter-") &&
        !downstreamIds.has(edge.source)
      ) {
        downstreamIds.add(edge.source);
      }
    }

    // Only clear textOutput nodes in the downstream subgraph
    const clearedNodes = nodes.map((n) =>
      n.type === "textOutput" && downstreamIds.has(n.id)
        ? { ...n, data: { ...n.data, text: "" } }
        : n
    );

    // Clear status/outputs only for downstream nodes, preserve the rest
    const preservedStatus: Record<string, NodeExecutionStatus> = {};
    const preservedOutputs: Record<string, NodeOutput> = {};
    for (const [nid, st] of Object.entries(execution.nodeStatus)) {
      if (!downstreamIds.has(nid)) preservedStatus[nid] = st;
    }
    for (const [nid, out] of Object.entries(execution.nodeOutputs)) {
      if (!downstreamIds.has(nid)) preservedOutputs[nid] = out;
    }

    set({
      flows: patchFlow(get().flows, flowId, {
        nodes: clearedNodes,
        execution: {
          ...execution,
          isRunning: true,
          nodeStatus: preservedStatus,
          nodeOutputs: preservedOutputs,
          globalError: null,
        },
      }),
    });

    eventBus.emit("execution:started", { flowId });

    // Filter to downstream nodes only, but pass ALL edges
    // so the runner can resolve upstream references via cachedOutputs
    const subNodes = nodes.filter((n) => downstreamIds.has(n.id));

    const onStatus = (
      nodeId: string,
      status: NodeExecutionStatus,
      output?: NodeOutput
    ) => {
      // Always read fresh state — flow might have been modified/switched
      const currentFlow = get().flows[flowId];
      if (!currentFlow) return; // flow was closed during execution

      const newNodeStatus = {
        ...currentFlow.execution.nodeStatus,
        [nodeId]: status,
      };
      const newNodeOutputs = output
        ? { ...currentFlow.execution.nodeOutputs, [nodeId]: output }
        : currentFlow.execution.nodeOutputs;

      // When a textOutput node completes, push the text into node.data
      let newNodes = currentFlow.nodes;
      if (status === "complete" || status === "error") {
        const node = currentFlow.nodes.find((n) => n.id === nodeId);
        if (node?.type === "textOutput" && output?.text) {
          newNodes = currentFlow.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, text: output.text } }
              : n
          );
        }
      }

      set({
        flows: patchFlow(get().flows, flowId, {
          nodes: newNodes,
          execution: {
            ...currentFlow.execution,
            nodeStatus: newNodeStatus,
            nodeOutputs: newNodeOutputs,
          },
        }),
      });

      eventBus.emit("execution:node-status", {
        flowId,
        nodeId,
        status,
        output,
      });
    };

    try {
      await executeGraph(
        subNodes,
        edges,
        execution.providerId,
        onStatus,
        preservedOutputs
      );
      eventBus.emit("execution:completed", { flowId });
      toastSuccess("Pipeline completed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      const currentFlow = get().flows[flowId];
      if (currentFlow) {
        set({
          flows: patchFlow(get().flows, flowId, {
            execution: { ...currentFlow.execution, globalError: msg },
          }),
        });
      }
      eventBus.emit("execution:error", { flowId, error: msg });
    } finally {
      const currentFlow = get().flows[flowId];
      if (currentFlow) {
        set({
          flows: patchFlow(get().flows, flowId, {
            execution: { ...currentFlow.execution, isRunning: false },
          }),
        });
      }
    }
  },

  // --- Tab management ---

  createFlow: (name?: string) => {
    const id = generateFlowId();
    const flowName = name || `Flow ${get().flowIds.length + 1}`;
    const flow = createDefaultFlow(id, flowName);
    set((state) => ({
      flowIds: [...state.flowIds, id],
      flows: { ...state.flows, [id]: flow },
      activeFlowId: id,
    }));
    undoManager.seedInitial(id, takeSnapshot(flow));
    eventBus.emit("flow:created", { flowId: id, name: flowName });
    return id;
  },

  closeFlow: (flowId: string) => {
    const state = get();
    if (state.flowIds.length <= 1) return; // never close the last tab

    const newFlowIds = state.flowIds.filter((id) => id !== flowId);
    const newFlows = { ...state.flows };
    delete newFlows[flowId];

    // If closing the active tab, switch to the nearest one
    let newActiveId = state.activeFlowId;
    if (flowId === state.activeFlowId) {
      const closedIndex = state.flowIds.indexOf(flowId);
      newActiveId =
        newFlowIds[Math.min(closedIndex, newFlowIds.length - 1)];
    }

    set({
      flowIds: newFlowIds,
      flows: newFlows,
      activeFlowId: newActiveId,
    });
    undoManager.clear(flowId);
    eventBus.emit("flow:closed", { flowId });
  },

  switchFlow: (flowId: string) => {
    if (get().flows[flowId]) {
      set({ activeFlowId: flowId });
      eventBus.emit("flow:switched", { flowId });
    }
  },

  renameFlow: (flowId: string, name: string) => {
    const flow = get().flows[flowId];
    if (!flow) return;
    set({
      flows: patchFlow(get().flows, flowId, { name, isDirty: true }),
    });
    eventBus.emit("flow:renamed", { flowId, name });
  },

  // --- Persistence helpers ---

  getFlowData: (flowId: string) => {
    return get().flows[flowId];
  },

  loadFlowData: (flowData: FlowData) => {
    const state = get();
    const alreadyExists = state.flowIds.includes(flowData.id);

    // Deduplicate nodes by ID (corrupted saves can contain duplicates)
    const seenIds = new Set<string>();
    const dedupedNodes = flowData.nodes.filter((n) => {
      if (seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });
    const cleanedData = dedupedNodes.length < flowData.nodes.length
      ? { ...flowData, nodes: dedupedNodes }
      : flowData;

    const isFirstFlow = state.flowIds.length === 0;
    set({
      flowIds: alreadyExists
        ? state.flowIds
        : [...state.flowIds, cleanedData.id],
      flows: { ...state.flows, [cleanedData.id]: cleanedData },
      // Activate the first loaded flow if store was empty
      ...(isFirstFlow && { activeFlowId: cleanedData.id }),
    });
    undoManager.seedInitial(cleanedData.id, takeSnapshot(cleanedData));
    eventBus.emit("flow:switched", { flowId: cleanedData.id });
  },

  markClean: (flowId: string) => {
    set({
      flows: patchFlow(get().flows, flowId, {
        isDirty: false,
        lastSavedAt: Date.now(),
      }),
    });
  },
}));
