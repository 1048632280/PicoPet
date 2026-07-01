import type { BehaviorPreset, BehaviorProfile, BehaviorTiming } from "./types";

const QUIET_PROFILE: BehaviorProfile = {
  preset: "quiet",
  timing: {
    happyDurationMs: 1400,
    walkDurationMs: 6000,
    walkIntervalMs: 240000
  },
  walkDistancePx: 40,
  happyScaleBoost: 0.08,
  happyOffsetYPx: 6,
  happyFpsMultiplier: 1.5,
  walkFpsMultiplier: 1.2,
  idleBreathScaleAmplitude: 0.006,
  idleFloatYPx: 1,
  idleRotationDeg: 0.6,
  idleCycleMs: 4400,
  walkBounceYPx: 1.5,
  walkSwayXPx: 1.5,
  walkRotationDeg: 1.2,
  walkScaleYAmplitude: 0.015,
  sleepTransitionMs: 2400,
  sleepStableAlpha: 0.84,
  sleepBreathScaleAmplitude: 0.015,
  sleepBreathOffsetYPx: 1,
  happyRotationDeg: 1.5,
  draggedScaleX: 1.03,
  draggedScaleY: 0.94,
  draggedOffsetYPx: 3,
  dragReboundDurationMs: 360,
  dragReboundScaleBoost: 0.025,
  dragReboundOffsetYPx: 2
};

const NORMAL_PROFILE: BehaviorProfile = {
  preset: "normal",
  timing: {
    happyDurationMs: 1600,
    walkDurationMs: 7000,
    walkIntervalMs: 150000
  },
  walkDistancePx: 56,
  happyScaleBoost: 0.1,
  happyOffsetYPx: 8,
  happyFpsMultiplier: 1.65,
  walkFpsMultiplier: 1.3,
  idleBreathScaleAmplitude: 0.01,
  idleFloatYPx: 2,
  idleRotationDeg: 1,
  idleCycleMs: 3600,
  walkBounceYPx: 2,
  walkSwayXPx: 2.5,
  walkRotationDeg: 2,
  walkScaleYAmplitude: 0.025,
  sleepTransitionMs: 2400,
  sleepStableAlpha: 0.82,
  sleepBreathScaleAmplitude: 0.02,
  sleepBreathOffsetYPx: 1.5,
  happyRotationDeg: 3,
  draggedScaleX: 1.04,
  draggedScaleY: 0.92,
  draggedOffsetYPx: 4,
  dragReboundDurationMs: 420,
  dragReboundScaleBoost: 0.035,
  dragReboundOffsetYPx: 3
};

const LIVELY_PROFILE: BehaviorProfile = {
  preset: "lively",
  timing: {
    happyDurationMs: 1800,
    walkDurationMs: 8000,
    walkIntervalMs: 90000
  },
  walkDistancePx: 72,
  happyScaleBoost: 0.12,
  happyOffsetYPx: 10,
  happyFpsMultiplier: 1.8,
  walkFpsMultiplier: 1.45,
  idleBreathScaleAmplitude: 0.014,
  idleFloatYPx: 3,
  idleRotationDeg: 1.6,
  idleCycleMs: 3000,
  walkBounceYPx: 3,
  walkSwayXPx: 3.5,
  walkRotationDeg: 3.2,
  walkScaleYAmplitude: 0.035,
  sleepTransitionMs: 2400,
  sleepStableAlpha: 0.8,
  sleepBreathScaleAmplitude: 0.025,
  sleepBreathOffsetYPx: 2,
  happyRotationDeg: 4.5,
  draggedScaleX: 1.05,
  draggedScaleY: 0.9,
  draggedOffsetYPx: 5,
  dragReboundDurationMs: 480,
  dragReboundScaleBoost: 0.045,
  dragReboundOffsetYPx: 4
};

const PROFILES: Record<BehaviorPreset, BehaviorProfile> = {
  quiet: QUIET_PROFILE,
  normal: NORMAL_PROFILE,
  lively: LIVELY_PROFILE
};

export function normalizeBehaviorPreset(preset: string): BehaviorPreset {
  if (preset === "normal" || preset === "lively") {
    return preset;
  }
  return "quiet";
}

export function createBehaviorProfile(preset: string): BehaviorProfile {
  return PROFILES[normalizeBehaviorPreset(preset)];
}

export function createQuietBehaviorTiming(): BehaviorTiming {
  return createBehaviorProfile("quiet").timing;
}

export function nextWalkAt(now: number, preset: string): number {
  return now + createBehaviorProfile(preset).timing.walkIntervalMs;
}

export function nextQuietWalkAt(now: number): number {
  return nextWalkAt(now, "quiet");
}
