import type { Node, Edge } from "@xyflow/react";

export interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

interface FlowHistory {
  past: Snapshot[];
  future: Snapshot[];
}

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 500;
const BATCH_MS = 50; // group immediate pushes within the same frame

class UndoManager {
  private stacks = new Map<string, FlowHistory>();
  private pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingSnapshots = new Map<string, Snapshot>();
  // Batch window: absorb multiple immediate pushes within BATCH_MS
  private batchTimestamps = new Map<string, number>();

  private getOrCreate(flowId: string): FlowHistory {
    let h = this.stacks.get(flowId);
    if (!h) {
      h = { past: [], future: [] };
      this.stacks.set(flowId, h);
    }
    return h;
  }

  private commitSnapshot(flowId: string, snapshot: Snapshot): void {
    const h = this.getOrCreate(flowId);
    h.past.push(snapshot);
    if (h.past.length > MAX_HISTORY) h.past.shift();
    h.future = [];
  }

  flushPending(flowId: string): void {
    const timer = this.pendingTimers.get(flowId);
    if (timer) {
      clearTimeout(timer);
      this.pendingTimers.delete(flowId);
    }
    const pending = this.pendingSnapshots.get(flowId);
    if (pending) {
      this.pendingSnapshots.delete(flowId);
      this.commitSnapshot(flowId, pending);
    }
  }

  pushSnapshot(flowId: string, beforeSnapshot: Snapshot, debounce = false): void {
    if (debounce) {
      // "First snapshot wins" — capture state before the burst started
      if (!this.pendingSnapshots.has(flowId)) {
        this.pendingSnapshots.set(flowId, beforeSnapshot);
      }
      // Reset the timer
      const existing = this.pendingTimers.get(flowId);
      if (existing) clearTimeout(existing);
      this.pendingTimers.set(
        flowId,
        setTimeout(() => {
          this.pendingTimers.delete(flowId);
          const snap = this.pendingSnapshots.get(flowId);
          if (snap) {
            this.pendingSnapshots.delete(flowId);
            this.commitSnapshot(flowId, snap);
          }
        }, DEBOUNCE_MS)
      );
    } else {
      // Batch immediate pushes within the same frame
      // (e.g. node remove + connected edge remove fire separately but are one action)
      const now = Date.now();
      const lastBatch = this.batchTimestamps.get(flowId) ?? 0;
      if (now - lastBatch < BATCH_MS) {
        // Within batch window — skip, the first push already captured the "before" state
        return;
      }

      // Flush any pending debounced snapshot first
      this.flushPending(flowId);
      this.commitSnapshot(flowId, beforeSnapshot);
      this.batchTimestamps.set(flowId, now);
    }
  }

  undo(flowId: string, currentSnapshot: Snapshot): Snapshot | null {
    this.flushPending(flowId);
    const h = this.stacks.get(flowId);
    if (!h || h.past.length === 0) return null;
    const restored = h.past.pop()!;
    h.future.push(currentSnapshot);
    return restored;
  }

  redo(flowId: string, currentSnapshot: Snapshot): Snapshot | null {
    const h = this.stacks.get(flowId);
    if (!h || h.future.length === 0) return null;
    const restored = h.future.pop()!;
    h.past.push(currentSnapshot);
    return restored;
  }

  canUndo(flowId: string): boolean {
    const h = this.stacks.get(flowId);
    return !!h && h.past.length > 0;
  }

  canRedo(flowId: string): boolean {
    const h = this.stacks.get(flowId);
    return !!h && h.future.length > 0;
  }

  seedInitial(flowId: string, snapshot: Snapshot): void {
    const h = this.getOrCreate(flowId);
    if (h.past.length === 0) {
      h.past.push(snapshot);
    }
  }

  clear(flowId: string): void {
    const timer = this.pendingTimers.get(flowId);
    if (timer) clearTimeout(timer);
    this.pendingTimers.delete(flowId);
    this.pendingSnapshots.delete(flowId);
    this.stacks.delete(flowId);
    this.batchTimestamps.delete(flowId);
  }
}

export const undoManager = new UndoManager();
