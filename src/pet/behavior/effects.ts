import type { BehaviorProfile, BehaviorState, RenderEffect } from "./types";
import { createBehaviorProfile } from "./timing";

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
  profile: BehaviorProfile = createBehaviorProfile("quiet")
): RenderEffect {
  if (state === "happy") {
    const progress = Math.min(Math.max(elapsedMs / Math.max(1, profile.timing.happyDurationMs), 0), 1);
    const bounce = Math.sin(progress * Math.PI);
    return {
      scale: 1 + profile.happyScaleBoost * bounce,
      offsetX: 0,
      offsetY: Math.round(-profile.happyOffsetYPx * bounce),
      alpha: 1,
      fpsMultiplier: profile.happyFpsMultiplier
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
      fpsMultiplier: profile.walkFpsMultiplier
    };
  }

  return defaultRenderEffect();
}
