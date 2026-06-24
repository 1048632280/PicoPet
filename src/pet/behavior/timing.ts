import type { BehaviorTiming } from "./types";

export function createQuietBehaviorTiming(): BehaviorTiming {
  return {
    happyDurationMs: 1400,
    walkDurationMs: 6000,
    walkIntervalMs: 240000
  };
}

export function nextQuietWalkAt(now: number): number {
  return now + createQuietBehaviorTiming().walkIntervalMs;
}
