import { toast as sonnerToast } from "sonner";

/** Success toast — green accent */
export function toastSuccess(message: string, description?: string) {
  sonnerToast.success(message, {
    description,
    className:
      "!bg-gray-900 !border !border-emerald-500/30 !text-gray-200 !shadow-2xl !shadow-black/40",
  });
}

/** Error toast — red accent */
export function toastError(message: string, description?: string) {
  sonnerToast.error(message, {
    description,
    className:
      "!bg-gray-900 !border !border-red-500/30 !text-gray-200 !shadow-2xl !shadow-black/40",
  });
}

/** Info toast — blue accent */
export function toastInfo(message: string, description?: string) {
  sonnerToast.info(message, {
    description,
    className:
      "!bg-gray-900 !border !border-blue-500/30 !text-gray-200 !shadow-2xl !shadow-black/40",
  });
}

/** Warning toast — amber accent */
export function toastWarning(message: string, description?: string) {
  sonnerToast.warning(message, {
    description,
    className:
      "!bg-gray-900 !border !border-amber-500/30 !text-gray-200 !shadow-2xl !shadow-black/40",
  });
}

/** Re-export raw toast for advanced use (promises, custom JSX, dismiss, etc.) */
export { sonnerToast as toast };
