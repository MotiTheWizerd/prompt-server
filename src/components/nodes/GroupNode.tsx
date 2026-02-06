import { type NodeProps, NodeResizer } from "@xyflow/react";
import { Group } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";

export function GroupNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const isHovered = useFlowStore((s) => s.hoveredGroupId === id);
  const label = (data.label as string) || "Group";

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={250}
        minHeight={150}
        lineClassName="!border-blue-500/50"
        handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-gray-900 !rounded-sm"
      />
      <div
        className={`w-full h-full rounded-xl border-2 border-dashed transition-colors duration-150 ${
          isHovered
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-600 bg-gray-800/20"
        } backdrop-blur-[2px]`}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-t-xl border-b border-gray-600/50">
          <Group className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            value={label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            className="bg-transparent text-sm font-semibold text-gray-200 outline-none placeholder-gray-500 w-full"
            placeholder="Group name"
          />
        </div>
      </div>
    </>
  );
}
