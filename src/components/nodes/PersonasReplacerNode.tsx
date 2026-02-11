import { useState, useEffect, useRef } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { UserRoundPen, X, Maximize2 } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";
import { prepareImageForAPI } from "@/lib/image-utils";

export function PersonasReplacerNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const openLightbox = useFlowStore((s) => s.openLightbox);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const updateNodeInternals = useUpdateNodeInternals();
  const adapterCount = (data.adapterCount as number) || 1;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const image = (data.image as string) || "";

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, adapterCount, updateNodeInternals]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await prepareImageForAPI(reader.result as string);
      updateNodeData(id, { image: resized });
    };
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative">
      <BaseNode
        title="Personas Replacer"
        icon={<UserRoundPen className="w-4 h-4 text-rose-400" />}
        color="ring-rose-500/30"
        adapterCount={adapterCount}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        status={status}
        errorMessage={errorMessage}
        outputText={outputText}
      >
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          {image ? (
            <div className="relative group">
              <img
                src={image}
                alt="Target image"
                className="w-full h-28 object-cover rounded-lg border border-gray-700"
              />
              <button
                onClick={() => openLightbox(image)}
                className="absolute bottom-1.5 left-1.5 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => updateNodeData(id, { image: "" })}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-gray-600 rounded-lg hover:border-rose-500/50 hover:bg-rose-500/5 transition-colors cursor-pointer gap-1"
            >
              <UserRoundPen className="w-4 h-4 text-gray-500" />
              <span className="text-[10px] text-gray-500">Upload image or connect upstream</span>
            </button>
          )}
        </div>
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
