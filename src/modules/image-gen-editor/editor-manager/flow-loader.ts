import api from "@/lib/api";
import { useFlowStore } from "@/store/flow-store";
import { useUserStore } from "@/store/user-store";
import { useImageGenEditorStore } from "./store";
import type { FlowData } from "@/store/types";

interface FlowRecord {
  id: string;
  name: string;
  graph_data: { nodes: unknown[]; edges: unknown[]; providerId?: string };
  updated_at?: string;
}

export class FlowLoader {
  /**
   * Load all saved flows from the backend and hydrate the flow store.
   * Returns true if flows were loaded, false if none exist (store stays empty).
   */
  async loadFlows(): Promise<boolean> {
    const userId = useUserStore.getState().user?.id;
    const projectId = useImageGenEditorStore.getState().activeProjectId;
    if (!userId || !projectId) {
      return false;
    }

    const res = await api.post("/flows/load-flows", {
      user_id: Number(userId),
      project_id: Number(projectId),
    });
    const flows: FlowRecord[] = res.data ?? [];

    if (flows.length === 0) {
      return false;
    }

    for (const record of flows) {
      const gd = record.graph_data || { nodes: [], edges: [] };
      const flowData: FlowData = {
        id: record.id,
        name: record.name,
        nodes: (gd.nodes || []) as FlowData["nodes"],
        edges: (gd.edges || []) as FlowData["edges"],
        hoveredGroupId: null,
        execution: {
          isRunning: false,
          nodeStatus: {},
          nodeOutputs: {},
          globalError: null,
          providerId: gd.providerId || "mistral",
        },
        isDirty: false,
        lastSavedAt: record.updated_at ? new Date(record.updated_at).getTime() : null,
      };
      useFlowStore.getState().loadFlowData(flowData);
    }
    useFlowStore.getState().switchFlow(flows[0].id);
    return true;
  }

  /** Clear all flows from the store (used when switching projects). */
  clearFlows(): void {
    useFlowStore.getState().clearAllFlows();
  }
}
