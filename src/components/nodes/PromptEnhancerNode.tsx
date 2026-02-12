import { useState, useEffect } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";

export function PromptEnhancerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const updateNodeInternals = useUpdateNodeInternals();
  const notes = (data.notes as string) || "";
  const adapterCount = (data.adapterCount as number) || 0;
  const maxTokens = (data.maxTokens as number) || 1500;
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Tell React Flow to re-detect handles when adapter count changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, adapterCount, updateNodeInternals]);

  return (
    <div className="relative">
      <BaseNode
        title="Prompt Enhancer"
        icon={<Sparkles className="w-4 h-4 text-violet-400" />}
        color="ring-violet-500/30"
        adapterCount={adapterCount}
        onAdapterAdd={() => updateNodeData(id, { adapterCount: adapterCount + 1 })}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onTrigger={() => runFromNode(id)}
        usesLLM
        status={status}
        errorMessage={errorMessage}
        outputText={outputText}
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
      {settingsOpen && (
        <NodeSettingsPopover
          adapterCount={adapterCount}
          onAdapterCountChange={(count) => updateNodeData(id, { adapterCount: count })}
          maxTokens={maxTokens}
          onMaxTokensChange={(tokens) => updateNodeData(id, { maxTokens: tokens })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
