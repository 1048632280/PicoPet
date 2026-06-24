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
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillStyle: "",
    globalAlpha: 1
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
  };
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

  it("renders a frame with a render effect without resizing the canvas", () => {
    const context = createContextMock();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const canvas = createCanvas();
    const renderer = new PetRenderer(canvas, atlas);
    const image = {} as HTMLImageElement;

    renderer.setImage(image);
    renderer.renderFrame(0, {
      scale: 1.08,
      offsetX: 2,
      offsetY: -4,
      alpha: 0.9,
      fpsMultiplier: 1.5
    });

    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(128);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.translate).toHaveBeenCalledWith(66, 60);
    expect(context.scale).toHaveBeenCalledWith(1.08, 1.08);
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 128, 128, -64, -64, 128, 128);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });
});
