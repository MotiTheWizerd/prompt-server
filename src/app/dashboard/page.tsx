"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageSquareText,
  Sparkles,
  Languages,
  Group,
  Play,
  LogOut,
  UserRound,
  FileText,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { nodeTypes } from "@/components/nodes";

const sidebarNodes = [
  { type: "group", label: "Group", icon: Group, color: "text-gray-400" },
  { type: "initialPrompt", label: "Initial Prompt", icon: MessageSquareText, color: "text-cyan-400" },
  { type: "promptEnhancer", label: "Prompt Enhancer", icon: Sparkles, color: "text-violet-400" },
  { type: "translator", label: "Translator", icon: Languages, color: "text-orange-400" },
  { type: "consistentCharacter", label: "Consistent Character", icon: UserRound, color: "text-amber-400" },
  { type: "textOutput", label: "Text Output", icon: FileText, color: "text-emerald-400" },
];

let nodeId = 100;

export default function Dashboard() {
  return (
    <ReactFlowProvider>
      <DashboardInner />
    </ReactFlowProvider>
  );
}

function DashboardInner() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setHoveredGroupId,
    setNodeParent,
    removeNodeFromGroup,
    execution,
    runPipeline,
    setProviderId,
  } = useFlowStore();
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();

  useEffect(() => {
    if (sessionStorage.getItem("authenticated") !== "true") {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("authenticated");
    router.replace("/");
  };

  // --- Sidebar drag-and-drop (simple: always creates top-level node) ---

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
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

      const newNode: Node = {
        id: `${type}-${nodeId++}`,
        type,
        position,
        data: { label: isGroup ? "Group" : type },
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
      // Don't try to parent a group inside another group
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
        // Node was dropped onto a group → attach it
        if (node.parentId !== group.id) {
          setNodeParent(node.id, group.id);
        }
      } else if (node.parentId) {
        // Node was dragged out of its group → detach it
        removeNodeFromGroup(node.id);
      }
    },
    [getIntersectingNodes, setHoveredGroupId, setNodeParent, removeNodeFromGroup]
  );

  if (!ready) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Prompt Creator
          </h1>
          <div className="h-5 w-px bg-gray-700" />

          {/* Provider selector */}
          <select
            value={execution.providerId}
            onChange={(e) => setProviderId(e.target.value)}
            disabled={execution.isRunning}
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
          >
            <option value="mistral">Mistral AI</option>
            <option value="glm">GLM (Zhipu)</option>
            <option value="claude">Claude (CLI)</option>
          </select>

          {/* Run button */}
          <button
            onClick={runPipeline}
            disabled={execution.isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {execution.isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {execution.isRunning ? "Running..." : "Run Pipeline"}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      </header>

      {/* Global error banner */}
      {execution.globalError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-950/60 border-b border-red-900/50 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{execution.globalError}</span>
          <button
            onClick={() => useFlowStore.getState().resetExecution()}
            className="ml-auto p-0.5 hover:text-red-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-gray-800 bg-gray-950/60 p-3 flex flex-col gap-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Nodes
          </div>
          {sidebarNodes.map((item) => (
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

          <div className="mt-auto text-[10px] text-gray-600 text-center">
            Drag nodes onto the canvas
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
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
