import { useState, useEffect } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { UserRoundPen } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { useFlowStore } from "@/store/flow-store";

export function PersonasReplacerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const updateNodeInternals = useUpdateNodeInternals();
  const adapterCount = (data.adapterCount as number) || 1;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const image = (data.image as string) || "";

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, adapterCount, updateNodeInternals]);

  return (
    <div className="relative">
      <BaseNode
        title="Personas Replacer"
        icon={<UserRoundPen className="w-4 h-4 text-rose-400" />}
        color="ring-rose-500/30"
        adapterCount={adapterCount}
        onAdapterAdd={() => updateNodeData(id, { adapterCount: adapterCount + 1 })}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onTrigger={() => runFromNode(id)}
        usesLLM
        status={status}
        errorMessage={errorMessage}
        outputText={outputText}
      >
        <ImageUpload
          image={image}
          onImageChange={(img) => updateNodeData(id, { image: img })}
          icon={<UserRoundPen className="w-4 h-4 text-gray-500" />}
          placeholder="Upload image or connect upstream"
          alt="Target image"
          accentColor="rose"
        />
      </BaseNode>
      {settingsOpen && (
        <NodeSettingsPopover
          adapterCount={adapterCount}
          onAdapterCountChange={(count) => updateNodeData(id, { adapterCount: count })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
