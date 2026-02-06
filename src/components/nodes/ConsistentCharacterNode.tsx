import { type NodeProps } from "@xyflow/react";
import { useRef } from "react";
import { UserRound, ImagePlus, X, Crosshair, MessageSquareText } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useFlowStore } from "@/store/flow-store";

function ImageUpload({
  image,
  onUpload,
  onRemove,
  label,
  icon,
  accentClass,
}: {
  image: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          onUpload(e);
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="hidden"
      />
      {image ? (
        <div className="relative group">
          <img
            src={image}
            alt={label}
            className="w-full h-24 object-cover rounded-lg border border-gray-700"
          />
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-medium text-white/80 bg-gray-900/70 px-1.5 py-0.5 rounded">
            {label}
          </span>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-full h-20 border border-dashed border-gray-600 rounded-lg ${accentClass} transition-colors cursor-pointer gap-1`}
        >
          {icon}
          <span className="text-[10px] text-gray-500">{label}</span>
        </button>
      )}
    </div>
  );
}

export function ConsistentCharacterNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = useFlowStore((s) => s.execution.nodeStatus[id] || "idle");
  const hasIncomingEdge = useFlowStore((s) => s.edges.some((e) => e.target === id));

  const image = (data.image as string) || "";
  const targetImage = (data.targetImage as string) || "";

  const handleUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNodeData(id, { [key]: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <BaseNode
      title="Consistent Character"
      icon={<UserRound className="w-4 h-4 text-amber-400" />}
      color="ring-amber-500/30"
      hasInput={true}
      status={status}
    >
      <div className="space-y-2.5">
        {/* Two image uploads side by side */}
        <div className="grid grid-cols-2 gap-2">
          <ImageUpload
            image={image}
            onUpload={handleUpload("image")}
            onRemove={() => updateNodeData(id, { image: "" })}
            label="Character"
            icon={<UserRound className="w-4 h-4 text-gray-500" />}
            accentClass="hover:border-amber-500/50 hover:bg-amber-500/5"
          />
          <ImageUpload
            image={targetImage}
            onUpload={handleUpload("targetImage")}
            onRemove={() => updateNodeData(id, { targetImage: "" })}
            label="Target"
            icon={<Crosshair className="w-4 h-4 text-gray-500" />}
            accentClass="hover:border-blue-500/50 hover:bg-blue-500/5"
          />
        </div>

        {/* Mode indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/40 border border-gray-700/50">
          {targetImage ? (
            <>
              <Crosshair className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-400/80">Image Mode</span>
            </>
          ) : hasIncomingEdge ? (
            <>
              <MessageSquareText className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400/80">Text Mode</span>
            </>
          ) : (
            <span className="text-[10px] text-gray-600 italic">
              Upload target or connect text
            </span>
          )}
        </div>
      </div>
    </BaseNode>
  );
}
