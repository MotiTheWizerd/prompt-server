import type { Node, Edge } from "@xyflow/react";

export type NodeExecutionStatus =
  | "idle"
  | "pending"
  | "running"
  | "complete"
  | "error"
  | "skipped";

export interface NodeOutput {
  text?: string;
  personaDescription?: string;
  replacePrompt?: string;
  injectedPrompt?: string;
  error?: string;
  durationMs?: number;
}

export interface NodeExecutionContext {
  nodeData: Record<string, unknown>;
  inputs: NodeOutput[];
  providerId: string;
}

export interface NodeExecutionResult {
  success: boolean;
  output: NodeOutput;
}

export type NodeExecutor = (
  ctx: NodeExecutionContext
) => Promise<NodeExecutionResult>;

export type ExecutorRegistry = Record<string, NodeExecutor>;

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  inputNodeIds: string[];
}

export interface ExecutionState {
  isRunning: boolean;
  nodeStatus: Record<string, NodeExecutionStatus>;
  nodeOutputs: Record<string, NodeOutput>;
  globalError: string | null;
  providerId: string;
}

export type StatusCallback = (
  nodeId: string,
  status: NodeExecutionStatus,
  output?: NodeOutput
) => void;
