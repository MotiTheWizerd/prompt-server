import { useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { Shrink } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";

export function CompressorNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const userProviderId = data.providerId as string | undefined;
  const userModel = data.model as string | undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative">
      <BaseNode
        title="Compressor"
        icon={<Shrink className="w-4 h-4 text-teal-400" />}
        color="ring-teal-500/30"
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
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
      {settingsOpen && (
        <NodeSettingsPopover
          nodeType="compressor"
          providerId={userProviderId}
          model={userModel}
          onProviderChange={(pid) => updateNodeData(id, { providerId: pid })}
          onModelChange={(m) => updateNodeData(id, { model: m || undefined })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
