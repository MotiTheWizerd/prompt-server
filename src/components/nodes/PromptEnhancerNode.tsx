import { type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function PromptEnhancerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");
  const notes = (data.notes as string) || "";

  return (
    <BaseNode
      title="Prompt Enhancer"
      icon={<Sparkles className="w-4 h-4 text-violet-400" />}
      color="ring-violet-500/30"
      status={status}
    >
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500">
          Extra instructions to improve the prompt
        </div>
        <textarea
          value={notes}
          onChange={(e) => updateNodeData(id, { notes: e.target.value })}
          placeholder="e.g. Make it more cinematic, add lighting details..."
          rows={3}
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-transparent"
        />
      </div>
    </BaseNode>
  );
}
