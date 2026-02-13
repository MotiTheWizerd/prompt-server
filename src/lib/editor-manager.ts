import { create } from "zustand";
import api from "@/lib/api";
import { eventBus } from "@/lib/event-bus";
import { initAutoSave } from "@/lib/auto-save";
import { useFlowStore } from "@/store/flow-store";
import type { FlowData } from "@/store/types";

// ---- Types ----

export type EditorStatus = "disabled" | "active";

export interface ProjectOption {
  value: string;
  label: string;
}

interface EditorManagerState {
  editorStatus: EditorStatus;
  projects: ProjectOption[];
  activeProjectId: string;
  initialized: boolean;
  loading: boolean;

  init: (userId: string) => Promise<void>;
  selectProject: (projectId: string) => void;
  createProject: (name: string, userId: string) => Promise<void>;
}

// ---- Node ID counter ----

let _nodeId = 100;

export function getNextNodeId(): number {
  return _nodeId++;
}

function syncNodeIdCounter() {
  const allFlows = useFlowStore.getState().flows;
  let maxId = _nodeId;
  for (const flow of Object.values(allFlows)) {
    for (const node of flow.nodes) {
      const match = node.id.match(/-(\d+)$/);
      if (match) maxId = Math.max(maxId, Number(match[1]) + 1);
    }
  }
  _nodeId = maxId;
}

// ---- Store ----

export const useEditorManager = create<EditorManagerState>((set, get) => ({
  editorStatus: "disabled",
  projects: [],
  activeProjectId: "",
  initialized: false,
  loading: false,

  init: async (userId: string) => {
    if (get().initialized) return;
    set({ initialized: true, loading: true });

    // 1. Init auto-save (idempotent)
    initAutoSave();

    // 2. Fetch projects
    try {
      const res = await api.post("/projects/select", { user_id: Number(userId) });
      const list: ProjectOption[] = (res.data ?? []).map(
        (p: { id: number; project_name: string }) => ({
          value: String(p.id),
          label: p.project_name,
        })
      );
      const activeId = list.length > 0 ? list[0].value : "";
      const status: EditorStatus = activeId ? "active" : "disabled";
      set({ projects: list, activeProjectId: activeId, editorStatus: status });
      eventBus.emit("editor:status", { status });
    } catch {
      // Projects fetch failed — editor stays disabled
    }

    // 3. Load flows from persistence
    try {
      const response = await fetch("/api/flows");
      const data: { flows: { id: string; name: string }[] } = await response.json();

      if (!data.flows || data.flows.length === 0) {
        useFlowStore.getState().createFlow("Flow 1");
      } else {
        for (const summary of data.flows) {
          const res = await fetch(`/api/flows/${summary.id}`);
          if (!res.ok) continue;
          const flowJson = await res.json();
          const flowData: FlowData = {
            id: flowJson.id,
            name: flowJson.name,
            nodes: flowJson.nodes || [],
            edges: flowJson.edges || [],
            hoveredGroupId: null,
            execution: {
              isRunning: false,
              nodeStatus: {},
              nodeOutputs: {},
              globalError: null,
              providerId: flowJson.providerId || "mistral",
            },
            isDirty: false,
            lastSavedAt: flowJson.updatedAt || null,
          };
          useFlowStore.getState().loadFlowData(flowData);
        }
        useFlowStore.getState().switchFlow(data.flows[0].id);
        syncNodeIdCounter();
      }
    } catch {
      useFlowStore.getState().createFlow("Flow 1");
    }

    set({ loading: false });
  },

  selectProject: (projectId: string) => {
    const status: EditorStatus = projectId ? "active" : "disabled";
    set({ activeProjectId: projectId, editorStatus: status });
    eventBus.emit("editor:status", { status });
  },

  createProject: async (name: string, userId: string) => {
    const res = await api.post("/projects", {
      project_name: name.trim(),
      user_id: Number(userId),
    });
    const created = res.data;
    const newOption: ProjectOption = {
      value: String(created.id),
      label: created.project_name,
    };
    set((state) => ({
      projects: [...state.projects, newOption],
      activeProjectId: newOption.value,
      editorStatus: "active" as EditorStatus,
    }));
    eventBus.emit("editor:status", { status: "active" });
  },
}));
