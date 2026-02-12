import { NextResponse } from "next/server";
import { getAvailableImageProviders, DEFAULT_IMAGE_PROVIDER } from "@/lib/image-providers";

export async function GET() {
  return NextResponse.json({
    providers: getAvailableImageProviders(),
    defaultProvider: DEFAULT_IMAGE_PROVIDER,
  });
}
