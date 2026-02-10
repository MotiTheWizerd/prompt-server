import { type NodeProps } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function StoryTellerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");

  const idea = (data.idea as string) || "";
  const tags = (data.tags as string) || "";

  return (
    <BaseNode
      title="Story Teller"
      icon={<BookOpen className="w-4 h-4 text-amber-400" />}
      color="ring-amber-500/30"
      status={status}
    >
      <div className="space-y-2">
        <textarea
          value={idea}
          onChange={(e) => updateNodeData(id, { idea: e.target.value })}
          placeholder="Your idea... (e.g. warrior in enchanted forest)"
          rows={2}
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-transparent"
        />
        <input
          type="text"
          value={tags}
          onChange={(e) => updateNodeData(id, { tags: e.target.value })}
          placeholder="Tags: cinematic, moody, fantasy..."
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-transparent"
        />
      </div>
    </BaseNode>
  );
}
