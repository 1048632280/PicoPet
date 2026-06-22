import { describe, expect, it, vi } from "vitest";
import { PetRenderer } from "./renderer";
import type { AtlasManifest } from "./types";

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  return canvas;
}

function createContextMock() {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D & { drawImage: ReturnType<typeof vi.fn> };
}

describe("PetRenderer", () => {
  const atlas: AtlasManifest = {
    image: "pico_idle.png",
    frame_width: 128,
    frame_height: 128,
    frames: 8,
    fps: 12,
    loop: true
  };

  it("renders fallback when no image is available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(createContextMock());
    const canvas = createCanvas();
    const renderer = new PetRenderer(canvas, atlas);

    expect(() => renderer.renderFallback()).not.toThrow();
  });

  it("does not draw out-of-range frames", () => {
    const context = createContextMock();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const canvas = createCanvas();
    const renderer = new PetRenderer(canvas, atlas);

    renderer.renderFrame(99);

    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
