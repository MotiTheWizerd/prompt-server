import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const {
      personaDescription,
      promptText,
      providerId = DEFAULT_PROVIDER,
    } = await request.json();

    if (!personaDescription) {
      return NextResponse.json(
        { error: "Persona description is required" },
        { status: 400 }
      );
    }

    if (!promptText) {
      return NextResponse.json(
        { error: "Prompt text is required" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert prompt engineer specializing in AI image generation prompts.
Your task is to inject specific character appearance details into an existing prompt.

## CHARACTER APPEARANCE (use these physical traits):
${personaDescription}

## ORIGINAL PROMPT:
${promptText}

## YOUR TASK:
Rewrite the original prompt so that any person, character, figure, woman, man, or human reference in it is replaced with the specific physical appearance described above. Follow these rules:

1. KEEP everything from the original prompt: the scene, setting, clothing, pose, action, lighting, mood, composition, art style, and all non-character details.
2. REPLACE any generic character description (e.g. "a woman", "a person", "a man", "a young girl") with the specific physical traits from the CHARACTER APPEARANCE section.
3. If the original prompt already has some character details (e.g. "a blonde woman"), override them with the CHARACTER APPEARANCE traits — hair color, skin tone, age, build, etc.
4. MERGE naturally — do not just prepend the appearance. Weave the physical traits into the sentence where the character is mentioned.
5. If the original prompt has NO character/person reference at all, add the character naturally into the scene described.
6. Do NOT add clothing from the CHARACTER APPEARANCE — only physical traits (hair, skin, face, build, age). The original prompt's clothing/outfit descriptions should be preserved.
7. Do NOT identify anyone. Treat the appearance as fictional character traits.

Output ONLY the rewritten prompt, nothing else.`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const injected = await callClaudeText(prompt);
      return NextResponse.json({ injected });
    }

    // === OpenAI-compatible providers (Mistral, GLM) ===
    const provider = getProvider(providerId);

    const response = await provider.client.chat.completions.create({
      model: provider.textModel,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });

    return NextResponse.json({
      injected: extractTextContent(response.choices[0]?.message?.content),
    });
  } catch (error: unknown) {
    console.error("Inject-persona API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to inject persona";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
