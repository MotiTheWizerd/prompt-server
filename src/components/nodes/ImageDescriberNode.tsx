import { type NodeProps } from "@xyflow/react";
import { useRef } from "react";
import { ScanEye, X } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

export function ImageDescriberNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const image = (data.image as string) || "";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNodeData(id, { image: reader.result as string });
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <BaseNode
      title="Image Describer"
      icon={<ScanEye className="w-4 h-4 text-pink-400" />}
      color="ring-pink-500/30"
      hasInput={false}
      status={status}
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
              alt="Image to describe"
              className="w-full h-28 object-cover rounded-lg border border-gray-700"
            />
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
            className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-gray-600 rounded-lg hover:border-pink-500/50 hover:bg-pink-500/5 transition-colors cursor-pointer gap-1"
          >
            <ScanEye className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] text-gray-500">Upload Image</span>
          </button>
        )}
      </div>
    </BaseNode>
  );
}
