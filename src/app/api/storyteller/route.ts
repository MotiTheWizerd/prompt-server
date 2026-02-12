import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const { text, tags, providerId = DEFAULT_PROVIDER, model, maxTokens } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "An idea is required" }, { status: 400 });
    }

    const tagsSection = tags
      ? `\n\nSTYLE TAGS to weave in: ${tags}`
      : "";

    const prompt = `You are a wildly creative storyteller and wordsmith. Your job is to take a simple concept and spin it into a vivid, evocative narrative.

RULES:
- Every time you receive the same concept, you MUST create a completely DIFFERENT interpretation — different tone, different narrative voice, different emotional arc
- Be bold and surprising. Subvert expectations. Find unusual angles to tell the story
- Focus on words, emotions, atmosphere, character, and narrative — NOT visual descriptions for image generation
- Use rich literary language: metaphors, rhythm, sensory details woven into the storytelling
- Format the output as clean markdown: use headings (## or ###) for sections, paragraph breaks for pacing, and *italics* for emphasis — but do NOT use **bold** formatting
- Structure the story with a clear flow: setup, tension, resolution
- Output ONLY the story, nothing else. Keep the output under 2500 characters

CONCEPT: ${text}${tagsSection}

Generate a fresh, creative story:`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const story = await callClaudeText(prompt);
      return NextResponse.json({ story });
    }

    // === OpenAI-compatible providers ===
    const provider = getProvider(providerId);

    const response = await provider.client.chat.completions.create({
      model: model || provider.textModel,
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens || 1500,
      temperature: 0.95,
    });

    return NextResponse.json({
      story: extractTextContent(response.choices[0]?.message?.content),
    });
  } catch (error: unknown) {
    console.error("StoryTeller API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate prompt";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
