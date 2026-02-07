import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

const CHARACTERS_DIR = path.join(process.cwd(), "users", "test");

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const charDir = path.join(CHARACTERS_DIR, id);

    // Find the image file (image.png, image.jpg, etc.)
    const files = await readdir(charDir);
    const imageFile = files.find((f) => f.startsWith("image."));

    if (!imageFile) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const ext = imageFile.split(".").pop() || "png";
    const contentType = MIME_TYPES[ext] || "image/png";
    const buffer = await readFile(path.join(charDir, imageFile));

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
