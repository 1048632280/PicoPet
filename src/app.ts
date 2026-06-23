import "./style.css";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { createAnimationLoop } from "./pet/animationLoop";
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
  let imageReady = false;

  const applyCanvasScale = () => {
    canvas.style.width = `${atlas.frame_width * config.window.scale}px`;
    canvas.style.height = `${atlas.frame_height * config.window.scale}px`;
  };
  const isAnimationActive = () => imageReady && !paused && !document.hidden;
  const loop = createAnimationLoop({
    isActive: isAnimationActive,
    tick
  });

  applyCanvasScale();

  await listen<typeof config>("picopet://config", (event) => {
    config = event.payload;
    window.dispatchEvent(new CustomEvent("picopet:config", { detail: config }));
  });

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
    imageReady = true;
    renderer.setImage(image);
    renderer.renderFrame(0);
    loop.sync();
  };
  image.onerror = () => {
    renderer.renderFallback();
    loop.stop();
  };
  image.src = idleImageUrl;

  function tick(now: number) {
    if (!paused && !document.hidden && shouldRenderFrame(previousFrameAt, now, config.animation.idle_fps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, config.animation.idle_fps, atlas.frames));
    }
  }

  window.addEventListener("picopet:config", (event) => {
    const custom = event as CustomEvent<typeof config>;
    config = custom.detail;
    paused = config.animation.paused;
    applyCanvasScale();
    loop.sync();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
    loop.sync();
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
