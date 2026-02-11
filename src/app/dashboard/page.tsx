"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageSquareText,
  Sparkles,
  Languages,
  Group,
  FileText,
  AlertCircle,
  X,
  ScanEye,
  ChevronDown,
  ChevronRight,
  UserRound,
  Box,
  Puzzle,
  BookOpen,
  SpellCheck,
  CloudSun,
  Shrink,
  ImageIcon,
  UserRoundPen,
} from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { nodeTypes } from "@/components/nodes";
import { getCharacters, type Character } from "@/lib/characters";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { TabBar } from "@/components/TabBar";
import { ImageLightbox } from "@/components/ImageLightbox";
import { initAutoSave } from "@/lib/auto-save";
import type { FlowData } from "@/store/types";

type SidebarItem = { type: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };
type SidebarGroup = { label: string; items: SidebarItem[] };

const componentGroups: SidebarGroup[] = [
  {
    label: "Input",
    items: [
      { type: "initialPrompt", label: "Initial Prompt", icon: MessageSquareText, color: "text-cyan-400" },
      { type: "imageDescriber", label: "Image Describer", icon: ScanEye, color: "text-pink-400" },
    ],
  },
  {
    label: "Scene Atmosphere",
    items: [
      { type: "sceneBuilder", label: "Scene Builder", icon: CloudSun, color: "text-sky-400" },
    ],
  },
  {
    label: "Processing",
    items: [
      { type: "promptEnhancer", label: "Prompt Enhancer", icon: Sparkles, color: "text-violet-400" },
      { type: "storyTeller", label: "Story Teller", icon: BookOpen, color: "text-amber-400" },
      { type: "translator", label: "Translator", icon: Languages, color: "text-orange-400" },
      { type: "grammarFix", label: "Grammar Fix", icon: SpellCheck, color: "text-green-400" },
      { type: "compressor", label: "Compressor", icon: Shrink, color: "text-teal-400" },
      { type: "personasReplacer", label: "Personas Replacer", icon: UserRoundPen, color: "text-rose-400" },
    ],
  },
  {
    label: "Output",
    items: [
      { type: "textOutput", label: "Text Output", icon: FileText, color: "text-emerald-400" },
      { type: "imageGenerator", label: "Image Generator", icon: ImageIcon, color: "text-fuchsia-400" },
    ],
  },
  {
    label: "Layout",
    items: [
      { type: "group", label: "Group", icon: Group, color: "text-gray-400" },
    ],
  },
];

let nodeId = 100;

// Stable defaults to avoid infinite re-render when store is empty
const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export default function Dashboard() {
  return (
    <ReactFlowProvider>
      <DashboardInner />
    </ReactFlowProvider>
  );
}

function DashboardInner() {
  const nodes = useFlowStore((s) => s.flows[s.activeFlowId]?.nodes ?? EMPTY_NODES);
  const edges = useFlowStore((s) => s.flows[s.activeFlowId]?.edges ?? EMPTY_EDGES);
  const execution = useFlowStore((s) => s.flows[s.activeFlowId]?.execution);
  const {
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setHoveredGroupId,
    setNodeParent,
    removeNodeFromGroup,
    setProviderId,
  } = useFlowStore();
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();

  // Animate edges while any node is running or pending
  const isAnyRunning = useMemo(
    () => Object.values(execution?.nodeStatus || {}).some((s) => s === "running" || s === "pending"),
    [execution?.nodeStatus]
  );
  const animatedEdges = useMemo(
    () => edges.map((e) => ({ ...e, animated: isAnyRunning })),
    [edges, isAnyRunning]
  );

  // Double-click an edge to disconnect it
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgesChange([{ id: edge.id, type: "remove" }]);
    },
    [onEdgesChange]
  );

  // Sidebar collapse state
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { personas: true };
    componentGroups.forEach((g) => { init[g.label] = true; });
    return init;
  });
  const toggleSub = useCallback((key: string) => {
    setOpenSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Initialize auto-save and load saved flows on mount
  useEffect(() => {
    let stale = false;
    initAutoSave();

    fetch("/api/flows")
      .then((r) => r.json())
      .then(async (data: { flows: { id: string; name: string }[] }) => {
        if (stale) return;

        if (!data.flows || data.flows.length === 0) {
          useFlowStore.getState().createFlow("Flow 1");
          return;
        }
        for (const summary of data.flows) {
          if (stale) return;
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
        // Switch to first loaded flow
        const firstId = data.flows[0].id;
        useFlowStore.getState().switchFlow(firstId);

        // Sync nodeId counter to avoid duplicate IDs
        const allFlows = useFlowStore.getState().flows;
        let maxId = nodeId;
        for (const flow of Object.values(allFlows)) {
          for (const node of flow.nodes) {
            const match = node.id.match(/-(\d+)$/);
            if (match) maxId = Math.max(maxId, Number(match[1]) + 1);
          }
        }
        nodeId = maxId;
      })
      .catch(() => {
        if (stale) return;
        useFlowStore.getState().createFlow("Flow 1");
      });

    return () => { stale = true; };
  }, []);

  // Load characters for the Assets section
  const [characters, setCharacters] = useState<Character[]>([]);
  useEffect(() => {
    setCharacters(getCharacters());
  }, []);

  // Refresh characters when window regains focus (user may have added chars on another page)
  useEffect(() => {
    const onFocus = () => setCharacters(getCharacters());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Warn before closing if any flow has unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { flows } = useFlowStore.getState();
      const hasUnsaved = Object.values(flows).some((f) => f.isDirty);
      if (hasUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // --- Connection validation ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isValidConnection = useCallback((connection: any) => {
    const sourceHandle = connection.sourceHandle ?? "text-out";
    const targetHandle = connection.targetHandle ?? "text-in";
    const isAdapterSource = sourceHandle === "adapter-out";
    const isAdapterTarget = (targetHandle as string).startsWith("adapter-");
    return isAdapterSource === isAdapterTarget;
  }, []);

  // --- Sidebar drag-and-drop ---

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, charData?: Character) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      if (charData) {
        event.dataTransfer.setData("application/character", JSON.stringify(charData));
      }
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isGroup = type === "group";

      // Check if this is a character asset drop
      const charRaw = event.dataTransfer.getData("application/character");
      const charData: Character | null = charRaw ? JSON.parse(charRaw) : null;

      const newNode: Node = {
        id: `${type}-${nodeId++}`,
        type,
        position,
        data: isGroup
          ? { label: "Group" }
          : charData
            ? {
                characterId: charData.id,
                characterName: charData.name,
                characterDescription: charData.description,
                characterImagePath: charData.imagePath,
              }
            : { label: type },
        ...(isGroup && { style: { width: 500, height: 300 } }),
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // --- Canvas node drag: detect group intersection ---

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "group") {
        setHoveredGroupId(null);
        return;
      }

      const intersecting = getIntersectingNodes(node);
      const group = intersecting.find((n) => n.type === "group");
      setHoveredGroupId(group?.id ?? null);
    },
    [getIntersectingNodes, setHoveredGroupId]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setHoveredGroupId(null);

      if (node.type === "group") return;

      const intersecting = getIntersectingNodes(node);
      const group = intersecting.find((n) => n.type === "group");

      if (group) {
        if (node.parentId !== group.id) {
          setNodeParent(node.id, group.id);
        }
      } else if (node.parentId) {
        removeNodeFromGroup(node.id);
      }
    },
    [getIntersectingNodes, setHoveredGroupId, setNodeParent, removeNodeFromGroup]
  );

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      <ImageLightbox />
      {/* Top bar */}
      <header className="flex items-center px-4 py-2.5 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Prompt Creator
          </h1>
          <div className="h-5 w-px bg-gray-700" />

          {/* Provider selector */}
          <ProviderSelect
            value={execution?.providerId ?? "mistral"}
            onChange={setProviderId}
            disabled={execution?.isRunning}
          />
        </div>
      </header>

      {/* Global error banner */}
      {execution?.globalError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-950/60 border-b border-red-900/50 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{execution?.globalError}</span>
          <button
            onClick={() => useFlowStore.getState().resetExecution()}
            className="ml-auto p-0.5 hover:text-red-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Tab bar */}
      <TabBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-gray-800 bg-gray-950/60 p-3 flex flex-col gap-1 overflow-y-auto">

          {/* === Assets Section === */}
          <button
            onClick={() => setAssetsOpen(!assetsOpen)}
            className="flex items-center gap-1.5 px-1 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors w-full"
          >
            {assetsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Box className="w-3 h-3" />
            Assets
          </button>

          {assetsOpen && (
            <div className="flex flex-col gap-0.5 mb-2 pl-2">
              {/* --- Personas sub-section --- */}
              <button
                onClick={() => toggleSub("personas")}
                className="flex items-center gap-1 px-1 py-1 text-[9px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors w-full"
              >
                {openSubs.personas ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                <UserRound className="w-2.5 h-2.5" />
                Personas
              </button>

              {openSubs.personas && (
                <div className="flex flex-col gap-1.5 mb-1">
                  {characters.length === 0 ? (
                    <div className="px-3 py-3 text-[10px] text-gray-600 italic text-center">
                      No characters yet.
                      <br />
                      Create them in Characters page.
                    </div>
                  ) : (
                    characters.map((char) => (
                      <div
                        key={char.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, "consistentCharacter", char)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-800/70 hover:border-amber-500/30 cursor-grab active:cursor-grabbing transition-colors"
                      >
                        <img
                          src={char.imagePath}
                          alt={char.name}
                          className="w-7 h-7 rounded-md object-cover border border-gray-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-gray-300 font-medium truncate">{char.name}</div>
                          <div className="text-[9px] text-gray-600 truncate">{char.description.slice(0, 40)}...</div>
                        </div>
                        <UserRound className="w-3 h-3 text-amber-400/60 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* === Components Section === */}
          <button
            onClick={() => setComponentsOpen(!componentsOpen)}
            className="flex items-center gap-1.5 px-1 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors w-full"
          >
            {componentsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Puzzle className="w-3 h-3" />
            Components
          </button>

          {componentsOpen && (
            <div className="flex flex-col gap-0.5 mb-2 pl-2">
              {componentGroups.map((group) => (
                <div key={group.label}>
                  <button
                    onClick={() => toggleSub(group.label)}
                    className="flex items-center gap-1 px-1 py-1 text-[9px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors w-full"
                  >
                    {openSubs[group.label] ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                    {group.label}
                  </button>

                  {openSubs[group.label] && (
                    <div className="flex flex-col gap-1.5 mb-1">
                      {group.items.map((item) => (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, item.type)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-800/70 hover:border-gray-700 cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-xs text-gray-300">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto text-[10px] text-gray-600 text-center pt-2">
            Drag items onto the canvas
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={animatedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            defaultViewport={{ x: 0, y: 0, zoom: 0.575 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: true }}
            className="bg-gray-950"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#374151"
            />
            <Controls
              className="!bg-gray-900 !border-gray-700 !rounded-lg !shadow-xl [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-400 [&>button:hover]:!bg-gray-700"
            />
            <MiniMap
              nodeColor={() => "#6366f1"}
              maskColor="rgba(0,0,0,0.7)"
              className="!bg-gray-900 !border-gray-700 !rounded-lg"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
