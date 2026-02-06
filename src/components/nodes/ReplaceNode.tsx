import { type NodeProps } from "@xyflow/react";
import { Replace } from "lucide-react";
import { BaseNode } from "./BaseNode";

export function ReplaceNode({ data }: NodeProps) {
  const prompt = (data.prompt as string) || "";

  return (
    <BaseNode
      title="Replace / Generate"
      icon={<Replace className="w-4 h-4 text-purple-400" />}
      color="ring-purple-500/30"
    >
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500">
          Description + target → generation prompt
        </div>
        {prompt ? (
          <div className="text-xs text-gray-300 line-clamp-3 bg-gray-800/60 rounded p-2">
            {prompt}
          </div>
        ) : (
          <div className="text-xs text-gray-600 italic">No output yet</div>
        )}
      </div>
    </BaseNode>
  );
}
