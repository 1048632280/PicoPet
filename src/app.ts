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
import { createBehaviorProfile } from "./pet/behavior/timing";
import type { BehaviorSnapshot } from "./pet/behavior/types";
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
  let walkMoveToken = 0;
  let activeWalkMovesWindow = false;
  let lastDragCompletedAt: number | null = null;
  const dragThresholdPx = 6;

  const applyCanvasScale = () => {
    canvas.style.width = `${atlas.frame_width * config.window.scale}px`;
    canvas.style.height = `${atlas.frame_height * config.window.scale}px`;
  };
  const isAnimationActive = () => imageReady && !paused && !document.hidden;
  const returnWindowToAnchor = () => {
    walkMoveToken += 1;
    walkMovePending = false;
    void moveWindowTo(appWindow, anchorPosition.x, anchorPosition.y).catch(() => undefined);
  };
  const syncBehaviorSnapshot = (snapshot: BehaviorSnapshot) => {
    const nextWalkMovesWindow = snapshot.state === "walk" && snapshot.config.walk_mode === "short_range";
    if (!activeWalkMovesWindow && nextWalkMovesWindow) {
      walkMoveToken += 1;
      walkMovePending = false;
    }
    if (activeWalkMovesWindow && !nextWalkMovesWindow) {
      returnWindowToAnchor();
    }
    activeWalkMovesWindow = nextWalkMovesWindow;
    return snapshot;
  };
  const loop = createAnimationLoop({
    isActive: isAnimationActive,
    tick
  });

  syncBehaviorSnapshot(behavior.setPaused(paused, performance.now()));
  syncBehaviorSnapshot(behavior.setHidden(document.hidden, performance.now()));
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
    syncBehaviorSnapshot(behavior.pointerDown(startedAt));
    loop.sync();

    try {
      const dragStartPosition = await appWindow.outerPosition();
      const finalPosition = await readPositionAfterNativeDrag(appWindow);
      const movedDistance = Math.hypot(finalPosition.x - dragStartPosition.x, finalPosition.y - dragStartPosition.y);
      const finishedAt = performance.now();

      if (movedDistance > dragThresholdPx) {
        const nextConfig = await saveWindowPosition(finalPosition.x, finalPosition.y);
        config = nextConfig;
        anchorPosition = {
          x: config.window.x,
          y: config.window.y
        };
        lastDragCompletedAt = finishedAt;
        syncBehaviorSnapshot(behavior.dragComplete(finishedAt));
      } else {
        lastDragCompletedAt = null;
        syncBehaviorSnapshot(behavior.shortPress(finishedAt));
      }
    } catch {
      const failedAt = performance.now();
      lastDragCompletedAt = failedAt;
      syncBehaviorSnapshot(behavior.dragComplete(failedAt));
    } finally {
      loop.sync();
    }
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
    const snapshot = syncBehaviorSnapshot(behavior.update(now));
    const elapsedInState = now - snapshot.stateStartedAt;
    const profile = createBehaviorProfile(snapshot.config.preset);
    const effect = renderEffectForState(snapshot.state, elapsedInState, profile, {
      now,
      lastDragCompletedAt
    });
    const effectiveFps = Math.max(1, Math.round(config.animation.idle_fps * effect.fpsMultiplier));

    if (snapshot.state === "walk" && snapshot.config.walk_mode === "short_range") {
      const walkPosition = shortRangeWalkPosition(
        anchorPosition,
        elapsedInState,
        profile.timing.walkDurationMs,
        profile.walkDistancePx,
        walkDirection
      );
      if (!walkMovePending) {
        const currentWalkMoveToken = walkMoveToken;
        walkMovePending = true;
        void moveWindowTo(appWindow, walkPosition.x, walkPosition.y)
          .catch(() => {
            if (currentWalkMoveToken === walkMoveToken) {
              syncBehaviorSnapshot(behavior.dragComplete(performance.now()));
            }
          })
          .finally(() => {
            if (currentWalkMoveToken === walkMoveToken) {
              walkMovePending = false;
            } else if (behavior.snapshot().state !== "walk") {
              void moveWindowTo(appWindow, anchorPosition.x, anchorPosition.y).catch(() => undefined);
            }
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
    anchorPosition = {
      x: config.window.x,
      y: config.window.y
    };
    syncBehaviorSnapshot(behavior.setConfig(config.behavior, performance.now()));
    syncBehaviorSnapshot(behavior.setPaused(paused, performance.now()));
    applyCanvasScale();
    loop.sync();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
    syncBehaviorSnapshot(behavior.setHidden(document.hidden, performance.now()));
    loop.sync();
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
