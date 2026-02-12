"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";

export function TabBar() {
  const flowIds = useFlowStore((s) => s.flowIds);
  const activeFlowId = useFlowStore((s) => s.activeFlowId);
  const flows = useFlowStore((s) => s.flows);
  const switchFlow = useFlowStore((s) => s.switchFlow);
  const createFlow = useFlowStore((s) => s.createFlow);
  const closeFlow = useFlowStore((s) => s.closeFlow);
  const renameFlow = useFlowStore((s) => s.renameFlow);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);

  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Double-click to rename
  const handleDoubleClick = useCallback((flowId: string) => {
    setEditingId(flowId);
  }, []);

  // Commit rename on blur or Enter
  const handleRenameCommit = useCallback(
    (flowId: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed) renameFlow(flowId, trimmed);
      setEditingId(null);
    },
    [renameFlow]
  );

  // Middle-click to close
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, flowId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        closeFlow(flowId);
      }
    },
    [closeFlow]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip flow-level undo/redo when typing in text inputs (let browser handle natively)
      const inTextInput =
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement;

      // Ctrl+Z: undo
      if (e.ctrlKey && !e.shiftKey && e.key === "z" && !inTextInput) {
        e.preventDefault();
        undo();
        return;
      }
      // Ctrl+Shift+Z / Ctrl+Y: redo
      if (
        ((e.ctrlKey && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
          (e.ctrlKey && e.key === "y")) &&
        !inTextInput
      ) {
        e.preventDefault();
        redo();
        return;
      }
      // Ctrl+T: new tab
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        createFlow();
      }
      // Ctrl+W: close current tab
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        closeFlow(activeFlowId);
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle tabs
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const idx = flowIds.indexOf(activeFlowId);
        const next = e.shiftKey
          ? flowIds[(idx - 1 + flowIds.length) % flowIds.length]
          : flowIds[(idx + 1) % flowIds.length];
        switchFlow(next);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFlowId, flowIds, createFlow, closeFlow, switchFlow, undo, redo]);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-950 border-b border-gray-800 overflow-x-auto">
      {flowIds.map((flowId) => {
        const flow = flows[flowId];
        if (!flow) return null;
        const isActive = flowId === activeFlowId;
        const isRunning = flow.execution.isRunning;

        return (
          <div
            key={flowId}
            onClick={() => switchFlow(flowId)}
            onMouseDown={(e) => handleMouseDown(e, flowId)}
            onDoubleClick={() => handleDoubleClick(flowId)}
            className={`
              group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer
              border border-b-0 transition-colors select-none min-w-0
              ${
                isActive
                  ? "bg-gray-900 border-gray-700 text-gray-200"
                  : "bg-gray-950 border-transparent text-gray-500 hover:text-gray-400 hover:bg-gray-900/50"
              }
            `}
          >
            {/* Running indicator dot */}
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}

            {/* Dirty indicator */}
            {flow.isDirty && !isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
            )}

            {/* Tab name (editable on double-click) */}
            {editingId === flowId ? (
              <input
                ref={inputRef}
                defaultValue={flow.name}
                onBlur={(e) => handleRenameCommit(flowId, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleRenameCommit(flowId, e.currentTarget.value);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="bg-transparent text-xs text-gray-200 outline-none w-20"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[120px]">{flow.name}</span>
            )}

            {/* Close button (only if more than 1 tab) */}
            {flowIds.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFlow(flowId);
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={() => createFlow()}
        className="flex items-center justify-center w-6 h-6 rounded text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-colors shrink-0"
        title="New flow (Ctrl+T)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
