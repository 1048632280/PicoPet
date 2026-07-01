import type { BehaviorConfig } from "../../tauri/commands";

export type BehaviorState = "idle" | "walk" | "sleep" | "happy" | "dragged";
export type BehaviorPreset = "quiet" | "normal" | "lively";
export type WalkMode = "stationary" | "short_range" | "roaming";

export type AnchorPosition = {
  x: number;
  y: number;
};

export type BehaviorSnapshot = {
  state: BehaviorState;
  stateStartedAt: number;
  lastInteractionAt: number;
  nextWalkAt: number;
  config: BehaviorConfig;
  paused: boolean;
  hidden: boolean;
};

export type BehaviorTiming = {
  happyDurationMs: number;
  walkDurationMs: number;
  walkIntervalMs: number;
};

export type BehaviorProfile = {
  preset: BehaviorPreset;
  timing: BehaviorTiming;
  walkDistancePx: number;
  happyScaleBoost: number;
  happyOffsetYPx: number;
  happyFpsMultiplier: number;
  walkFpsMultiplier: number;
  idleBreathScaleAmplitude: number;
  idleFloatYPx: number;
  idleRotationDeg: number;
  idleCycleMs: number;
  walkBounceYPx: number;
  walkSwayXPx: number;
  walkRotationDeg: number;
  walkScaleYAmplitude: number;
  sleepTransitionMs: number;
  sleepStableAlpha: number;
  sleepBreathScaleAmplitude: number;
  sleepBreathOffsetYPx: number;
  happyRotationDeg: number;
  draggedScaleX: number;
  draggedScaleY: number;
  draggedOffsetYPx: number;
  dragReboundDurationMs: number;
  dragReboundScaleBoost: number;
  dragReboundOffsetYPx: number;
};

export type RenderEffect = {
  scale: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  offsetX: number;
  offsetY: number;
  alpha: number;
  fpsMultiplier: number;
};

export type AnimationProfile = {
  atlasId: BehaviorState;
  fps: number;
  loop: boolean;
};
