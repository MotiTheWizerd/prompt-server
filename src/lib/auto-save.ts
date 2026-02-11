import { eventBus } from "./event-bus";
import { useFlowStore } from "@/store/flow-store";

const DEBOUNCE_MS = 2000;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

let initialized = false;

/** Serialize a flow for persistence (strips runtime state). */
function serializeFlow(flow: { id: string; name: string; nodes: unknown[]; edges: unknown[]; execution: { providerId: string }; lastSavedAt: number | null }) {
  return {
    id: flow.id,
    name: flow.name,
    nodes: flow.nodes,
    edges: flow.edges,
    providerId: flow.execution.providerId,
    updatedAt: Date.now(),
    createdAt: flow.lastSavedAt || Date.now(),
  };
}

async function saveFlow(flowId: string) {
  const flow = useFlowStore.getState().flows[flowId];
  if (!flow || !flow.isDirty) return;

  try {
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeFlow(flow)),
    });
    if (res.ok) {
      useFlowStore.getState().markClean(flowId);
      eventBus.emit("flow:saved", { flowId });
    }
  } catch (err) {
    console.error("Auto-save failed for flow", flowId, err);
  }
}

function scheduleSave(flowId: string) {
  const existing = pendingTimers.get(flowId);
  if (existing) clearTimeout(existing);

  pendingTimers.set(
    flowId,
    setTimeout(() => {
      pendingTimers.delete(flowId);
      saveFlow(flowId);
    }, DEBOUNCE_MS)
  );
}

/** Flush all dirty flows immediately (fire-and-forget via sendBeacon). */
function flushAll() {
  // Cancel pending debounced saves — we're saving everything now
  for (const timer of pendingTimers.values()) clearTimeout(timer);
  pendingTimers.clear();

  const { flows } = useFlowStore.getState();
  for (const flow of Object.values(flows)) {
    if (!flow.isDirty) continue;
    const blob = new Blob(
      [JSON.stringify(serializeFlow(flow))],
      { type: "application/json" }
    );
    navigator.sendBeacon("/api/flows", blob);
  }
}

export function initAutoSave() {
  if (initialized) return;
  initialized = true;
  eventBus.on("flow:dirty", ({ flowId }) => scheduleSave(flowId));
  window.addEventListener("beforeunload", flushAll);
}
