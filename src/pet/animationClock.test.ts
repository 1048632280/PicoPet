import { describe, expect, it } from "vitest";
import { frameIndexAt, shouldRenderFrame } from "./animationClock";

describe("animationClock", () => {
  it("calculates a looping frame index", () => {
    expect(frameIndexAt(0, 12, 8)).toBe(0);
    expect(frameIndexAt(84, 12, 8)).toBe(1);
    expect(frameIndexAt(667, 12, 8)).toBe(0);
  });

  it("gates rendering by fps", () => {
    expect(shouldRenderFrame(0, 40, 12)).toBe(false);
    expect(shouldRenderFrame(0, 84, 12)).toBe(true);
  });
});
