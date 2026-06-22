import "./style.css";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { normalizeAtlasManifest } from "./pet/atlas";
import { PetRenderer } from "./pet/renderer";

export function boot(): string {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }

  const atlas = normalizeAtlasManifest(idleAtlasRaw);
  const renderer = new PetRenderer(canvas, atlas);
  const image = new Image();
  let startedAt = performance.now();
  let previousFrameAt = 0;

  image.onload = () => {
    renderer.setImage(image);
    requestAnimationFrame(tick);
  };
  image.onerror = () => renderer.renderFallback();
  image.src = idleImageUrl;

  function tick(now: number) {
    if (shouldRenderFrame(previousFrameAt, now, atlas.fps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, atlas.fps, atlas.frames));
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
