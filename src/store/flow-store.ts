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

export type NodeData = Record<string, unknown>;

const initialNodes: Node[] = [
  {
    id: "initial-prompt-1",
    type: "initialPrompt",
    position: { x: 300, y: 200 },
    data: { label: "Initial Prompt", text: "" },
  },
];

const initialEdges: Edge[] = [];

const initialExecution: ExecutionState = {
  isRunning: false,
  nodeStatus: {},
  nodeOutputs: {},
  globalError: null,
  providerId: "mistral",
};

/** Ensure parent nodes appear before their children in the array. */
function sortNodes(nodes: Node[]): Node[] {
  const parentIds = new Set(nodes.filter((n) => n.type === "group").map((n) => n.id));
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

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  hoveredGroupId: string | null;
  execution: ExecutionState;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setNodeParent: (nodeId: string, parentId: string) => void;
  removeNodeFromGroup: (nodeId: string) => void;
  setHoveredGroupId: (id: string | null) => void;

  // Execution actions
  setProviderId: (providerId: string) => void;
  runPipeline: () => Promise<void>;
  resetExecution: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  hoveredGroupId: null,
  execution: initialExecution,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge({ ...connection, animated: true }, get().edges) });
  },

  addNode: (node) => {
    set({ nodes: sortNodes([...get().nodes, node]) });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  setNodeParent: (nodeId, parentId) => {
    const nodes = get().nodes;
    const parent = nodes.find((n) => n.id === parentId);
    const child = nodes.find((n) => n.id === nodeId);
    if (!parent || !child) return;

    const relativePosition = {
      x: child.position.x - parent.position.x,
      y: child.position.y - parent.position.y,
    };

    set({
      nodes: sortNodes(
        nodes.map((n) =>
          n.id === nodeId
            ? { ...n, parentId, position: relativePosition, extent: "parent" as const }
            : n
        )
      ),
    });
  },

  setHoveredGroupId: (id) => {
    set({ hoveredGroupId: id });
  },

  removeNodeFromGroup: (nodeId) => {
    const nodes = get().nodes;
    const child = nodes.find((n) => n.id === nodeId);
    if (!child || !child.parentId) return;

    const parent = nodes.find((n) => n.id === child.parentId);
    const absolutePosition = parent
      ? { x: child.position.x + parent.position.x, y: child.position.y + parent.position.y }
      : child.position;

    set({
      nodes: sortNodes(
        nodes.map((n) =>
          n.id === nodeId
            ? { ...n, parentId: undefined, extent: undefined, position: absolutePosition }
            : n
        )
      ),
    });
  },

  // --- Execution ---

  setProviderId: (providerId) => {
    set((state) => ({
      execution: { ...state.execution, providerId },
    }));
  },

  resetExecution: () => {
    set({ execution: initialExecution });
  },

  runPipeline: async () => {
    const { nodes, edges, execution } = get();

    // Reset previous run state
    set({
      execution: {
        ...execution,
        isRunning: true,
        nodeStatus: {},
        nodeOutputs: {},
        globalError: null,
      },
    });

    const onStatus = (
      nodeId: string,
      status: NodeExecutionStatus,
      output?: NodeOutput
    ) => {
      const state = get();
      const newNodeStatus = { ...state.execution.nodeStatus, [nodeId]: status };
      const newNodeOutputs = output
        ? { ...state.execution.nodeOutputs, [nodeId]: output }
        : state.execution.nodeOutputs;

      // When a textOutput node completes, push the text into node.data so it renders
      let newNodes = state.nodes;
      if (status === "complete" || status === "error") {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node?.type === "textOutput" && output?.text) {
          newNodes = state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, text: output.text } } : n
          );
        }
      }

      set({
        nodes: newNodes,
        execution: {
          ...state.execution,
          nodeStatus: newNodeStatus,
          nodeOutputs: newNodeOutputs,
        },
      });
    };

    try {
      await executeGraph(nodes, edges, execution.providerId, onStatus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      set((state) => ({
        execution: { ...state.execution, globalError: msg },
      }));
    } finally {
      set((state) => ({
        execution: { ...state.execution, isRunning: false },
      }));
    }
  },
}));
