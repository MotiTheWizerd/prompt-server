"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
          <Settings className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Configure API keys, providers, and application preferences.
        </p>
        <span className="text-xs text-gray-600 border border-gray-800 rounded-full px-3 py-1">
          Coming soon
        </span>
      </div>
    </div>
  );
}
