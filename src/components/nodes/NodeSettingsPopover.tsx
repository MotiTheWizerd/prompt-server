"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { NODE_MODEL_DEFAULTS } from "@/lib/model-defaults";
import { ProviderModelSelect } from "@/components/shared/ProviderModelSelect";

interface NodeSettingsPopoverProps {
  nodeType: string;
  providerId?: string;
  model?: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (model: string) => void;
  onClose: () => void;
}

export function NodeSettingsPopover({
  nodeType,
  providerId,
  model,
  onProviderChange,
  onModelChange,
  onClose,
}: NodeSettingsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const isImageNode = nodeType === "imageGenerator";
  const defaults = NODE_MODEL_DEFAULTS[nodeType];
  const activeProviderId = providerId || defaults?.providerId || (isImageNode ? "huggingface" : "mistral");
  const activeModel = model || defaults?.model || "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="nodrag nowheel absolute bottom-full left-0 mb-1 z-50 w-52 bg-gray-800 border border-gray-600 rounded-lg shadow-xl shadow-black/50 p-2.5"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Settings
        </span>
        <button
          onClick={onClose}
          className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <ProviderModelSelect
        providerId={activeProviderId}
        model={activeModel}
        onProviderChange={onProviderChange}
        onModelChange={onModelChange}
        endpoint={isImageNode ? "/api/image-providers" : "/api/providers"}
      />
    </div>
  );
}
