import { describe, expect, it } from "vitest";
import { createQuietBehaviorTiming, nextQuietWalkAt } from "./timing";

describe("behavior timing", () => {
  it("uses quiet defaults for v0.2.0", () => {
    expect(createQuietBehaviorTiming()).toEqual({
      happyDurationMs: 1400,
      walkDurationMs: 6000,
      walkIntervalMs: 240000
    });
  });

  it("schedules the next quiet walk from the current time", () => {
    expect(nextQuietWalkAt(1000)).toBe(241000);
  });
});
