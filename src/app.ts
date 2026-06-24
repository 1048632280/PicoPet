import "./style.css";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { createAnimationLoop } from "./pet/animationLoop";
import { normalizeAtlasManifest } from "./pet/atlas";
import { createBehaviorController } from "./pet/behavior/controller";
import { renderEffectForState } from "./pet/behavior/effects";
import { shortRangeWalkPosition } from "./pet/behavior/motion";
import { createQuietBehaviorTiming } from "./pet/behavior/timing";
import { PetRenderer } from "./pet/renderer";
import { getAppConfig, saveWindowPosition } from "./tauri/commands";
import { moveWindowTo, readPositionAfterNativeDrag } from "./tauri/window";

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
  const behaviorTiming = createQuietBehaviorTiming();
  const behavior = createBehaviorController({
    config: config.behavior,
    now: performance.now()
  });
  let anchorPosition = {
    x: config.window.x,
    y: config.window.y
  };
  let walkDirection: 1 | -1 = 1;
  let walkMovePending = false;
  const dragThresholdPx = 6;

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

    const startedAt = performance.now();
    behavior.pointerDown(startedAt);
    loop.sync();

    const dragStartPosition = await appWindow.outerPosition();
    const finalPosition = await readPositionAfterNativeDrag(appWindow);
    const movedDistance = Math.hypot(finalPosition.x - dragStartPosition.x, finalPosition.y - dragStartPosition.y);
    const finishedAt = performance.now();

    if (movedDistance > dragThresholdPx) {
      config = await saveWindowPosition(finalPosition.x, finalPosition.y);
      anchorPosition = {
        x: config.window.x,
        y: config.window.y
      };
      behavior.dragComplete(finishedAt);
    } else {
      behavior.shortPress(finishedAt);
    }

    loop.sync();
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
    const snapshot = behavior.update(now);
    const elapsedInState = now - snapshot.stateStartedAt;
    const effect = renderEffectForState(snapshot.state, elapsedInState, behaviorTiming.happyDurationMs);
    const effectiveFps = Math.max(1, Math.round(config.animation.idle_fps * effect.fpsMultiplier));

    if (snapshot.state === "walk") {
      const walkPosition = shortRangeWalkPosition(
        anchorPosition,
        elapsedInState,
        behaviorTiming.walkDurationMs,
        48,
        walkDirection
      );
      if (!walkMovePending) {
        walkMovePending = true;
        void moveWindowTo(appWindow, walkPosition.x, walkPosition.y)
          .catch(() => {
            behavior.dragComplete(performance.now());
          })
          .finally(() => {
            walkMovePending = false;
          });
      }
      if (walkPosition.complete) {
        walkDirection = walkDirection === 1 ? -1 : 1;
      }
    }

    if (!paused && !document.hidden && shouldRenderFrame(previousFrameAt, now, effectiveFps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, effectiveFps, atlas.frames), effect);
    }
  }

  window.addEventListener("picopet:config", (event) => {
    const custom = event as CustomEvent<typeof config>;
    config = custom.detail;
    paused = config.animation.paused;
    behavior.setConfig(config.behavior, performance.now());
    behavior.setPaused(paused, performance.now());
    anchorPosition = {
      x: config.window.x,
      y: config.window.y
    };
    applyCanvasScale();
    loop.sync();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
    behavior.setHidden(document.hidden, performance.now());
    loop.sync();
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
