import type { Node, Edge } from "@xyflow/react";

export type NodeExecutionStatus =
  | "idle"
  | "pending"
  | "running"
  | "complete"
  | "error"
  | "skipped";

export interface PersonaInput {
  name: string;
  description: string;
}

export interface NodeOutput {
  text?: string;
  image?: string; // base64 data URL from image generation
  personaDescription?: string;
  personaName?: string;
  replacePrompt?: string;
  injectedPrompt?: string;
  error?: string;
  durationMs?: number;
}

export interface NodeExecutionContext {
  nodeData: Record<string, unknown>;
  inputs: NodeOutput[];
  adapterInputs: NodeOutput[];
  providerId: string;
  model?: string;
  nodeType: string;
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
  adapterNodeIds: string[];
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
