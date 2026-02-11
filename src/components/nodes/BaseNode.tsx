import { Handle, Position } from "@xyflow/react";
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Check, Loader2, Play, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { NodeExecutionStatus } from "@/lib/engine/types";

interface BaseNodeProps {
  title: string;
  icon: ReactNode;
  color: string; // tailwind ring color class e.g. "ring-blue-500/40"
  children: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  adapterCount?: number; // 0–5 top handles
  hasAdapterOutput?: boolean; // bottom handle for adapter sources
  onSettingsClick?: () => void;
  onTrigger?: () => void; // show play button when provided (trigger source node)
  status?: NodeExecutionStatus;
  errorMessage?: string;
  outputText?: string; // execution result preview
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
  adapterCount = 0,
  hasAdapterOutput = false,
  onSettingsClick,
  onTrigger,
  status = "idle",
  errorMessage,
  outputText,
}: BaseNodeProps) {
  const [outputOpen, setOutputOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ringClass = status === "idle" ? color : statusRingClass[status];

  return (
    <div
      className={`relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/40 min-w-[220px] max-w-[280px] ring-1 ${ringClass}`}
    >
      {/* Adapter input handles (top) */}
      {Array.from({ length: adapterCount }, (_, i) => (
        <Handle
          key={`adapter-${i}`}
          type="target"
          position={Position.Top}
          id={`adapter-${i}`}
          className="!w-3 !h-3 !bg-red-500 !border-2 !border-gray-900"
          style={{
            left: `${((i + 1) / (adapterCount + 1)) * 100}%`,
          }}
        />
      ))}

      {/* Text input handle (left) */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="text-in"
          className="!w-3 !h-3 !bg-purple-500 !border-2 !border-gray-900"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/60">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {onTrigger && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrigger();
              }}
              disabled={status === "running" || status === "pending"}
              className="p-0.5 text-emerald-500/70 hover:text-emerald-400 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {onSettingsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick();
              }}
              className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
          {status === "running" && (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          )}
          {status === "error" && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
          {status === "complete" && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </div>
      </div>

      <div className="p-3 text-sm text-gray-400">{children}</div>

      {/* Error banner */}
      {status === "error" && errorMessage && (
        <div className="mx-3 mb-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-2">
          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
          <span className="text-[10px] text-red-300 leading-tight break-words">
            {errorMessage}
          </span>
        </div>
      )}

      {/* Output preview */}
      {status === "complete" && outputText && (
        <div className="mx-3 mb-3">
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={(e) => { e.stopPropagation(); setOutputOpen(!outputOpen); }}
              className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-300 transition-colors flex-1 min-w-0"
            >
              {outputOpen ? <ChevronDown className="w-2.5 h-2.5 shrink-0" /> : <ChevronRight className="w-2.5 h-2.5 shrink-0" />}
              Output
              <span className="ml-auto text-gray-500 font-normal">{outputText.length.toLocaleString()} chars</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(outputText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
              title="Copy output"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          </div>
          {outputOpen && (
            <div className="mt-1 rounded-lg bg-gray-800/60 border border-gray-700/50 px-2.5 py-2 text-[10px] text-gray-400 leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words nowheel">
              {outputText}
            </div>
          )}
        </div>
      )}

      {/* Text output handle (right) */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id="text-out"
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-gray-900"
        />
      )}

      {/* Adapter output handle (bottom) */}
      {hasAdapterOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="adapter-out"
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-gray-900"
        />
      )}
    </div>
  );
}
