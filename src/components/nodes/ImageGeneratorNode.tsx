import { type NodeProps } from "@xyflow/react";
import { ImageIcon, Maximize2 } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function ImageGeneratorNode({ id }: NodeProps) {
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const openLightbox = useFlowStore((s) => s.openLightbox);
  const status = useFlowStore(
    (s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle"
  );
  const errorMessage = useFlowStore(
    (s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error
  );
  const outputText = useFlowStore(
    (s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text
  );
  const outputImage = useFlowStore(
    (s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.image
  );

  return (
    <BaseNode
      title="Image Generator"
      icon={<ImageIcon className="w-4 h-4 text-fuchsia-400" />}
      color="ring-fuchsia-500/30"
      onTrigger={() => runFromNode(id)}
      status={status}
      errorMessage={errorMessage}
      outputText={outputText}
    >
      <div className="text-[10px] text-gray-500">
        Generates image from upstream prompt
      </div>
      {outputImage && status === "complete" && (
        <div className="relative group mt-2 rounded overflow-hidden border border-white/10">
          <img
            src={outputImage}
            alt="Generated"
            className="w-full h-auto max-h-48 object-contain bg-black/20"
          />
          <button
            onClick={() => openLightbox(outputImage)}
            className="absolute bottom-1.5 left-1.5 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </BaseNode>
  );
}
