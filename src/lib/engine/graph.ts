import type { Node, Edge } from "@xyflow/react";
import type { ExecutionStep } from "./types";

/**
 * Build a topologically sorted execution plan from the React Flow graph.
 * Uses Kahn's algorithm. Throws if the graph contains a cycle.
 */
export function buildExecutionPlan(
  nodes: Node[],
  edges: Edge[]
): ExecutionStep[] {
  // Filter out group nodes and deduplicate by ID (prevents false cycle detection)
  const seen = new Set<string>();
  const executableNodes = nodes.filter((n) => {
    if (n.type === "group" || seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  const nodeIds = new Set(executableNodes.map((n) => n.id));

  // Build adjacency list and in-degree map
  const adjacency = new Map<string, string[]>(); // source → targets
  const inDegree = new Map<string, number>();

  for (const id of nodeIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Kahn's algorithm: start with nodes that have no incoming edges
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: ExecutionStep[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = executableNodes.find((n) => n.id === nodeId);
    if (!node) continue;

    sorted.push({
      nodeId,
      nodeType: node.type || "unknown",
      inputNodeIds: getTextInputNodeIds(nodeId, edges),
      adapterNodeIds: getAdapterInputNodeIds(nodeId, edges),
    });

    for (const target of adjacency.get(nodeId) || []) {
      const newDeg = (inDegree.get(target) || 1) - 1;
      inDegree.set(target, newDeg);
      if (newDeg === 0) queue.push(target);
    }
  }

  if (sorted.length < executableNodes.length) {
    throw new Error(
      "Graph contains a cycle. Please remove circular connections."
    );
  }

  return sorted;
}

/** Get the IDs of nodes that feed TEXT into the given node (non-adapter edges). */
export function getTextInputNodeIds(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(
      (e) =>
        e.target === nodeId &&
        !(e.targetHandle || "").startsWith("adapter-")
    )
    .map((e) => e.source);
}

/** Get the IDs of ADAPTER nodes that attach to the given node (adapter-* target handles). */
export function getAdapterInputNodeIds(
  nodeId: string,
  edges: Edge[]
): string[] {
  return edges
    .filter(
      (e) =>
        e.target === nodeId &&
        (e.targetHandle || "").startsWith("adapter-")
    )
    .map((e) => e.source);
}

/** BFS from a start node to find all downstream nodes (inclusive). */
export function getDownstreamNodes(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Set<string> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const downstream = new Set<string>([startNodeId]);
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (
        edge.source === current &&
        nodeIds.has(edge.target) &&
        !downstream.has(edge.target)
      ) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return downstream;
}
