import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const { text, providerId = DEFAULT_PROVIDER, model, maxTokens } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = `Compress the following text to be shorter and more concise while preserving ALL information, meaning, and key details. Do not omit any facts, names, or important context. Output ONLY the compressed text, nothing else. No explanations or notes.\n\n${text}`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const compressed = await callClaudeText(prompt);
      return NextResponse.json({ compressed });
    }

    // === OpenAI-compatible providers (Mistral, GLM, OpenRouter) ===
    const provider = getProvider(providerId);

    const response = await provider.client.chat.completions.create({
      model: model || provider.textModel,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens || 2000,
    });

    return NextResponse.json({
      compressed: extractTextContent(response.choices[0]?.message?.content),
    });
  } catch (error: unknown) {
    console.error("Compress API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to compress text";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
