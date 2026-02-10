import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeVision } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const {
      personaDescription,
      targetImage,
      providerId = DEFAULT_PROVIDER,
      model,
      thinking = false,
    } = await request.json();

    if (!personaDescription) {
      return NextResponse.json(
        { error: "Persona description is required (output from first agent)" },
        { status: 400 }
      );
    }

    if (!targetImage) {
      return NextResponse.json(
        { error: "Target image is required" },
        { status: 400 }
      );
    }

    // Shared prompt for all providers
    const promptText = `You are an expert prompt engineer for AI image generation. You analyze images and combine them with appearance descriptions to create precise, detailed prompts.

## APPEARANCE DESCRIPTION (physical traits for the figure):
${personaDescription}

## YOUR TASK:
Analyze the TARGET IMAGE, then write an illustration prompt that places a figure with the appearance above into the scene, pose, and OUTFIT from the target image.

1. FROM THE APPEARANCE DESCRIPTION above, carry over ONLY:
   - Hair styling and color
   - Skin tone and complexion
   - Age range and build
   - Facial hair if described
   - General expression/demeanor

2. FROM THE TARGET IMAGE, extract EVERYTHING ELSE:
   - The CLOTHING and accessories worn in the image (this is the outfit to use)
   - The pose and body positioning
   - Camera angle and framing/composition
   - Background, environment, and setting
   - Lighting quality, direction, and color temperature
   - Props and contextual objects

3. Write a cohesive illustration prompt: a figure with the described physical appearance, wearing the TARGET IMAGE's outfit, in the TARGET IMAGE's pose and scene.

Output ONLY the final illustration prompt, nothing else.`;

    // === Claude CLI provider ===
    if (providerId === "claude") {
      const imageData = targetImage.data || targetImage;
      const description = await callClaudeVision(promptText, [{ dataUrl: imageData }]);
      return NextResponse.json({ description });
    }

    // === OpenAI-compatible providers (Mistral, GLM) ===
    const provider = getProvider(providerId);

    if (!provider.supportsVision) {
      return NextResponse.json(
        { error: `${provider.name} does not support image input` },
        { status: 400 }
      );
    }

    const visionModel = provider.visionModel;

    // Build extra params for providers that support thinking (GLM)
    const extraParams: Record<string, unknown> = {};
    if (thinking && providerId === "glm") {
      extraParams.thinking = { type: "enabled" };
    }

    // Helper to extract base64 from data URL (GLM needs raw base64, not data URL)
    const extractBase64 = (dataUrl: string): string => {
      if (providerId === "glm") {
        const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        return base64Match ? base64Match[1] : dataUrl;
      }
      return dataUrl;
    };

    const content: Array<
      { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
    > = [
      { type: "text", text: promptText },
      {
        type: "image_url",
        image_url: { url: extractBase64(targetImage.data || targetImage) },
      },
    ];

    console.log("=== Replace Agent Request ===");
    console.log("Provider:", providerId);
    console.log("Vision Model:", visionModel);
    console.log("Persona description length:", personaDescription.length);

    const response = await provider.client.chat.completions.create({
      model: visionModel,
      stream: false,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      max_tokens: 1500,
      ...extraParams,
    });

    return NextResponse.json({
      description: extractTextContent(response.choices[0].message.content),
    });
  } catch (error: unknown) {
    console.error("Replace API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
