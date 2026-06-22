import "./style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { normalizeAtlasManifest } from "./pet/atlas";
import { PetRenderer } from "./pet/renderer";
import { getAppConfig, saveWindowPosition } from "./tauri/commands";
import { persistPositionAfterDrag } from "./tauri/window";

export async function boot(): Promise<string> {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }

  const atlas = normalizeAtlasManifest(idleAtlasRaw);
  const renderer = new PetRenderer(canvas, atlas);
  const appWindow = getCurrentWindow();
  let config = await getAppConfig();
  let startedAt = performance.now();
  let previousFrameAt = 0;
  let paused = config.animation.paused;

  canvas.style.width = `${atlas.frame_width * config.window.scale}px`;
  canvas.style.height = `${atlas.frame_height * config.window.scale}px`;

  canvas.addEventListener("pointerdown", async (event) => {
    if (event.button !== 0 || config.window.click_through) {
      return;
    }
    await persistPositionAfterDrag(appWindow, async (x, y) => {
      config = await saveWindowPosition(x, y);
    });
  });

  const image = new Image();
  image.onload = () => {
    renderer.setImage(image);
    requestAnimationFrame(tick);
  };
  image.onerror = () => renderer.renderFallback();
  image.src = idleImageUrl;

  function tick(now: number) {
    if (!paused && !document.hidden && shouldRenderFrame(previousFrameAt, now, config.animation.idle_fps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, config.animation.idle_fps, atlas.frames));
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("picopet:config", (event) => {
    const custom = event as CustomEvent<typeof config>;
    config = custom.detail;
    paused = config.animation.paused;
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
