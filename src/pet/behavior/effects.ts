import type { BehaviorProfile, BehaviorState, RenderEffect } from "./types";
import { createBehaviorProfile } from "./timing";

export type RenderEffectOptions = {
  now?: number;
  lastDragCompletedAt?: number | null;
};

const TWO_PI = Math.PI * 2;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function effect(values: Partial<RenderEffect> = {}): RenderEffect {
  return {
    ...defaultRenderEffect(),
    ...values
  };
}

export function defaultRenderEffect(): RenderEffect {
  return {
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    offsetX: 0,
    offsetY: 0,
    alpha: 1,
    fpsMultiplier: 1
  };
}

function dragRebound(effectValue: RenderEffect, profile: BehaviorProfile, options: RenderEffectOptions): RenderEffect {
  if (typeof options.now !== "number" || typeof options.lastDragCompletedAt !== "number") {
    return effectValue;
  }

  const elapsed = options.now - options.lastDragCompletedAt;
  if (elapsed < 0 || elapsed > profile.dragReboundDurationMs) {
    return effectValue;
  }

  const progress = clamp01(elapsed / Math.max(1, profile.dragReboundDurationMs));
  const rebound = Math.sin(progress * Math.PI) * (1 - progress * 0.25);
  return {
    ...effectValue,
    scale: effectValue.scale + profile.dragReboundScaleBoost * rebound,
    scaleY: effectValue.scaleY + profile.dragReboundScaleBoost * 0.35 * rebound,
    offsetY: effectValue.offsetY - profile.dragReboundOffsetYPx * rebound
  };
}

export function renderEffectForState(
  state: BehaviorState,
  elapsedMs: number,
  profile: BehaviorProfile = createBehaviorProfile("quiet"),
  options: RenderEffectOptions = {}
): RenderEffect {
  if (state === "idle") {
    const cycleMs = Math.max(1, profile.idleCycleMs);
    const breath = Math.sin((elapsedMs / cycleMs) * TWO_PI);
    const sway = Math.sin((elapsedMs / (cycleMs * 1.7)) * TWO_PI);
    return dragRebound(
      effect({
        scale: 1 + profile.idleBreathScaleAmplitude * breath,
        scaleY: 1 - profile.idleBreathScaleAmplitude * 0.4 * breath,
        rotationDeg: profile.idleRotationDeg * sway,
        offsetY: -profile.idleFloatYPx * breath
      }),
      profile,
      options
    );
  }

  if (state === "happy") {
    const progress = clamp01(elapsedMs / Math.max(1, profile.timing.happyDurationMs));
    const bounce = Math.sin(progress * Math.PI);
    const sway = Math.sin(progress * TWO_PI);
    return effect({
      scale: 1 + profile.happyScaleBoost * bounce,
      rotationDeg: profile.happyRotationDeg * sway,
      offsetX: profile.happyOffsetYPx * 0.25 * sway,
      offsetY: -profile.happyOffsetYPx * bounce,
      fpsMultiplier: profile.happyFpsMultiplier
    });
  }

  if (state === "sleep") {
    const progress = clamp01(elapsedMs / Math.max(1, profile.sleepTransitionMs));
    if (progress < 1) {
      const sag = Math.sin(progress * Math.PI);
      return effect({
        scale: 1 - 0.015 * sag,
        scaleY: 1 - 0.035 * sag,
        rotationDeg: profile.idleRotationDeg * 0.4 * sag,
        offsetY: profile.sleepBreathOffsetYPx * sag,
        alpha: 1 - (1 - profile.sleepStableAlpha) * progress,
        fpsMultiplier: 0.55 - 0.2 * progress
      });
    }

    const stableElapsed = elapsedMs - profile.sleepTransitionMs;
    const breath = Math.sin((stableElapsed / 2200) * TWO_PI);
    return effect({
      scale: 1 + profile.sleepBreathScaleAmplitude * breath,
      scaleY: 1 - profile.sleepBreathScaleAmplitude * 0.5 * breath,
      offsetY: profile.sleepBreathOffsetYPx * breath,
      alpha: profile.sleepStableAlpha,
      fpsMultiplier: 0.35
    });
  }

  if (state === "dragged") {
    return effect({
      scaleX: profile.draggedScaleX,
      scaleY: profile.draggedScaleY,
      offsetY: profile.draggedOffsetYPx,
      fpsMultiplier: 0.5
    });
  }

  if (state === "walk") {
    const step = Math.sin((elapsedMs / 420) * TWO_PI);
    const sway = Math.sin((elapsedMs / 840) * TWO_PI);
    const compression = Math.max(0, step);
    return effect({
      scaleX: 1 + profile.walkScaleYAmplitude * 0.6 * compression,
      scaleY: 1 - profile.walkScaleYAmplitude * compression,
      rotationDeg: profile.walkRotationDeg * sway,
      offsetX: profile.walkSwayXPx * sway,
      offsetY: -Math.abs(step) * profile.walkBounceYPx,
      fpsMultiplier: profile.walkFpsMultiplier
    });
  }

  return defaultRenderEffect();
}
