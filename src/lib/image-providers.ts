/**
 * Universal image generation provider registry.
 * Start simple — each provider implements generate().
 * New providers plug in by adding to the registry.
 */

export interface ImageGenOptions {
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  negativePrompt?: string;
}

export interface ImageGenResult {
  imageData: string; // base64 data URL
  width: number;
  height: number;
}

export interface ImageProvider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
  generate(
    prompt: string,
    model: string,
    options: ImageGenOptions
  ): Promise<ImageGenResult>;
}

// HF router provider per model (default: "hf-inference")
const MODEL_ROUTER_PROVIDER: Record<string, string> = {};

// === HuggingFace Provider ===

const huggingface: ImageProvider = {
  id: "huggingface",
  name: "HuggingFace",
  models: [
    { id: "black-forest-labs/FLUX.1-schnell", name: "FLUX.1 Schnell (fast)" },
    { id: "black-forest-labs/FLUX.1-dev", name: "FLUX.1 Dev (quality)" },
  ],
  async generate(prompt, model, options) {
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) throw new Error("HF_API_KEY not set");

    // Different models are served by different HF router providers
    const routerProvider = MODEL_ROUTER_PROVIDER[model] || "hf-inference";
    const url = `https://router.huggingface.co/${routerProvider}/models/${model}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          ...(options.width && { width: options.width }),
          ...(options.height && { height: options.height }),
          ...(options.steps && { num_inference_steps: options.steps }),
          ...(options.seed !== undefined && { seed: options.seed }),
          ...(options.negativePrompt && {
            negative_prompt: options.negativePrompt,
          }),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`HuggingFace image gen failed (${res.status}): ${errText}`);
    }

    // Response is raw image bytes
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    const imageData = `data:${contentType};base64,${base64}`;

    return {
      imageData,
      width: options.width || 1024,
      height: options.height || 1024,
    };
  },
};

// === GLM-Image Provider (Z.AI native API) ===

const glmImage: ImageProvider = {
  id: "glm-image",
  name: "GLM-Image (Z.AI)",
  models: [{ id: "glm-image", name: "GLM-Image" }],
  async generate(prompt, model, options) {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) throw new Error("GLM_API_KEY not set");

    const width = options.width || 1280;
    const height = options.height || 1280;

    const res = await fetch(
      "https://api.z.ai/api/paas/v4/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          size: `${width}x${height}`,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`GLM-Image gen failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const imageUrl: string | undefined = json?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("GLM-Image returned no image URL");
    }

    // Download the image and convert to base64 data URL
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download GLM-Image result (${imgRes.status})`);
    }
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const imageData = `data:${contentType};base64,${base64}`;

    return { imageData, width, height };
  },
};

// === Black Forest Labs Provider (backend-routed) ===

const blackforestlabs: ImageProvider = {
  id: "blackforestlabs",
  name: "Black Forest Labs",
  models: [{ id: "flux-kontext-pro", name: "FLUX Kontext Pro" }],
  async generate() {
    throw new Error("Black Forest Labs execution is handled by the backend");
  },
};

// === Provider Registry ===

const imageProviderRegistry: Record<string, ImageProvider> = {
  huggingface,
  "glm-image": glmImage,
  blackforestlabs,
};

export function getImageProvider(providerId: string): ImageProvider {
  const provider = imageProviderRegistry[providerId];
  if (!provider) {
    throw new Error(`Unknown image provider: ${providerId}`);
  }
  return provider;
}

export function getAvailableImageProviders(): Array<{
  id: string;
  name: string;
  models: { id: string; name: string }[];
}> {
  return Object.values(imageProviderRegistry).map(({ id, name, models }) => ({
    id,
    name,
    models,
  }));
}

export const DEFAULT_IMAGE_PROVIDER = "huggingface";
export const DEFAULT_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";
