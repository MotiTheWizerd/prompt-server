"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { NODE_MODEL_DEFAULTS } from "@/lib/model-defaults";
import { GeneralDropdown } from "@/components/shared/GeneralDropdown";

interface ProviderInfo {
  id: string;
  name: string;
  models?: { id: string; name: string }[];
}

// Module-level cache keyed by endpoint
const providerCache = new Map<string, ProviderInfo[]>();

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
  const endpoint = isImageNode ? "/api/image-providers" : "/api/providers";
  const defaults = NODE_MODEL_DEFAULTS[nodeType];
  const activeProviderId = providerId || defaults?.providerId || (isImageNode ? "huggingface" : "mistral");
  const activeModel = model || defaults?.model || "";

  // Fetch providers
  const [providers, setProviders] = useState<ProviderInfo[]>(
    providerCache.get(endpoint) || []
  );

  useEffect(() => {
    if (providerCache.has(endpoint)) return;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        providerCache.set(endpoint, data.providers);
        setProviders(data.providers);
      })
      .catch(() => {});
  }, [endpoint]);

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const models = activeProvider?.models ?? [];

  const providerOptions = providers.map((p) => ({ value: p.id, label: p.name }));
  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }));

  const handleProviderChange = useCallback(
    (pid: string) => {
      onProviderChange(pid);
      onModelChange("");
    },
    [onProviderChange, onModelChange]
  );

  // Close on outside click / escape
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

      <div className="space-y-2">
        {/* Provider */}
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-gray-500 uppercase tracking-wider w-14 shrink-0">
            Provider
          </label>
          <GeneralDropdown
            options={providerOptions}
            value={activeProviderId}
            onChange={handleProviderChange}
          />
        </div>

        {/* Model */}
        {activeProviderId !== "claude" && modelOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[9px] text-gray-500 uppercase tracking-wider w-14 shrink-0">
              Model
            </label>
            <GeneralDropdown
              options={modelOptions}
              value={activeModel}
              onChange={onModelChange}
            />
          </div>
        )}

        {activeProviderId === "claude" && (
          <div className="text-[9px] text-gray-500 italic pl-16">
            Claude CLI — auto
          </div>
        )}
      </div>
    </div>
  );
}
