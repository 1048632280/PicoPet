import { describe, expect, it } from "vitest";
import { defaultRenderEffect, renderEffectForState } from "./effects";

describe("renderEffectForState", () => {
  it("returns a neutral effect for idle", () => {
    expect(renderEffectForState("idle", 0)).toEqual(defaultRenderEffect());
  });

  it("adds a short bounce for happy", () => {
    const effect = renderEffectForState("happy", 700, 1400);

    expect(effect.scale).toBeGreaterThan(1);
    expect(effect.offsetY).toBeLessThan(0);
    expect(effect.fpsMultiplier).toBeGreaterThan(1);
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
});
