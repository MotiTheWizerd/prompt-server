"use client";

import { useState, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface DropdownOption {
  value: string;
  label: string;
}

interface GeneralDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  popoverWidth?: string;
}

export function GeneralDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  popoverWidth = "w-44",
}: GeneralDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (selected: string) => {
      onChange(selected);
      setOpen(false);
    },
    [onChange]
  );

  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex-1 flex items-center justify-between gap-1 bg-gray-700/40 border border-gray-600/50 rounded px-1.5 py-1 text-[10px] text-gray-300 hover:bg-gray-700/60 transition-colors cursor-pointer min-w-0",
            className
          )}
        >
          <span className="truncate">{activeLabel ?? placeholder}</span>
          <ChevronDown className="w-2.5 h-2.5 text-gray-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 bg-gray-800 border-gray-600", popoverWidth)}
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent">
          <CommandList className="max-h-40">
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={handleSelect}
                  className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-300 cursor-pointer data-[selected=true]:bg-gray-700/60 data-[selected=true]:text-gray-200 rounded-sm"
                >
                  <Check
                    className={cn(
                      "w-2.5 h-2.5 shrink-0",
                      value === o.value ? "opacity-100 text-blue-400" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
