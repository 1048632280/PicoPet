import { defaultRenderEffect } from "./behavior/effects";
import type { RenderEffect } from "./behavior/types";
import type { AtlasManifest } from "./types";

export class PetRenderer {
  private readonly context: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly atlas: AtlasManifest
  ) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2d canvas is unavailable");
    }
    this.context = context;
    this.canvas.width = atlas.frame_width;
    this.canvas.height = atlas.frame_height;
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
  }

  renderFrame(frameIndex: number, effect: RenderEffect = defaultRenderEffect()): void {
    if (!this.image || frameIndex < 0 || frameIndex >= this.atlas.frames) {
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.save();
    this.context.globalAlpha = effect.alpha;
    this.context.translate(
      this.canvas.width / 2 + effect.offsetX,
      this.canvas.height / 2 + effect.offsetY
    );
    this.context.rotate((effect.rotationDeg * Math.PI) / 180);
    this.context.scale(effect.scale * effect.scaleX, effect.scale * effect.scaleY);
    this.context.drawImage(
      this.image,
      frameIndex * this.atlas.frame_width,
      0,
      this.atlas.frame_width,
      this.atlas.frame_height,
      -this.atlas.frame_width / 2,
      -this.atlas.frame_height / 2,
      this.atlas.frame_width,
      this.atlas.frame_height
    );
    this.context.restore();
  }

  renderFallback(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "rgba(80, 160, 220, 0.92)";
    this.context.beginPath();
    this.context.arc(this.canvas.width / 2, this.canvas.height / 2, 38, 0, Math.PI * 2);
    this.context.fill();
    this.context.fillStyle = "rgba(20, 30, 40, 1)";
    this.context.beginPath();
    this.context.arc(50, 58, 4, 0, Math.PI * 2);
    this.context.arc(78, 58, 4, 0, Math.PI * 2);
    this.context.fill();
  }
}
