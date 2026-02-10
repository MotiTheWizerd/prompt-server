import type {
  NodeExecutor,
  ExecutorRegistry,
  NodeOutput,
} from "./types";

// Map language codes to full names for translation prompts
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
  ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
  tr: "Turkish", pl: "Polish", nl: "Dutch", sv: "Swedish",
  da: "Danish", fi: "Finnish", no: "Norwegian", cs: "Czech",
  el: "Greek", he: "Hebrew", th: "Thai", vi: "Vietnamese",
  id: "Indonesian", uk: "Ukrainian", ro: "Romanian", hu: "Hungarian",
};

/** Coerce any value to a plain string. Handles objects, arrays, etc. */
function toStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (val == null) return "";
  return String(val);
}

/** Merge upstream text from multiple inputs. Always returns a plain string. */
function mergeInputText(inputs: NodeOutput[]): string {
  return inputs
    .map((inp) => toStr(inp.text) || toStr(inp.replacePrompt) || toStr(inp.injectedPrompt) || toStr(inp.personaDescription) || "")
    .filter(Boolean)
    .join("\n\n");
}

/**
 * ConsistentCharacterNode: uses pre-saved character from the library.
 * - Text mode (incoming edge): cached persona description + upstream text → /api/inject-persona
 * - Persona mode (no edge): outputs the cached persona description as-is
 */
const consistentCharacter: NodeExecutor = async (ctx) => {
  const { nodeData, inputs, providerId } = ctx;
  const personaDescription = nodeData.characterDescription as string;
  const upstreamText = mergeInputText(inputs);

  if (!personaDescription) {
    return {
      success: false,
      output: { error: "No character selected — drag one from Assets" },
    };
  }

  const start = Date.now();

  // Text mode: inject persona into upstream text
  if (upstreamText) {
    const injectRes = await fetch("/api/inject-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaDescription,
        promptText: upstreamText,
        providerId,
      }),
    });

    if (!injectRes.ok) {
      const err = await injectRes.json().catch(() => ({ error: "Inject request failed" }));
      return {
        success: false,
        output: { personaDescription, error: err.error || "Persona injection failed" },
      };
    }

    const { injected } = await injectRes.json();

    return {
      success: true,
      output: {
        text: injected,
        personaDescription,
        injectedPrompt: injected,
        durationMs: Date.now() - start,
      },
    };
  }

  // Persona mode: pass through the cached description
  return {
    success: true,
    output: {
      text: personaDescription,
      personaDescription,
      durationMs: Date.now() - start,
    },
  };
};

/** InitialPromptNode: pass-through text from node data. */
const initialPrompt: NodeExecutor = async (ctx) => {
  const text = (ctx.nodeData.text as string) || "";
  if (!text.trim()) {
    return { success: false, output: { error: "No prompt text entered" } };
  }
  return { success: true, output: { text } };
};

/** PromptEnhancerNode: enhances upstream text with additional notes via /api/enhance. */
const promptEnhancer: NodeExecutor = async (ctx) => {
  const { nodeData, inputs, providerId } = ctx;
  const notes = (nodeData.notes as string) || "";
  const upstreamText = mergeInputText(inputs);

  if (!upstreamText) {
    return { success: false, output: { error: "No input text to enhance" } };
  }

  const start = Date.now();
  const res = await fetch("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: upstreamText,
      notes: notes || undefined,
      providerId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Enhancement failed" }));
    return { success: false, output: { error: err.error || "Enhancement failed" } };
  }

  const { enhanced } = await res.json();
  return {
    success: true,
    output: {
      text: enhanced,
      personaDescription: inputs[0]?.personaDescription,
      durationMs: Date.now() - start,
    },
  };
};

/** TranslatorNode: translates upstream text to target language via /api/translate. */
const translator: NodeExecutor = async (ctx) => {
  const { nodeData, inputs, providerId } = ctx;
  const language = (nodeData.language as string) || "";
  const upstreamText = mergeInputText(inputs);

  if (!upstreamText) {
    return { success: false, output: { error: "No input text to translate" } };
  }

  // No language selected → pass through
  if (!language) {
    return { success: true, output: { text: upstreamText } };
  }

  const languageName = LANGUAGE_NAMES[language] || language;
  const start = Date.now();

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: upstreamText,
      language: languageName,
      providerId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Translation failed" }));
    return { success: false, output: { error: err.error || "Translation failed" } };
  }

  const { translation } = await res.json();
  return {
    success: true,
    output: { text: translation, durationMs: Date.now() - start },
  };
};

/** ImageDescriberNode: uploads image to /api/describe, outputs text description. */
const imageDescriber: NodeExecutor = async (ctx) => {
  const { nodeData, providerId } = ctx;
  const image = nodeData.image as string;

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
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Describe request failed" }));
    return { success: false, output: { error: err.error || "Image description failed" } };
  }

  const { description } = await res.json();
  return {
    success: true,
    output: { text: description, durationMs: Date.now() - start },
  };
};

/** TextOutputNode: terminal sink — receives upstream text, no API call. */
const textOutput: NodeExecutor = async (ctx) => {
  const text = mergeInputText(ctx.inputs);
  return { success: true, output: { text } };
};

/** StoryTellerNode: creative prompt generator — different output every time. */
const storyTeller: NodeExecutor = async (ctx) => {
  const { nodeData, inputs, providerId } = ctx;
  const idea = (nodeData.idea as string) || "";
  const tags = (nodeData.tags as string) || "";
  const upstreamText = mergeInputText(inputs);

  const text = upstreamText || idea;
  if (!text.trim()) {
    return { success: false, output: { error: "No idea provided" } };
  }

  const start = Date.now();
  const res = await fetch("/api/storyteller", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, tags: tags || undefined, providerId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Story generation failed" }));
    return { success: false, output: { error: err.error || "Story generation failed" } };
  }

  const { story } = await res.json();
  return {
    success: true,
    output: { text: story, durationMs: Date.now() - start },
  };
};

/** Registry mapping node type → executor. Groups are intentionally absent. */
export const executorRegistry: ExecutorRegistry = {
  initialPrompt,
  promptEnhancer,
  translator,
  imageDescriber,
  textOutput,
  consistentCharacter,
  storyTeller,
};
