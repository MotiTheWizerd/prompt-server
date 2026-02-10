"use client";

import { useState, useEffect } from "react";

interface ProviderInfo {
  id: string;
  name: string;
  supportsVision: boolean;
}

interface ProviderSelectProps {
  value: string;
  onChange: (providerId: string) => void;
  disabled?: boolean;
  className?: string;
  /** Only show providers that support vision/image input */
  visionOnly?: boolean;
}

// Module-level cache so we fetch once across all instances
let cachedProviders: ProviderInfo[] | null = null;

export function ProviderSelect({
  value,
  onChange,
  disabled,
  className = "bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50",
  visionOnly,
}: ProviderSelectProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>(cachedProviders || []);

  useEffect(() => {
    if (cachedProviders) return;
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        cachedProviders = data.providers;
        setProviders(data.providers);
      })
      .catch(console.error);
  }, []);

  const filtered = visionOnly ? providers.filter((p) => p.supportsVision) : providers;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      {filtered.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
