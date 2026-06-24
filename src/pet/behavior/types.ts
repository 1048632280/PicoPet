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

export type RenderEffect = {
  scale: number;
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
