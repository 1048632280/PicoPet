import type { AtlasManifest } from "./types";

function requirePositiveInteger(value: unknown, field: keyof AtlasManifest): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`invalid atlas ${field}`);
  }
  return Number(value);
}

export function normalizeAtlasManifest(input: unknown): AtlasManifest {
  if (!input || typeof input !== "object") {
    throw new Error("invalid atlas manifest");
  }

  const manifest = input as Record<string, unknown>;
  if (typeof manifest.image !== "string" || manifest.image.length === 0) {
    throw new Error("invalid atlas image");
  }
  if (typeof manifest.loop !== "boolean") {
    throw new Error("invalid atlas loop");
  }

  return {
    image: manifest.image,
    frame_width: requirePositiveInteger(manifest.frame_width, "frame_width"),
    frame_height: requirePositiveInteger(manifest.frame_height, "frame_height"),
    frames: requirePositiveInteger(manifest.frames, "frames"),
    fps: requirePositiveInteger(manifest.fps, "fps"),
    loop: manifest.loop
  };
}
