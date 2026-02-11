import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

interface PersonaEntry {
  name: string;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptText, providerId = DEFAULT_PROVIDER, model, maxTokens } = body;

    // Support both new multi-persona format and legacy single-persona format
    let personas: PersonaEntry[];
    if (body.personas && Array.isArray(body.personas)) {
      personas = body.personas;
    } else if (body.personaDescription) {
      personas = [{ name: "Character", description: body.personaDescription }];
    } else {
      return NextResponse.json(
        { error: "Personas or personaDescription is required" },
        { status: 400 }
      );
    }

    if (!promptText) {
      return NextResponse.json(
        { error: "Prompt text is required" },
        { status: 400 }
      );
    }

    const charactersBlock = personas
      .map((p) => `### ${p.name}\n${p.description}`)
      .join("\n\n");

    const prompt = `You are an expert prompt engineer specializing in AI image generation prompts.
Your task is to inject specific character appearance details into an existing prompt.

## CHARACTERS (inject these physical traits by NAME):
${charactersBlock}

## ORIGINAL PROMPT:
${promptText}

## YOUR TASK:
Rewrite the original prompt so that each named character's physical appearance is injected where they are referenced. Follow these rules:

1. KEEP everything from the original prompt: the scene, setting, clothing, pose, action, lighting, mood, composition, art style, and all non-character details.
2. For each character name mentioned in the prompt, REPLACE or ENRICH the reference with the specific physical traits listed above for that character.
3. If a character name appears in the prompt but no matching CHARACTER entry exists, leave that reference as-is.
4. If the prompt has generic references like "a woman" or "a man" and there is only one character, replace the generic reference with that character's traits.
5. MERGE naturally — weave the physical traits into the sentence where the character is mentioned.
6. Do NOT add clothing from the CHARACTER descriptions — only physical traits (hair, skin, face, build, age). The original prompt's clothing/outfit descriptions should be preserved.
7. Use the appearance traits exactly as described — be precise and faithful to each character's description.
8. If the original prompt has NO character/person reference at all, add the characters naturally into the scene described.

Output ONLY the rewritten prompt, nothing else. Keep the output under 2500 characters.`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const injected = await callClaudeText(prompt);
      return NextResponse.json({ injected });
    }

    // === OpenAI-compatible providers (Mistral, GLM, OpenRouter) ===
    const provider = getProvider(providerId);

    const response = await provider.client.chat.completions.create({
      model: model || provider.textModel,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens || 2000,
    });

    const injected = extractTextContent(response.choices[0]?.message?.content);

    return NextResponse.json({ injected });
  } catch (error: unknown) {
    console.error("Inject-persona API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to inject persona";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
