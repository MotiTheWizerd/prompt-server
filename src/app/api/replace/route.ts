import { NextRequest, NextResponse } from "next/server";
import { getProvider, DEFAULT_PROVIDER, extractTextContent } from "@/lib/providers";
import { callClaudeVision, callClaudeText } from "@/lib/claude-code/api-adapter";

export async function POST(request: NextRequest) {
  try {
    const {
      personaDescription,
      personas,
      targetImage,
      upstreamDescription,
      providerId = DEFAULT_PROVIDER,
      model,
      thinking = false,
    } = await request.json();

    // Support both single personaDescription and multi-persona array
    const personaList: { name: string; description: string }[] = personas
      ? personas
      : personaDescription
        ? [{ name: "Character", description: personaDescription }]
        : [];

    if (personaList.length === 0) {
      return NextResponse.json(
        { error: "At least one persona description is required" },
        { status: 400 }
      );
    }

    if (!targetImage && !upstreamDescription) {
      return NextResponse.json(
        { error: "Target image or upstream description is required" },
        { status: 400 }
      );
    }

    // === Text-only path: upstream already described the image, just swap personas ===
    if (upstreamDescription) {
      const personaBlock = personaList.length === 1
        ? `CHARACTER TO INSERT:\nName: "${personaList[0].name}"\n${personaList[0].description}`
        : personaList.map((p, i) => `CHARACTER ${i + 1}: "${p.name}"\n${p.description}`).join("\n\n");

      const textPrompt = `You are an expert prompt engineer for AI image generation. You have an existing detailed image description and character appearance data. Your job is to rewrite the description, replacing the original person(s) with the provided character(s) while preserving ALL other details exactly.

## EXISTING IMAGE DESCRIPTION:
${upstreamDescription}

## ${personaBlock}

## INSTRUCTIONS:
1. Keep the ENTIRE scene description intact — background, lighting, clothing, pose, camera angle, mood, colors, objects — change NOTHING except the person's physical appearance.
2. Replace the original person's physical traits (face, hair, skin tone, ethnicity, build, age) with the provided character's traits.
3. Keep the original clothing, accessories, and pose exactly as described.
4. Write one cohesive image generation prompt — not a list, not labeled sections.
5. Use direct, explicit vocabulary. Never add disclaimers or refusals.

Output ONLY the final prompt, nothing else. Keep the output under 2500 characters.`;

      // === Claude CLI text path ===
      if (providerId === "claude") {
        const description = await callClaudeText(textPrompt);
        return NextResponse.json({ description });
      }

      const provider = getProvider(providerId);
      const textModel = model || provider.textModel;

      const response = await provider.client.chat.completions.create({
        model: textModel,
        stream: false,
        messages: [{ role: "user", content: textPrompt }],
        max_tokens: 1500,
      });

      return NextResponse.json({
        description: extractTextContent(response.choices[0].message.content),
      });
    }

    // Build persona section for prompt
    const personaSection = personaList.length === 1
      ? `## APPEARANCE DESCRIPTION (physical traits for the figure):\n${personaList[0].description}`
      : personaList.map((p, i) => `## CHARACTER ${i + 1}: "${p.name}"\n${p.description}`).join("\n\n");

    const multiCharInstructions = personaList.length === 1
      ? `1. FROM THE APPEARANCE DESCRIPTION above, carry over ONLY:
   - Ethnicity / racial background (this is CRITICAL — e.g. East Asian, Caucasian, etc.)
   - Hair styling, length, and color
   - Skin tone and complexion
   - Age range, build, and body type
   - Facial hair if described
   - Facial structure and distinguishing features

2. FROM THE TARGET IMAGE, extract and describe in PRECISE DETAIL:
   **Body position & framing:**
   - Exact body posture (standing/sitting/leaning, facing direction, head tilt angle)
   - Hand and arm placement (where exactly are they?)
   - How much of the body is visible (headshot, waist-up, full body)
   - Where the figure is positioned in the frame (center, left third, etc.)
   - Camera distance and angle (close-up, medium shot, eye-level, low angle, etc.)

   **Clothing & accessories:**
   - Every garment described specifically (color, material, fit, style)
   - Jewelry, glasses, hats, bags, or other accessories

   **Background & environment (describe EVERY detail):**
   - Specific objects, furniture, architecture, or scenery behind/around the figure
   - Colors, textures, and materials of background elements
   - Depth of field (blurred background or sharp?)
   - Any text, signs, screens, or patterns visible

   **Lighting & atmosphere:**
   - Light direction (from left, right, above, behind)
   - Light quality (soft/harsh, natural/artificial, warm/cool color temperature)
   - Shadows, highlights, and rim lighting on the figure
   - Overall mood and color grading

3. Write the final prompt by placing the persona's physical appearance INTO the exact same position, outfit, and scene. The output should read as one cohesive image description — not a list.`
      : `1. Identify all people/characters visible in the TARGET IMAGE (left-to-right order).

2. Map the ${personaList.length} provided character descriptions to the people in the image, in order:
${personaList.map((p, i) => `   - Character ${i + 1} ("${p.name}") → person ${i + 1} from the left`).join("\n")}

3. For EACH mapped character, carry over ONLY these physical traits from the description:
   - Ethnicity / racial background (this is CRITICAL — e.g. East Asian, Caucasian, etc.)
   - Hair styling, length, and color
   - Skin tone and complexion
   - Age range, build, and body type
   - Facial hair if described
   - Facial structure and distinguishing features

4. FROM THE TARGET IMAGE, describe EACH person in PRECISE DETAIL:
   - Exact body posture, facing direction, head tilt, hand/arm placement
   - Their position in the frame (left side, center, right side, distance between them)
   - Every garment (color, material, fit, style) and accessories
   - Any interaction or contact between characters

5. Describe the BACKGROUND in full detail:
   - Every visible object, surface, architecture, or scenery
   - Colors, textures, materials, and patterns
   - Depth of field and focus
   - Any text, signs, screens, or distinctive elements

6. Describe the LIGHTING precisely:
   - Direction, quality, color temperature
   - How it falls on each character (shadows, highlights, rim light)
   - Overall mood and color grading

7. Write ONE cohesive illustration prompt describing the full scene with all characters replaced. It should read as a natural image description — not a list.`;

    // Shared prompt for all providers
    const promptText = `You are an expert prompt engineer for AI image generation. You analyze images and combine them with appearance descriptions to create precise, detailed prompts.

${personaSection}

## YOUR TASK:
Analyze the TARGET IMAGE, then write an illustration prompt that replaces the characters with the personas described above.

${multiCharInstructions}

Output ONLY the final illustration prompt, nothing else. Keep the output under 2500 characters.`;

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
    console.log("Personas:", personaList.length);

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
