import { describe, expect, it } from "vitest";
import { createBehaviorProfile, createQuietBehaviorTiming, nextQuietWalkAt, nextWalkAt } from "./timing";

describe("behavior timing", () => {
  it("keeps quiet defaults compatible with v0.2.0", () => {
    expect(createQuietBehaviorTiming()).toEqual({
      happyDurationMs: 1400,
      walkDurationMs: 6000,
      walkIntervalMs: 240000
    });
  });

  it("returns ordered timing profiles for supported presets", () => {
    const quiet = createBehaviorProfile("quiet");
    const normal = createBehaviorProfile("normal");
    const lively = createBehaviorProfile("lively");

    expect(quiet.timing).toEqual({
      happyDurationMs: 1400,
      walkDurationMs: 6000,
      walkIntervalMs: 240000
    });
    expect(normal.timing).toEqual({
      happyDurationMs: 1600,
      walkDurationMs: 7000,
      walkIntervalMs: 150000
    });
    expect(lively.timing).toEqual({
      happyDurationMs: 1800,
      walkDurationMs: 8000,
      walkIntervalMs: 90000
    });
    expect(quiet.walkDistancePx).toBeLessThan(normal.walkDistancePx);
    expect(normal.walkDistancePx).toBeLessThan(lively.walkDistancePx);
  });

  it("returns ordered expression parameters for supported presets", () => {
    const quiet = createBehaviorProfile("quiet");
    const normal = createBehaviorProfile("normal");
    const lively = createBehaviorProfile("lively");

    expect(quiet.idleBreathScaleAmplitude).toBe(0.006);
    expect(normal.idleBreathScaleAmplitude).toBe(0.01);
    expect(lively.idleBreathScaleAmplitude).toBe(0.014);
    expect(quiet.idleCycleMs).toBeGreaterThan(normal.idleCycleMs);
    expect(normal.idleCycleMs).toBeGreaterThan(lively.idleCycleMs);
    expect(quiet.walkRotationDeg).toBeLessThan(normal.walkRotationDeg);
    expect(normal.walkRotationDeg).toBeLessThan(lively.walkRotationDeg);
    expect(quiet.sleepTransitionMs).toBe(2400);
    expect(normal.sleepTransitionMs).toBe(2400);
    expect(lively.sleepTransitionMs).toBe(2400);
    expect(quiet.happyRotationDeg).toBeLessThan(normal.happyRotationDeg);
    expect(normal.happyRotationDeg).toBeLessThan(lively.happyRotationDeg);
    expect(quiet.draggedScaleX).toBeGreaterThan(1);
    expect(quiet.draggedScaleY).toBeLessThan(1);
    expect(quiet.dragReboundDurationMs).toBe(360);
    expect(normal.dragReboundDurationMs).toBe(420);
    expect(lively.dragReboundDurationMs).toBe(480);
  });

  it("falls back to quiet for unexpected preset strings", () => {
    expect(createBehaviorProfile("loud")).toEqual(createBehaviorProfile("quiet"));
  });

  it("schedules the next walk from the current time and selected preset", () => {
    expect(nextQuietWalkAt(1000)).toBe(241000);
    expect(nextWalkAt(1000, "normal")).toBe(151000);
    expect(nextWalkAt(1000, "lively")).toBe(91000);
  });
});
