"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface Language {
  code: string;
  name: string;
}

export const languages: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "no", name: "Norwegian" },
  { code: "cs", name: "Czech" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "uk", name: "Ukrainian" },
  { code: "ro", name: "Romanian" },
  { code: "hu", name: "Hungarian" },
];

interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export function LanguageSelect({
  value,
  onChange,
  placeholder = "Select language",
  className,
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = languages.find((l) => l.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-800 transition-colors",
            !value && "text-gray-500",
            className
          )}
        >
          {selected ? selected.name : placeholder}
          <ChevronsUpDown className="ml-1.5 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 bg-gray-900 border-gray-700"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search language..."
            className="h-8 text-xs text-gray-300"
          />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-gray-500">
              No language found.
            </CommandEmpty>
            <CommandGroup>
              {languages.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={lang.name}
                  onSelect={() => {
                    onChange(lang.code);
                    setOpen(false);
                  }}
                  className="text-xs text-gray-300 aria-selected:bg-gray-800"
                >
                  {lang.name}
                  <Check
                    className={cn(
                      "ml-auto h-3 w-3",
                      value === lang.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
