import { type NodeProps } from "@xyflow/react";
import { useState } from "react";
import { FileText, Copy, Check } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function TextOutputNode({ id, data }: NodeProps) {
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const text = (data.text as string) || "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BaseNode
      title="Text Output"
      icon={<FileText className="w-4 h-4 text-emerald-400" />}
      color="ring-emerald-500/30"
      hasOutput={false}
      onTrigger={() => runFromNode(id)}
      status={status}
      errorMessage={errorMessage}
      headerExtra={text ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="p-1 text-gray-500 hover:text-emerald-400 transition-colors rounded"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      ) : undefined}
    >
      <div className="w-full min-h-[80px] max-h-[160px] overflow-auto bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-300 whitespace-pre-wrap break-words">
        {text || <span className="text-gray-600 italic">Waiting for output...</span>}
      </div>
    </BaseNode>
  );
}
