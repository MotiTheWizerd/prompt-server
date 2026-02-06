import { type NodeProps } from "@xyflow/react";
import { MessageSquareText } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function InitialPromptNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");
  const text = (data.text as string) || "";

  return (
    <BaseNode
      title="Initial Prompt"
      icon={<MessageSquareText className="w-4 h-4 text-cyan-400" />}
      color="ring-cyan-500/30"
      hasInput={false}
      status={status}
    >
      <textarea
        value={text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Enter your prompt..."
        rows={5}
        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-transparent"
      />
    </BaseNode>
  );
}
