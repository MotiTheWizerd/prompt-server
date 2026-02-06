import { type NodeProps } from "@xyflow/react";
import { FileOutput } from "lucide-react";
import { BaseNode } from "./BaseNode";

export function OutputNode({ data }: NodeProps) {
  const result = (data.result as string) || "";

  return (
    <BaseNode
      title="Output"
      icon={<FileOutput className="w-4 h-4 text-amber-400" />}
      color="ring-amber-500/30"
      hasOutput={false}
    >
      <div className="space-y-2">
        {result ? (
          <div className="text-xs text-gray-300 bg-gray-800/60 rounded p-2 max-h-24 overflow-auto">
            {result}
          </div>
        ) : (
          <div className="text-xs text-gray-600 italic">
            Waiting for pipeline...
          </div>
        )}
      </div>
    </BaseNode>
  );
}
