import { useState, useEffect } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";

export function StoryTellerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const updateNodeInternals = useUpdateNodeInternals();

  const idea = (data.idea as string) || "";
  const tags = (data.tags as string) || "";
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
        title="Story Teller"
        icon={<BookOpen className="w-4 h-4 text-amber-400" />}
        color="ring-amber-500/30"
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
