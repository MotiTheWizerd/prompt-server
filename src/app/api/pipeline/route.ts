import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import { callClaudeVision } from "@/lib/claude-code/api-adapter";

interface ImageItem {
  data: string;
  filename: string;
  type: "reference" | "persona" | "target";
}

interface PipelineResult {
  success: boolean;
  personaDescription?: string;
  replacePrompt?: string;
  error?: string;
  timing?: {
    step1Ms: number;
    step2Ms: number;
    totalMs: number;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<PipelineResult>> {
  const startTime = Date.now();
  let step1Time = 0;
  let step2Time = 0;

  try {
    const {
      images,
      text,
      providerId = DEFAULT_PROVIDER,
      model,
      thinking = false,
    } = await request.json();

    // Parse images
    const typedImages = images as ImageItem[];
    const referenceImages = typedImages.filter((img) => img.type === "reference");
    const personaImage = typedImages.find((img) => img.type === "persona");
    const targetImage = typedImages.find((img) => img.type === "target");

    if (!personaImage) {
      return NextResponse.json({
        success: false,
        error: "Persona image is required",
      });
    }

    if (!targetImage) {
      return NextResponse.json({
        success: false,
        error: "Target image is required",
      });
    }

    console.log("=== Pipeline Started ===");
    console.log("Provider:", providerId);
    console.log("Reference images:", referenceImages.length);
    console.log("Has persona:", !!personaImage);
    console.log("Has target:", !!targetImage);

    // Build Step 1 prompt (shared by all providers)
    let step1Prompt = "You are an expert at describing physical appearance from images. Analyze the images provided and write precise, detailed descriptions.\n\n";
    let imageIndex = 1;

    referenceImages.forEach((img) => {
      step1Prompt += `Image ${imageIndex} (${img.filename}) is a REFERENCE for scene/style/environment. `;
      imageIndex++;
    });

    step1Prompt += `Image ${imageIndex} (${personaImage.filename}) is a FACE/APPEARANCE REFERENCE — extract ONLY physical traits from this image, NOT clothing.\n\n`;

    step1Prompt += `Analyze the images and write a detailed visual description covering:

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

    if (text) {
      step1Prompt += `\n\nAdditional context: ${text}`;
    }

    step1Prompt += `\n\nOutput ONLY the visual description, nothing else.`;

    // ============================================
    // STEP 1: Generate Persona Description
    // ============================================
    const step1Start = Date.now();
    console.log("\n--- Step 1: Describe Persona ---");

    let personaDescription: string;

    if (providerId === "claude") {
      // Claude CLI path
      const step1Images = [
        ...referenceImages.map((img) => ({ dataUrl: img.data, label: img.filename })),
        { dataUrl: personaImage.data, label: personaImage.filename },
      ];
      personaDescription = await callClaudeVision(step1Prompt, step1Images);
    } else {
      // OpenAI-compatible path
      const provider = getProvider(providerId);
      const visionModel = provider.visionModel;

      if (!provider.supportsVision) {
        return NextResponse.json({
          success: false,
          error: `${provider.name} does not support image input`,
        });
      }

      const extraParams: Record<string, unknown> = {};
      if (thinking && providerId === "glm") {
        extraParams.thinking = { type: "enabled" };
      }

      const extractBase64 = (dataUrl: string): string => {
        if (providerId === "glm") {
          const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          return base64Match ? base64Match[1] : dataUrl;
        }
        return dataUrl;
      };

      const step1Content: Array<
        { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
      > = [{ type: "text", text: step1Prompt }];

      referenceImages.forEach((img) => {
        step1Content.push({
          type: "image_url",
          image_url: { url: extractBase64(img.data) },
        });
      });

      step1Content.push({
        type: "image_url",
        image_url: { url: extractBase64(personaImage.data) },
      });

      const step1Response = await provider.client.chat.completions.create({
        model: visionModel,
        stream: false,
        messages: [{ role: "user", content: step1Content }],
        max_tokens: 1500,
        ...extraParams,
      });

      personaDescription = step1Response.choices[0].message.content || "";
    }

    step1Time = Date.now() - step1Start;
    console.log("Step 1 complete in", step1Time, "ms");
    console.log("Persona description length:", personaDescription.length);

    // ============================================
    // STEP 2: Generate Replace Prompt
    // ============================================
    const step2Start = Date.now();
    console.log("\n--- Step 2: Replace Prompt ---");

    const step2Prompt = `You are an expert prompt engineer for AI image generation. You analyze images and combine them with appearance descriptions to create precise, detailed prompts.

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

    let replacePrompt: string;

    if (providerId === "claude") {
      replacePrompt = await callClaudeVision(step2Prompt, [{ dataUrl: targetImage.data }]);
    } else {
      const provider = getProvider(providerId);
      const visionModel = provider.visionModel;

      const extraParams: Record<string, unknown> = {};
      if (thinking && providerId === "glm") {
        extraParams.thinking = { type: "enabled" };
      }

      const extractBase64 = (dataUrl: string): string => {
        if (providerId === "glm") {
          const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          return base64Match ? base64Match[1] : dataUrl;
        }
        return dataUrl;
      };

      const step2Content: Array<
        { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
      > = [
        { type: "text", text: step2Prompt },
        { type: "image_url", image_url: { url: extractBase64(targetImage.data) } },
      ];

      const step2Response = await provider.client.chat.completions.create({
        model: visionModel,
        stream: false,
        messages: [{ role: "user", content: step2Content }],
        max_tokens: 1500,
        ...extraParams,
      });

      replacePrompt = step2Response.choices[0].message.content || "";
    }
    step2Time = Date.now() - step2Start;
    console.log("Step 2 complete in", step2Time, "ms");
    console.log("Replace prompt length:", replacePrompt.length);

    const totalTime = Date.now() - startTime;
    console.log("\n=== Pipeline Complete ===");
    console.log("Total time:", totalTime, "ms");

    return NextResponse.json({
      success: true,
      personaDescription,
      replacePrompt,
      timing: {
        step1Ms: step1Time,
        step2Ms: step2Time,
        totalMs: totalTime,
      },
    });
  } catch (error: unknown) {
    console.error("Pipeline Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Pipeline failed";
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timing: {
        step1Ms: step1Time,
        step2Ms: step2Time,
        totalMs: Date.now() - startTime,
      },
    });
  }
}
