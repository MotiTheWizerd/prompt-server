import { useState, useEffect } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { MessageSquareText } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";

export function InitialPromptNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const updateNodeInternals = useUpdateNodeInternals();
  const text = (data.text as string) || "";
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
        title="Initial Prompt"
        icon={<MessageSquareText className="w-4 h-4 text-cyan-400" />}
        color="ring-cyan-500/30"
        hasInput={false}
        adapterCount={adapterCount}
        onAdapterAdd={() => updateNodeData(id, { adapterCount: adapterCount + 1 })}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onTrigger={() => runFromNode(id)}
        status={status}
        errorMessage={errorMessage}
        outputText={outputText}
      >
        <textarea
          value={text}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          placeholder="Enter your prompt..."
          rows={5}
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-transparent"
        />
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
