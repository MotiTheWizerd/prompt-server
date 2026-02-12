"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-gray-900 !border !border-gray-700 !text-gray-200 !shadow-2xl !shadow-black/40",
      }}
    />
  );
}
