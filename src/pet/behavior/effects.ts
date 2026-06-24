import type { BehaviorState, RenderEffect } from "./types";

export function defaultRenderEffect(): RenderEffect {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    alpha: 1,
    fpsMultiplier: 1
  };
}

export function renderEffectForState(
  state: BehaviorState,
  elapsedMs: number,
  durationMs = 1400
): RenderEffect {
  if (state === "happy") {
    const progress = Math.min(Math.max(elapsedMs / Math.max(1, durationMs), 0), 1);
    const bounce = Math.sin(progress * Math.PI);
    return {
      scale: 1 + 0.08 * bounce,
      offsetX: 0,
      offsetY: Math.round(-6 * bounce),
      alpha: 1,
      fpsMultiplier: 1.5
    };
  }

  if (state === "sleep") {
    const breath = Math.sin((elapsedMs / 1800) * Math.PI * 2);
    return {
      scale: 1 + 0.025 * breath,
      offsetX: 0,
      offsetY: 0,
      alpha: 0.86,
      fpsMultiplier: 0.35
    };
  }

  if (state === "dragged") {
    return {
      scale: 0.96,
      offsetX: 0,
      offsetY: 2,
      alpha: 1,
      fpsMultiplier: 0.5
    };
  }

  if (state === "walk") {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      alpha: 1,
      fpsMultiplier: 1.2
    };
  }

  return defaultRenderEffect();
}
