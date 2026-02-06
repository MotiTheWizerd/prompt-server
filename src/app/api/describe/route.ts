import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeVision, callClaudeText } from "@/lib/claude-code/api-adapter";

interface ImageItem {
  data: string;
  filename: string;
  type: "reference" | "persona";
}

export async function POST(request: NextRequest) {
  try {
    const { images, text, providerId = DEFAULT_PROVIDER, model, thinking = false } = await request.json();

    // Build prompt text (shared by all providers)
    const typedImages = (images || []) as ImageItem[];
    const referenceImages = typedImages.filter((img) => img.type === "reference");
    const personaImage = typedImages.find((img) => img.type === "persona");

    function buildDescribePrompt(): string {
      let imageLabels: string[] = [];
      let imageIndex = 1;

      referenceImages.forEach((img) => {
        imageLabels.push(`Image ${imageIndex} (${img.filename}) is a REFERENCE for scene/style/environment`);
        imageIndex++;
      });

      if (personaImage) {
        imageLabels.push(`Image ${imageIndex} (${personaImage.filename}) is a FACE/APPEARANCE REFERENCE — extract ONLY physical traits, NOT clothing`);
      }

      let promptText = `You are an art director writing detailed visual descriptions for illustration projects. Analyze the images provided and describe the VISUAL ELEMENTS you observe. Do not attempt to identify any people. Focus only on describable visual elements.\n\n${imageLabels.join(". ")}.\n\n`;

      if (referenceImages.length > 0 && personaImage) {
        promptText += `Analyze the images and write a detailed visual description covering:

FROM THE FACE/APPEARANCE REFERENCE (Image ${imageIndex}) — describe ONLY these traits:
- Hair: length, color, texture, style, parting
- Skin tone and complexion
- Approximate age range and build
- Facial hair if any (beard, mustache, stubble)
- General expression and demeanor
- DO NOT describe their clothing or accessories — those will come from a different source

FROM THE REFERENCE IMAGES (Images 1-${referenceImages.length}):
- Environment and setting
- Lighting quality and direction
- Art style and visual treatment
- Composition and camera angle
- Mood and atmosphere

Write a cohesive visual description that an illustrator could use. Focus on the person's physical appearance traits (NOT their outfit) and the scene elements.`;
      } else if (referenceImages.length > 0) {
        promptText += `Create a detailed visual description of the style, composition, lighting, and mood shown in these reference images. Focus on artistic and environmental elements.`;
      } else if (personaImage) {
        promptText += `Analyze this image and write a detailed visual description of ONLY physical appearance: hair (length, color, texture, style), skin tone, complexion, approximate age, build, facial hair if any, and general expression. Do NOT describe clothing or accessories. Do not identify anyone.`;
      }

      if (text) {
        promptText += `\n\nAdditional context: ${text}`;
      }

      promptText += `\n\nOutput ONLY the visual description, nothing else.`;
      return promptText;
    }

    // === Claude CLI provider ===
    if (providerId === "claude") {
      if (images && images.length > 0) {
        const promptText = buildDescribePrompt();
        const claudeImages = [
          ...referenceImages.map((img) => ({ dataUrl: img.data, label: img.filename })),
          ...(personaImage ? [{ dataUrl: personaImage.data, label: personaImage.filename }] : []),
        ];
        const description = await callClaudeVision(promptText, claudeImages);
        return NextResponse.json({ description });
      } else if (text) {
        const textPrompt = `You are an expert prompt engineer. Take this simple prompt and transform it into a detailed, rich prompt for AI image generation.\n\nAdd specific visual details, art style, composition, mood, and quality boosters.\n\nOutput ONLY the improved prompt, nothing else.\n\nSimple prompt: "${text}"`;
        const description = await callClaudeText(textPrompt);
        return NextResponse.json({ description });
      }

      return NextResponse.json(
        { error: "Please provide images or text" },
        { status: 400 }
      );
    }

    // === OpenAI-compatible providers (Mistral, GLM) ===
    const provider = getProvider(providerId);

    // Use custom model for text tasks (GLM), but always use provider's visionModel for images
    const textModel = model || provider.textModel;
    const visionModel = provider.visionModel;

    // Build extra params for providers that support thinking (GLM)
    const extraParams: Record<string, unknown> = {};
    if (thinking && providerId === "glm") {
      extraParams.thinking = { type: "enabled" };
    }

    // Handle multiple images mode
    if (images && images.length > 0) {
      if (!provider.supportsVision) {
        return NextResponse.json(
          { error: `${provider.name} does not support image input` },
          { status: 400 }
        );
      }

      const promptText = buildDescribePrompt();

      // Helper to extract base64 from data URL (GLM needs raw base64, not data URL)
      const extractBase64 = (dataUrl: string): string => {
        if (providerId === "glm") {
          const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          return base64Match ? base64Match[1] : dataUrl;
        }
        return dataUrl;
      };

      // Build content array with all images
      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
        { type: "text", text: promptText },
      ];

      referenceImages.forEach((img) => {
        content.push({
          type: "image_url",
          image_url: { url: extractBase64(img.data) },
        });
      });

      if (personaImage) {
        content.push({
          type: "image_url",
          image_url: { url: extractBase64(personaImage.data) },
        });
      }

      console.log("=== Vision Request ===");
      console.log("Provider:", providerId);
      console.log("Vision Model:", visionModel);
      console.log("Images count:", content.length - 1);
      console.log("Extra params:", extraParams);
      const firstImg = content.find(c => c.type === "image_url") as { type: "image_url"; image_url: { url: string } } | undefined;
      if (firstImg) {
        console.log("Image URL format (first 50 chars):", firstImg.image_url.url.substring(0, 50));
      }

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
    }
    // Text-only mode (prompt enhancement)
    else if (text) {
      const response = await provider.client.chat.completions.create({
        model: textModel,
        stream: false,
        messages: [
          {
            role: "user",
            content: `You are an expert prompt engineer. Take this simple prompt and transform it into a detailed, rich prompt for AI image generation.

Add specific visual details, art style, composition, mood, and quality boosters.

Output ONLY the improved prompt, nothing else.

Simple prompt: "${text}"`,
          },
        ],
        max_tokens: 1000,
        ...extraParams,
      });

      return NextResponse.json({
        description: extractTextContent(response.choices[0]?.message?.content),
      });
    }

    return NextResponse.json(
      { error: "Please provide images or text" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
