import type { NodeExecutor } from "../types";
import { mergeInputText, extractPersonas } from "./utils";

/** ImageDescriberNode: uploads image to /api/describe, outputs text description. */
export const imageDescriber: NodeExecutor = async (ctx) => {
  const { nodeData, providerId, model } = ctx;
  const image = nodeData.image as string;
  const notes = (nodeData.notes as string) || "";

  if (!image) {
    return { success: false, output: { error: "No image uploaded" } };
  }

  const start = Date.now();

  const res = await fetch("/api/describe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images: [{ data: image, filename: "image.jpg", type: "reference" }],
      providerId,
      ...(model && { model }),
      ...(notes && { text: notes }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Describe request failed" }));
    return { success: false, output: { error: err.error || "Image description failed" } };
  }

  const { description } = await res.json();
  return {
    success: true,
    output: { text: description, image, durationMs: Date.now() - start },
  };
};

/** ImageGeneratorNode: takes upstream text prompt and generates an image via /api/generate-image. */
export const imageGenerator: NodeExecutor = async (ctx) => {
  const { nodeData, inputs } = ctx;
  const upstreamText = mergeInputText(inputs);
  const directPrompt = (nodeData.prompt as string) || "";
  const prompt = upstreamText || directPrompt;

  if (!prompt.trim()) {
    return { success: false, output: { error: "No prompt text to generate from" } };
  }

  const imageProviderId = (nodeData.providerId as string) || undefined;
  const imageModel = (nodeData.model as string) || undefined;
  const width = (nodeData.width as number) || undefined;
  const height = (nodeData.height as number) || undefined;

  const start = Date.now();
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      ...(imageProviderId && { providerId: imageProviderId }),
      ...(imageModel && { model: imageModel }),
      ...(width && { width }),
      ...(height && { height }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Image generation failed" }));
    return { success: false, output: { error: err.error || "Image generation failed" } };
  }

  const { imageData } = await res.json();
  return {
    success: true,
    output: { image: imageData, text: prompt, durationMs: Date.now() - start },
  };
};

/** PersonasReplacerNode: analyzes upstream image, replaces characters with connected personas via /api/replace. */
export const personasReplacer: NodeExecutor = async (ctx) => {
  const { nodeData, inputs, adapterInputs, providerId, model } = ctx;

  // Prefer upstream image, fall back to directly uploaded image on the node
  const upstreamImage = inputs.find((inp) => inp.image)?.image;
  const directImage = nodeData.image as string;
  const targetImage = upstreamImage || directImage;

  if (!targetImage) {
    return { success: false, output: { error: "No image — upload one or connect an image source" } };
  }

  const personas = extractPersonas(adapterInputs);
  if (personas.length === 0) {
    return { success: false, output: { error: "No personas connected — attach character adapters" } };
  }

  // If upstream already has a text description, pass it so the replace route
  // can do text-only persona swap instead of re-analyzing the image with VLM
  const upstreamText = mergeInputText(inputs);

  const start = Date.now();
  const res = await fetch("/api/replace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personas,
      targetImage,
      providerId,
      ...(model && { model }),
      ...(upstreamText && { upstreamDescription: upstreamText }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Persona replacement failed" }));
    return { success: false, output: { error: err.error || "Persona replacement failed" } };
  }

  const { description } = await res.json();
  return {
    success: true,
    output: { text: description, durationMs: Date.now() - start },
  };
};
