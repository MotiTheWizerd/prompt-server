import { type NodeProps } from "@xyflow/react";
import { SpellCheck } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function GrammarFixNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const style = (data.style as string) || "";

  return (
    <BaseNode
      title="Grammar Fix"
      icon={<SpellCheck className="w-4 h-4 text-green-400" />}
      color="ring-green-500/30"
      onTrigger={() => runFromNode(id)}
      usesLLM
      status={status}
      errorMessage={errorMessage}
      outputText={outputText}
    >
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500">
          Fix grammar &amp; typos (English)
        </div>
        <select
          value={style}
          onChange={(e) => updateNodeData(id, { style: e.target.value })}
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500/50"
        >
          <option value="">Standard</option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="creative">Creative</option>
        </select>
      </div>
    </BaseNode>
  );
}
