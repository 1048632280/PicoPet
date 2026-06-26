import { describe, expect, it } from "vitest";
import { defaultRenderEffect, renderEffectForState } from "./effects";
import { createBehaviorProfile } from "./timing";

describe("renderEffectForState", () => {
  it("returns a neutral effect for idle", () => {
    expect(renderEffectForState("idle", 0)).toEqual(defaultRenderEffect());
  });

  it("adds a preset-aware bounce for happy", () => {
    const quiet = renderEffectForState("happy", 700, createBehaviorProfile("quiet"));
    const lively = renderEffectForState("happy", 900, createBehaviorProfile("lively"));

    expect(quiet.scale).toBeGreaterThan(1);
    expect(quiet.offsetY).toBeLessThan(0);
    expect(quiet.fpsMultiplier).toBeGreaterThan(1);
    expect(lively.scale).toBeGreaterThan(quiet.scale);
    expect(lively.offsetY).toBeLessThan(quiet.offsetY);
    expect(lively.fpsMultiplier).toBeGreaterThan(quiet.fpsMultiplier);
  });

  it("reduces cadence for sleep", () => {
    const effect = renderEffectForState("sleep", 1000);

    expect(effect.alpha).toBeLessThan(1);
    expect(effect.fpsMultiplier).toBeLessThan(1);
  });

  it("keeps dragged visually held", () => {
    const effect = renderEffectForState("dragged", 100);

    expect(effect.scale).toBeLessThan(1);
    expect(effect.offsetY).toBeGreaterThan(0);
  });

  it("uses preset-aware walk cadence", () => {
    const quiet = renderEffectForState("walk", 0, createBehaviorProfile("quiet"));
    const normal = renderEffectForState("walk", 0, createBehaviorProfile("normal"));
    const lively = renderEffectForState("walk", 0, createBehaviorProfile("lively"));

    expect(quiet.fpsMultiplier).toBeLessThan(normal.fpsMultiplier);
    expect(normal.fpsMultiplier).toBeLessThan(lively.fpsMultiplier);
  });
});
