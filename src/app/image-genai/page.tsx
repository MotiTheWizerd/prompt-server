"use client";

import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,

  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  UserRound,
  Box,
  Puzzle,
  HelpCircle,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { nodeTypes } from "@/components/nodes";
import { getCharacters, type Character, imageGenEditor, useImageGenEditorStore } from "@/modules/image-gen-editor";
import { resolveIcon } from "@/components/shared/icon-registry";
import { GeneralDropdown } from "@/components/shared/GeneralDropdown";
import { Modal } from "@/components/shared/Modal";
import { TabBar } from "@/components/TabBar";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useUserStore } from "@/store/user-store";
import { BRAND } from "@/lib/constants";


function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400 font-mono shrink-0">
        {keys}
      </kbd>
      <span className="text-gray-400 text-[11px] text-right">{desc}</span>
    </div>
  );
}

// Stable defaults to avoid infinite re-render when store is empty
const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export default function ImageGenAI() {
  return (
    <ReactFlowProvider>
      <ImageGenAIInner />
    </ReactFlowProvider>
  );
}

function ImageGenAIInner() {
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
  } = useFlowStore();
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow();
  const user = useUserStore((s) => s.user);

  // Editor manager
  const projects = useImageGenEditorStore((s) => s.projects);
  const activeProjectId = useImageGenEditorStore((s) => s.activeProjectId);
  const editorStatus = useImageGenEditorStore((s) => s.status);
  const isDisabled = editorStatus === "disabled";
  const componentGroups = useImageGenEditorStore((s) => s.componentGroups);

  // Initialize editor manager on mount
  useEffect(() => {
    if (!user) return;
    imageGenEditor.init(user.id);
  }, [user]);

  // Fit viewport to loaded nodes when active flow changes
  const activeFlowId = useFlowStore((s) => s.activeFlowId);
  const prevFlowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFlowId && activeFlowId !== prevFlowIdRef.current && nodes.length > 0) {
      // Small delay to let React Flow measure the nodes
      const timer = setTimeout(() => fitView({ padding: 0.15, duration: 200 }), 50);
      prevFlowIdRef.current = activeFlowId;
      return () => clearTimeout(timer);
    }
    prevFlowIdRef.current = activeFlowId;
  }, [activeFlowId, nodes.length, fitView]);

  // Create project modal
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim() || !user) return;
    setCreatingProject(true);
    try {
      await imageGenEditor.createProject(projectName.trim(), user.id);
      setProjectName("");
      setShowCreateProject(false);
    } catch {
      // TODO: toast error
    } finally {
      setCreatingProject(false);
    }
  }, [projectName, user]);

  // Animate only edges connected to running/pending nodes
  const nodeStatus = execution?.nodeStatus;
  const animatedEdges = useMemo(
    () => {
      if (!nodeStatus) return edges;
      return edges.map((e) => {
        const srcStatus = nodeStatus[e.source];
        const animated = srcStatus === "running";
        return animated !== e.animated ? { ...e, animated } : e;
      });
    },
    [edges, nodeStatus]
  );

  // Double-click an edge to disconnect it
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgesChange([{ id: edge.id, type: "remove" }]);
    },
    [onEdgesChange]
  );

  // --- Drop connection on ghost adapter button → auto-create + connect ---
  const connectStartRef = useRef<{ nodeId: string; handleId: string } | null>(null);
  const connectToGhostAdapter = useFlowStore((s) => s.connectToGhostAdapter);

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null }) => {
      if (params.nodeId && params.handleId) {
        connectStartRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const source = connectStartRef.current;
      connectStartRef.current = null;
      if (!source || source.handleId !== "adapter-out") return;

      const clientX = "clientX" in event ? event.clientX : event.touches?.[0]?.clientX;
      const clientY = "clientY" in event ? event.clientY : event.touches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;

      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const ghostButton = target?.closest('[data-ghost-adapter]');
      if (!ghostButton) return;

      const nodeWrapper = ghostButton.closest('.react-flow__node');
      const targetNodeId = nodeWrapper?.getAttribute('data-id');
      if (!targetNodeId) return;

      connectToGhostAdapter(source.nodeId, source.handleId, targetNodeId);
    },
    [connectToGhostAdapter]
  );

  // Help popup state
  const [showHelp, setShowHelp] = useState(false);

  // Sidebar collapse state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({ personas: true });
  const toggleSub = useCallback((key: string) => {
    setOpenSubs((prev) => ({ ...prev, [key]: !prev[key] }));
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
        id: `${type}-${imageGenEditor.getNextNodeId()}`,
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

  // --- Canvas node drag: detect group intersection + locked adapter follow ---

  // Track locked character companions during drag
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCompanionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      dragStartRef.current = { x: node.position.x, y: node.position.y };
      dragCompanionsRef.current.clear();

      // Find locked character nodes connected to this node via adapter edges
      const { flows, activeFlowId } = useFlowStore.getState();
      const flow = flows[activeFlowId];
      if (!flow) return;

      for (const edge of flow.edges) {
        if (edge.target !== node.id) continue;
        if (!edge.targetHandle?.startsWith("adapter-")) continue;

        const sourceNode = flow.nodes.find((n) => n.id === edge.source);
        if (!sourceNode || !sourceNode.data.adapterLocked) continue;

        dragCompanionsRef.current.set(sourceNode.id, {
          x: sourceNode.position.x,
          y: sourceNode.position.y,
        });
      }
    },
    []
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "group") {
        setHoveredGroupId(null);
        return;
      }

      const intersecting = getIntersectingNodes(node);
      const group = intersecting.find((n) => n.type === "group");
      setHoveredGroupId(group?.id ?? null);

      // Move locked companions by the same delta
      if (dragStartRef.current && dragCompanionsRef.current.size > 0) {
        const dx = node.position.x - dragStartRef.current.x;
        const dy = node.position.y - dragStartRef.current.y;

        for (const [companionId, startPos] of dragCompanionsRef.current) {
          onNodesChange([{
            type: "position",
            id: companionId,
            position: { x: startPos.x + dx, y: startPos.y + dy },
          }]);
        }
      }
    },
    [getIntersectingNodes, setHoveredGroupId, onNodesChange]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setHoveredGroupId(null);
      dragStartRef.current = null;
      dragCompanionsRef.current.clear();

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

      {/* Create Project Modal */}
      <Modal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        title="New Project"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateProject();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Project name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My awesome project"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={!projectName.trim() || creatingProject}
            className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingProject ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>

      {/* Top bar */}
      <header className="flex items-center px-4 py-2.5 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {BRAND.name}
          </h1>
          <div className="h-5 w-px bg-gray-700" />
          <GeneralDropdown
            options={[{ value: "", label: "Select project" }, ...projects]}
            value={activeProjectId}
            onChange={(v) => imageGenEditor.selectProject(v)}
            placeholder="Select project"
          />
          <button
            onClick={() => setShowCreateProject(true)}
            title="New project"
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
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

      {/* Editor area — disabled when no project selected */}
      <div className={`flex flex-col flex-1 overflow-hidden ${isDisabled ? "pointer-events-none opacity-40 select-none" : ""}`}>
      <TabBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`border-r border-gray-800/60 bg-gray-950/80 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
            sidebarOpen ? "w-48" : "w-9"
          }`}
        >
          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center h-8 border-b border-gray-800/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition-colors shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          {/* Sidebar content — hidden when collapsed */}
          <div className={`flex flex-col gap-0.5 px-2 py-1.5 overflow-y-auto overflow-x-hidden flex-1 min-w-0 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-150`}>

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
              <div className="flex flex-col gap-0.5 mb-2 pl-2 min-w-0">
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
                  <div className="flex flex-col gap-0.5 mb-1">
                    {characters.length === 0 ? (
                      <div className="px-2 py-2 text-[10px] text-gray-600 italic text-center">
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
                          className="group/persona flex items-center gap-1.5 px-1.5 py-1 rounded-sm border-l-2 border-transparent bg-gray-900/30 hover:bg-gray-800/60 hover:border-l-amber-400 cursor-grab active:cursor-grabbing transition-all duration-150"
                        >
                          <img
                            src={char.imagePath}
                            alt={char.name}
                            className="w-6 h-6 rounded-sm object-cover border border-gray-700/60 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-gray-400 group-hover/persona:text-gray-200 font-medium truncate transition-colors">{char.name}</div>
                            <div className="text-[8px] text-gray-600 truncate">{char.description.slice(0, 30)}...</div>
                          </div>
                          <UserRound className="w-2.5 h-2.5 text-amber-400/40 shrink-0" />
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
              <div className="flex flex-col gap-0.5 mb-2 pl-2 min-w-0">
                {componentGroups.map((group) => (
                  <div key={group.category}>
                    <button
                      onClick={() => toggleSub(group.category)}
                      className="flex items-center gap-1 px-1 py-1 text-[9px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors w-full"
                    >
                      {openSubs[group.category] ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                      {group.category}
                    </button>

                    {openSubs[group.category] && (
                      <div className="flex flex-col gap-0.5 mb-1">
                        {group.items.map((item) => {
                          const Icon = resolveIcon(item.icon);
                          return (
                            <div
                              key={item.type}
                              draggable
                              onDragStart={(e) => onDragStart(e, item.type)}
                              className="group/card flex items-center gap-2 px-2 py-1.5 rounded-sm border-l-2 border-transparent bg-gray-900/30 hover:bg-gray-800/60 hover:border-l-current cursor-grab active:cursor-grabbing transition-all duration-150"
                            >
                              {Icon && <Icon className={`w-3.5 h-3.5 text-${item.color}-400 shrink-0 group-hover/card:scale-110 transition-transform`} />}
                              <span className="text-[11px] text-gray-400 group-hover/card:text-gray-200 transition-colors truncate">{item.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto text-[10px] text-gray-600 text-center pt-2">
              Drag onto canvas
            </div>
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
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
            >
              <ControlButton
                onClick={() => setShowHelp((v) => !v)}
                title="Canvas Help"
                className="!border-t !border-gray-700 !order-[-1]"
              >
                <HelpCircle className="!w-4 !h-4 !fill-none" />
              </ControlButton>
            </Controls>

            {/* Help popup */}
            {showHelp && (
              <div className="absolute bottom-4 left-16 z-50">
                <div className="w-[540px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 text-xs text-gray-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Canvas Controls</h3>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-0.5 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <section>
                      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Navigation</h4>
                      <div className="space-y-1">
                        <Shortcut keys="Scroll" desc="Zoom in / out" />
                        <Shortcut keys="Click + Drag" desc="Pan canvas" />
                        <Shortcut keys="Fit View" desc="Button in toolbar (left)" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Selection</h4>
                      <div className="space-y-1">
                        <Shortcut keys="Click" desc="Select a node" />
                        <Shortcut keys="Shift + Click" desc="Add / remove from selection" />
                        <Shortcut keys="Shift + Drag" desc="Box select multiple nodes" />
                        <Shortcut keys="Backspace / Delete" desc="Remove selected nodes" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Connections</h4>
                      <div className="space-y-1">
                        <Shortcut keys="Drag handle" desc="Create a connection" />
                        <Shortcut keys="Double-click edge" desc="Remove a connection" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Keyboard Shortcuts</h4>
                      <div className="space-y-1">
                        <Shortcut keys="Ctrl + Z" desc="Undo" />
                        <Shortcut keys="Ctrl + Shift + Z" desc="Redo" />
                        <Shortcut keys="Ctrl + T" desc="New flow tab" />
                        <Shortcut keys="Ctrl + W" desc="Close current tab" />
                        <Shortcut keys="Ctrl + Tab" desc="Next / previous tab" />
                      </div>
                    </section>

                    <section className="col-span-2">
                      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nodes</h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <Shortcut keys="Drag from sidebar" desc="Add a node to canvas" />
                        <Shortcut keys="Play button ▶" desc="Run node + downstream" />
                        <Shortcut keys="+ handle" desc="Add adapter input (personas)" />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}

          </ReactFlow>
        </div>
      </div>
      </div>
    </div>
  );
}
