import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const { text, language, providerId = DEFAULT_PROVIDER } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!language) {
      return NextResponse.json(
        { error: "Target language is required" },
        { status: 400 }
      );
    }

    const prompt = `Translate the following text to ${language}. Output ONLY the translation, nothing else. Do not add explanations, notes, or formatting.\n\n${text}`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const translation = await callClaudeText(prompt);
      return NextResponse.json({ translation });
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
      translation: extractTextContent(response.choices[0]?.message?.content),
    });
  } catch (error: unknown) {
    console.error("Translate API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to translate";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
