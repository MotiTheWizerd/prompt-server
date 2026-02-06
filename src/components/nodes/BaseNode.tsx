import { Handle, Position } from "@xyflow/react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { NodeExecutionStatus } from "@/lib/engine/types";

interface BaseNodeProps {
  title: string;
  icon: ReactNode;
  color: string; // tailwind ring color class e.g. "ring-blue-500/40"
  children: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  status?: NodeExecutionStatus;
}

const statusRingClass: Record<NodeExecutionStatus, string> = {
  idle: "",
  pending: "ring-gray-400/40 animate-pulse",
  running: "ring-blue-500/60 animate-pulse",
  complete: "ring-emerald-500/60",
  error: "ring-red-500/60",
  skipped: "ring-gray-500/20 opacity-60",
};

export function BaseNode({
  title,
  icon,
  color,
  children,
  hasInput = true,
  hasOutput = true,
  status = "idle",
}: BaseNodeProps) {
  const ringClass = status === "idle" ? color : statusRingClass[status];

  return (
    <div
      className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/40 min-w-[220px] max-w-[280px] ring-1 ${ringClass}`}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-purple-500 !border-2 !border-gray-900"
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/60">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {title}
        </span>
        {status === "running" && (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin ml-auto" />
        )}
        {status === "error" && (
          <span className="w-2 h-2 rounded-full bg-red-500 ml-auto" />
        )}
        {status === "complete" && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 ml-auto" />
        )}
      </div>

      <div className="p-3 text-sm text-gray-400">{children}</div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-gray-900"
        />
      )}
    </div>
  );
}
