import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";

const CHARACTERS_DIR = path.join(process.cwd(), "users", "test");

export async function POST(request: NextRequest) {
  try {
    const { id, name, imageData } = await request.json();

    if (!id || !name || !imageData) {
      return NextResponse.json(
        { error: "id, name, and imageData are required" },
        { status: 400 }
      );
    }

    const charDir = path.join(CHARACTERS_DIR, id);
    await mkdir(charDir, { recursive: true });

    // Strip data URL prefix and write raw binary
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: "Invalid image data format" },
        { status: 400 }
      );
    }

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const buffer = Buffer.from(base64Match[2], "base64");
    const filename = `image.${ext}`;
    await writeFile(path.join(charDir, filename), buffer);

    return NextResponse.json({
      success: true,
      imagePath: `/api/characters/${id}/image`,
    });
  } catch (error: unknown) {
    console.error("Characters API Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to save character";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const charDir = path.join(CHARACTERS_DIR, id);
    await rm(charDir, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Characters Delete Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete character";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
