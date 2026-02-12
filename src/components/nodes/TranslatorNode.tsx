import { type NodeProps } from "@xyflow/react";
import { Languages } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";
import { LanguageSelect } from "@/components/shared/LanguageSelect";

export function TranslatorNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const language = (data.language as string) || "";

  return (
    <BaseNode
      title="Translator"
      icon={<Languages className="w-4 h-4 text-orange-400" />}
      color="ring-orange-500/30"
      onTrigger={() => runFromNode(id)}
      usesLLM
      status={status}
      errorMessage={errorMessage}
      outputText={outputText}
    >
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500">
          Translate prompt to target language
        </div>
        <LanguageSelect
          value={language}
          onChange={(code) => updateNodeData(id, { language: code })}
          placeholder="Target language"
        />
      </div>
    </BaseNode>
  );
}
