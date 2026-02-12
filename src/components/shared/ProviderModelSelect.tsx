"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { ProviderModel } from "@/lib/providers";

interface ProviderInfo {
  id: string;
  name: string;
  supportsVision?: boolean;
  models?: ProviderModel[];
}

interface ProviderModelSelectProps {
  providerId: string;
  model: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (model: string) => void;
  endpoint?: string; // API endpoint to fetch providers from (default: "/api/providers")
}

// Module-level cache keyed by endpoint so we fetch once per source
const providerCache = new Map<string, ProviderInfo[]>();

export function ProviderModelSelect({
  providerId,
  model,
  onProviderChange,
  onModelChange,
  endpoint = "/api/providers",
}: ProviderModelSelectProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>(
    providerCache.get(endpoint) || []
  );
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

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

  const activeProvider = providers.find((p) => p.id === providerId);
  const models = activeProvider?.models ?? [];
  const activeModelObj = models.find((m) => m.id === model);

  const handleProviderSelect = useCallback(
    (pid: string) => {
      onProviderChange(pid);
      onModelChange("");
      setProviderOpen(false);
    },
    [onProviderChange, onModelChange]
  );

  const handleModelSelect = useCallback(
    (mid: string) => {
      onModelChange(mid);
      setModelOpen(false);
    },
    [onModelChange]
  );

  return (
    <div className="space-y-2">
      {/* Provider */}
      <div className="flex items-center gap-2">
        <label className="text-[9px] text-gray-500 uppercase tracking-wider w-14 shrink-0">
          Provider
        </label>
        <Popover open={providerOpen} onOpenChange={setProviderOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-between gap-1 bg-gray-700/40 border border-gray-600/50 rounded px-1.5 py-1 text-[10px] text-gray-300 hover:bg-gray-700/60 transition-colors cursor-pointer min-w-0">
              <span className="truncate">{activeProvider?.name ?? "Select..."}</span>
              <ChevronDown className="w-2.5 h-2.5 text-gray-500 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-44 p-0 bg-gray-800 border-gray-600"
            side="bottom"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command className="bg-transparent">
              <CommandList className="max-h-40">
                <CommandGroup>
                  {providers.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={handleProviderSelect}
                      className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-300 cursor-pointer data-[selected=true]:bg-gray-700/60 data-[selected=true]:text-gray-200 rounded-sm"
                    >
                      <Check
                        className={cn(
                          "w-2.5 h-2.5 shrink-0",
                          providerId === p.id ? "opacity-100 text-blue-400" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{p.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Model */}
      {providerId !== "claude" && models.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-gray-500 uppercase tracking-wider w-14 shrink-0">
            Model
          </label>
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center justify-between gap-1 bg-gray-700/40 border border-gray-600/50 rounded px-1.5 py-1 text-[10px] text-gray-300 hover:bg-gray-700/60 transition-colors cursor-pointer min-w-0">
                <span className="truncate">{activeModelObj?.name ?? (model || "Select...")}</span>
                <ChevronDown className="w-2.5 h-2.5 text-gray-500 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-44 p-0 bg-gray-800 border-gray-600"
              side="bottom"
              align="start"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command className="bg-transparent">
                <CommandList className="max-h-40">
                  <CommandGroup>
                    {models.map((m) => (
                      <CommandItem
                        key={m.id}
                        value={m.id}
                        onSelect={handleModelSelect}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-300 cursor-pointer data-[selected=true]:bg-gray-700/60 data-[selected=true]:text-gray-200 rounded-sm"
                      >
                        <Check
                          className={cn(
                            "w-2.5 h-2.5 shrink-0",
                            model === m.id ? "opacity-100 text-blue-400" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{m.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {providerId === "claude" && (
        <div className="text-[9px] text-gray-500 italic pl-16">
          Claude CLI — auto
        </div>
      )}
    </div>
  );
}
