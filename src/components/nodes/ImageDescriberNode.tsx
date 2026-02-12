import { useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { ScanEye } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { useFlowStore } from "@/store/flow-store";

export function ImageDescriberNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const image = (data.image as string) || "";
  const userProviderId = data.providerId as string | undefined;
  const userModel = data.model as string | undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative">
      <BaseNode
        title="Image Describer"
        icon={<ScanEye className="w-4 h-4 text-pink-400" />}
        color="ring-pink-500/30"
        hasInput={false}
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
          icon={<ScanEye className="w-4 h-4 text-gray-500" />}
          placeholder="Upload Image"
          alt="Image to describe"
          accentColor="pink"
        />
      </BaseNode>
      {settingsOpen && (
        <NodeSettingsPopover
          nodeType="imageDescriber"
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
