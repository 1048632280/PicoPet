import { describe, expect, it } from "vitest";
import { defaultRenderEffect, renderEffectForState } from "./effects";
import { createBehaviorProfile } from "./timing";

describe("renderEffectForState", () => {
  it("returns a neutral default effect with extended transform fields", () => {
    expect(defaultRenderEffect()).toEqual({
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotationDeg: 0,
      offsetX: 0,
      offsetY: 0,
      alpha: 1,
      fpsMultiplier: 1
    });
  });

  it("adds preset-aware idle motion without moving the real window", () => {
    const quietProfile = createBehaviorProfile("quiet");
    const livelyProfile = createBehaviorProfile("lively");
    const quiet = renderEffectForState("idle", quietProfile.idleCycleMs / 4, quietProfile);
    const lively = renderEffectForState("idle", livelyProfile.idleCycleMs / 4, livelyProfile);

    expect(quiet.scale).toBeGreaterThan(1);
    expect(Math.abs(quiet.offsetY)).toBeLessThanOrEqual(quietProfile.idleFloatYPx);
    expect(Math.abs(quiet.rotationDeg)).toBeLessThanOrEqual(quietProfile.idleRotationDeg);
    expect(lively.scale - 1).toBeGreaterThan(quiet.scale - 1);
    expect(Math.abs(lively.offsetY)).toBeGreaterThanOrEqual(Math.abs(quiet.offsetY));
  });

  it("adds a preset-aware bounce and sway for happy", () => {
    const quiet = renderEffectForState("happy", 700, createBehaviorProfile("quiet"));
    const lively = renderEffectForState("happy", 900, createBehaviorProfile("lively"));

    expect(quiet.scale).toBeGreaterThan(1);
    expect(quiet.offsetY).toBeLessThan(0);
    expect(Math.abs(quiet.rotationDeg)).toBeLessThanOrEqual(1.5);
    expect(quiet.fpsMultiplier).toBeGreaterThan(1);
    expect(lively.scale).toBeGreaterThan(quiet.scale);
    expect(lively.offsetY).toBeLessThan(quiet.offsetY);
    expect(lively.fpsMultiplier).toBeGreaterThan(quiet.fpsMultiplier);
    expect(lively.scale).toBeLessThanOrEqual(1.12);
    expect(Math.abs(lively.rotationDeg)).toBeLessThanOrEqual(4.5);
  });

  it("uses a sleep transition before stable sleep breathing", () => {
    const profile = createBehaviorProfile("quiet");
    const transition = renderEffectForState("sleep", 1200, profile);
    const stable = renderEffectForState("sleep", 3600, profile);

    expect(transition.alpha).toBeLessThan(1);
    expect(transition.alpha).toBeGreaterThan(profile.sleepStableAlpha);
    expect(transition.fpsMultiplier).toBeGreaterThan(0.35);
    expect(stable.alpha).toBe(profile.sleepStableAlpha);
    expect(stable.fpsMultiplier).toBe(0.35);
    expect(Math.abs(stable.scale - 1)).toBeLessThanOrEqual(profile.sleepBreathScaleAmplitude);
  });

  it("keeps sleep transition continuous at the stable boundary", () => {
    const profile = createBehaviorProfile("quiet");
    const beforeBoundary = renderEffectForState("sleep", profile.sleepTransitionMs - 1, profile);
    const atBoundary = renderEffectForState("sleep", profile.sleepTransitionMs, profile);
    const afterBoundary = renderEffectForState("sleep", profile.sleepTransitionMs + 1, profile);

    for (const [from, to] of [
      [beforeBoundary, atBoundary],
      [atBoundary, afterBoundary]
    ]) {
      expect(Math.abs(to.scale - from.scale)).toBeLessThan(0.01);
      expect(Math.abs(to.scaleY - from.scaleY)).toBeLessThan(0.01);
      expect(Math.abs(to.offsetY - from.offsetY)).toBeLessThan(0.75);
    }
  });

  it("keeps dragged visually held with non-uniform compression", () => {
    const effect = renderEffectForState("dragged", 100, createBehaviorProfile("normal"));

    expect(effect.scale).toBe(1);
    expect(effect.scaleX).toBeGreaterThan(1);
    expect(effect.scaleY).toBeLessThan(1);
    expect(effect.offsetY).toBeGreaterThan(0);
    expect(effect.fpsMultiplier).toBeLessThan(1);
  });

  it("adds stationary-compatible walk expression", () => {
    const quiet = renderEffectForState("walk", 105, createBehaviorProfile("quiet"));
    const lively = renderEffectForState("walk", 105, createBehaviorProfile("lively"));

    expect(quiet.fpsMultiplier).toBeGreaterThan(1);
    expect(quiet.scaleX).toBeGreaterThan(1);
    expect(quiet.scaleY).toBeLessThan(1);
    expect(quiet.offsetY).toBeLessThan(0);
    expect(Math.abs(lively.rotationDeg)).toBeGreaterThan(Math.abs(quiet.rotationDeg));
    expect(lively.fpsMultiplier).toBeGreaterThan(quiet.fpsMultiplier);
  });

  it("layers a short idle rebound after a drag completes", () => {
    const profile = createBehaviorProfile("quiet");
    const withoutRebound = renderEffectForState("idle", 0, profile, {
      now: 1000,
      lastDragCompletedAt: null
    });
    const withRebound = renderEffectForState("idle", 180, profile, {
      now: 1180,
      lastDragCompletedAt: 1000
    });
    const expired = renderEffectForState("idle", 500, profile, {
      now: 1500,
      lastDragCompletedAt: 1000
    });

    expect(withRebound.scale).toBeGreaterThan(withoutRebound.scale);
    expect(withRebound.offsetY).toBeLessThan(withoutRebound.offsetY);
    expect(expired.scale).toBe(renderEffectForState("idle", 500, profile).scale);
  });
});
