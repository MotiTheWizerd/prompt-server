import { NextRequest, NextResponse } from "next/server";
import {
  getImageProvider,
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_IMAGE_MODEL,
} from "@/lib/image-providers";

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      providerId = DEFAULT_IMAGE_PROVIDER,
      model = DEFAULT_IMAGE_MODEL,
      width,
      height,
      steps,
      seed,
      negativePrompt,
    } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const provider = getImageProvider(providerId);

    const result = await provider.generate(prompt, model, {
      width,
      height,
      steps,
      seed,
      negativePrompt,
    });

    return NextResponse.json({
      imageData: result.imageData,
      width: result.width,
      height: result.height,
    });
  } catch (error: unknown) {
    console.error("Generate Image API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
