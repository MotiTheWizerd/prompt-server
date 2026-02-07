import { type NodeProps } from "@xyflow/react";
import { UserRound, MessageSquareText } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function ConsistentCharacterNode({ id, data }: NodeProps) {
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");
  const hasIncomingEdge = useFlowStore((s) => s.edges.some((e) => e.target === id));

  const name = (data.characterName as string) || "Unknown";
  const description = (data.characterDescription as string) || "";
  const imagePath = (data.characterImagePath as string) || "";

  return (
    <BaseNode
      title={name}
      icon={<UserRound className="w-4 h-4 text-amber-400" />}
      color="ring-amber-500/30"
      hasInput={true}
      status={status}
    >
      <div className="space-y-2">
        {/* Character preview */}
        {imagePath && (
          <img
            src={imagePath}
            alt={name}
            className="w-full h-24 object-cover rounded-lg border border-gray-700"
          />
        )}

        {/* Description preview */}
        {description && (
          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">
            {description}
          </p>
        )}

        {/* Mode indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/40 border border-gray-700/50">
          {hasIncomingEdge ? (
            <>
              <MessageSquareText className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400/80">Text Mode</span>
            </>
          ) : (
            <>
              <UserRound className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400/80">Persona Mode</span>
            </>
          )}
        </div>
      </div>
    </BaseNode>
  );
}
