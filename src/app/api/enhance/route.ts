import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const { text, notes, providerId = DEFAULT_PROVIDER, model, maxTokens } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = notes
      ? `You are an expert prompt engineer specializing in AI image generation prompts.

Take the following prompt and enhance it according to the instructions provided.

## ORIGINAL PROMPT:
${text}

## ENHANCEMENT INSTRUCTIONS:
${notes}

Apply the enhancement instructions to improve the original prompt. Keep the core subject and intent, but enrich it with the requested changes. Add specific visual details where appropriate.

Output ONLY the enhanced prompt, nothing else. Keep the output under 2500 characters.`
      : `You are an expert prompt engineer specializing in AI image generation prompts.

Take this simple prompt and transform it into a detailed, rich prompt for AI image generation. Add specific visual details, art style, composition, lighting, mood, and quality boosters. Keep the core subject and intent.

## ORIGINAL PROMPT:
${text}

Output ONLY the enhanced prompt, nothing else. Keep the output under 2500 characters.`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const enhanced = await callClaudeText(prompt);
      return NextResponse.json({ enhanced });
    }

    // === OpenAI-compatible providers (Mistral, GLM) ===
    const provider = getProvider(providerId);

    const response = await provider.client.chat.completions.create({
      model: model || provider.textModel,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens || 1500,
    });

    return NextResponse.json({
      enhanced: extractTextContent(response.choices[0]?.message?.content),
    });
  } catch (error: unknown) {
    console.error("Enhance API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to enhance prompt";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
