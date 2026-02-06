import type { Node, Edge } from "@xyflow/react";
import type { NodeOutput, StatusCallback } from "./types";
import { buildExecutionPlan } from "./graph";
import { executorRegistry } from "./executors";

/**
 * Execute the entire node graph in topological order.
 * Calls onStatus for every state transition so the UI updates in real-time.
 */
export async function executeGraph(
  nodes: Node[],
  edges: Edge[],
  providerId: string,
  onStatus: StatusCallback
): Promise<Record<string, NodeOutput>> {
  const plan = buildExecutionPlan(nodes, edges);

  if (plan.length === 0) {
    throw new Error("No executable nodes found. Connect your nodes and try again.");
  }

  const outputs: Record<string, NodeOutput> = {};

  // Mark all planned nodes as pending
  for (const step of plan) {
    onStatus(step.nodeId, "pending");
  }

  for (const step of plan) {
    const { nodeId, nodeType, inputNodeIds } = step;

    const executor = executorRegistry[nodeType];
    if (!executor) {
      onStatus(nodeId, "skipped");
      continue;
    }

    // Skip if any upstream node errored
    const failedInput = inputNodeIds.find((id) => outputs[id]?.error);
    if (failedInput) {
      const output: NodeOutput = { error: "Upstream node failed" };
      outputs[nodeId] = output;
      onStatus(nodeId, "error", output);
      continue;
    }

    // Gather inputs from upstream nodes
    const inputs: NodeOutput[] = inputNodeIds
      .map((id) => outputs[id])
      .filter(Boolean);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    onStatus(nodeId, "running");

    try {
      const result = await executor({
        nodeData: node.data as Record<string, unknown>,
        inputs,
        providerId,
      });

      outputs[nodeId] = result.output;
      onStatus(nodeId, result.success ? "complete" : "error", result.output);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      outputs[nodeId] = { error };
      onStatus(nodeId, "error", { error });
    }
  }

  return outputs;
}
