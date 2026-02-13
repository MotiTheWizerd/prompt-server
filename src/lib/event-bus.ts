import type { NodeExecutionStatus, NodeOutput } from "@/lib/engine/types";

export type EventMap = {
  // Flow lifecycle
  "flow:created": { flowId: string; name: string };
  "flow:closed": { flowId: string };
  "flow:switched": { flowId: string };
  "flow:renamed": { flowId: string; name: string };
  "flow:dirty": { flowId: string };
  "flow:saved": { flowId: string };

  // Editor state
  "editor:status": { status: "disabled" | "active" };

  // Execution lifecycle (per-flow)
  "execution:started": { flowId: string };
  "execution:node-status": {
    flowId: string;
    nodeId: string;
    status: NodeExecutionStatus;
    output?: NodeOutput;
  };
  "execution:completed": { flowId: string };
  "execution:error": { flowId: string; error: string };
};

type Listener<T> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);

    return () => {
      this.listeners.get(event)?.delete(listener as Listener<unknown>);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(payload);
      }
    }
  }

  off<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }
}

export const eventBus = new EventBus();
