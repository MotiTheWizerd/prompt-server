import OpenAI from "openai";

export interface Provider {
  id: string;
  name: string;
  textModel: string;
  visionModel: string;
  supportsVision: boolean;
  client: OpenAI;
}

// GLM available models
export const glmModels = [
  { id: "glm-4.7", name: "GLM-4.7", supportsVision: true },
  { id: "glm-4.7-flashx", name: "GLM-4.7-FlashX", supportsVision: true },
  { id: "glm-4.7-flash", name: "GLM-4.7-Flash", supportsVision: true },
];

// Provider configurations
const providerConfigs: Record<string, Omit<Provider, "client"> & { baseURL: string; apiKeyEnv: string; models?: typeof glmModels }> = {
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    textModel: "magistral-medium-2509",
    visionModel: "pixtral-12b-2409",
    supportsVision: true,
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
  },
  glm: {
    id: "glm",
    name: "GLM (Zhipu AI)",
    textModel: "glm-4.7-flash",
    visionModel: "glm-4.6v",
    supportsVision: true,
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    models: glmModels,
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    textModel: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    visionModel: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    supportsVision: false,
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
  },
};

// Initialize clients lazily
const clients: Record<string, OpenAI> = {};

function getClient(providerId: string): OpenAI {
  if (!clients[providerId]) {
    const config = providerConfigs[providerId];
    if (!config) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    clients[providerId] = new OpenAI({
      apiKey: process.env[config.apiKeyEnv],
      baseURL: config.baseURL,
    });
  }
  return clients[providerId];
}

export function getProvider(providerId: string): Provider {
  const config = providerConfigs[providerId];
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return {
    ...config,
    client: getClient(providerId),
  };
}

// Claude CLI provider (not OpenAI-based, handled separately in API routes)
const claudeProvider = {
  id: "claude",
  name: "Claude (CLI)",
  supportsVision: true,
};

export function getAvailableProviders(): Array<{ id: string; name: string; supportsVision: boolean; models?: typeof glmModels }> {
  const openaiProviders = Object.values(providerConfigs).map(({ id, name, supportsVision, models }) => ({
    id,
    name,
    supportsVision,
    models,
  }));
  return [...openaiProviders, claudeProvider];
}

export const DEFAULT_PROVIDER = "openrouter";

/**
 * Extract text from a chat completion message content.
 * Reasoning models (e.g. magistral) return content as an array of
 * content blocks instead of a plain string.
 */
export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block: Record<string, unknown>) => block.type === "text")
      .map((block: Record<string, unknown>) => block.text || "")
      .join("");
  }
  return String(content || "");
}
