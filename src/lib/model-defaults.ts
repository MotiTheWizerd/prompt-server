/**
 * Per-node-type default model assignments.
 * Resolution priority: nodeData override > node-type default > global provider fallback.
 */

export interface ModelAssignment {
  providerId: string;
  model: string;
  rationale: string;
}

export const NODE_MODEL_DEFAULTS: Record<string, ModelAssignment> = {
  grammarFix: {
    providerId: "mistral",
    model: "ministral-14b-2512",
    rationale: "Mechanical task — fast and cheap",
  },
  compressor: {
    providerId: "mistral",
    model: "ministral-14b-2512",
    rationale: "Summarization — lightweight suffices",
  },
  promptEnhancer: {
    providerId: "mistral",
    model: "ministral-14b-2512",
    rationale: "Good writing, fast turnaround",
  },
  initialPrompt: {
    providerId: "mistral",
    model: "ministral-14b-2512",
    rationale: "Only persona injection — lightweight",
  },
  translator: {
    providerId: "mistral",
    model: "ministral-14b-2512",
    rationale: "Mechanical translation — fast and reliable",
  },
  storyTeller: {
    providerId: "mistral",
    model: "labs-mistral-small-creative",
    rationale: "Creative writing specialist — narrative, roleplay, character dialog",
  },
  imageDescriber: {
    providerId: "claude",
    model: "",
    rationale: "Vision via Claude CLI — Mistral pixtral rate-limited",
  },
  personasReplacer: {
    providerId: "claude",
    model: "",
    rationale: "Vision via Claude CLI — Mistral pixtral rate-limited",
  },
};

/**
 * Resolve effective provider+model for a node.
 * nodeData overrides > node-type defaults > global fallback.
 */
export function resolveModelForNode(
  nodeType: string,
  nodeData: Record<string, unknown>,
  globalProviderId: string
): { providerId: string; model?: string } {
  const userProviderId = nodeData.providerId as string | undefined;
  const userModel = nodeData.model as string | undefined;
  const defaults = NODE_MODEL_DEFAULTS[nodeType];

  return {
    providerId: userProviderId || defaults?.providerId || globalProviderId,
    model: userModel || defaults?.model || undefined,
  };
}
