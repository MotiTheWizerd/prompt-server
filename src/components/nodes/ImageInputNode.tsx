import { type NodeProps } from "@xyflow/react";
import { ImagePlus } from "lucide-react";
import { BaseNode } from "./BaseNode";

export function ImageInputNode({ data }: NodeProps) {
  const images = (data.images as string[]) || [];

  return (
    <BaseNode
      title="Image Upload"
      icon={<ImagePlus className="w-4 h-4 text-emerald-400" />}
      color="ring-emerald-500/30"
      hasInput={false}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-center w-full h-16 border border-dashed border-gray-600 rounded-lg hover:border-emerald-500/50 transition-colors cursor-pointer">
          <span className="text-xs text-gray-500">
            {images.length > 0 ? `${images.length} image(s)` : "Drop images here"}
          </span>
        </div>
        <div className="text-[10px] text-gray-600">
          Persona + reference images
        </div>
      </div>
    </BaseNode>
  );
}
