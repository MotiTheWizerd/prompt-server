import { type NodeProps } from "@xyflow/react";
import { Shrink } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function CompressorNode({ id }: NodeProps) {
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);

  return (
    <BaseNode
      title="Compressor"
      icon={<Shrink className="w-4 h-4 text-teal-400" />}
      color="ring-teal-500/30"
      onTrigger={() => runFromNode(id)}
      usesLLM
      status={status}
      errorMessage={errorMessage}
      outputText={outputText}
    >
      <div className="text-[10px] text-gray-500">
        Auto-compress when &gt; 2500 chars
      </div>
    </BaseNode>
  );
}
