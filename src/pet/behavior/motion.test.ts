import { describe, expect, it } from "vitest";
import { shortRangeWalkPosition } from "./motion";
import { createBehaviorProfile } from "./timing";

describe("shortRangeWalkPosition", () => {
  it("starts and ends at the anchor", () => {
    const anchor = { x: 100, y: 200 };

    expect(shortRangeWalkPosition(anchor, 0, 6000, 48, 1)).toEqual({
      x: 100,
      y: 200,
      offsetX: 0,
      complete: false
    });
    expect(shortRangeWalkPosition(anchor, 6000, 6000, 48, 1)).toEqual({
      x: 100,
      y: 200,
      offsetX: 0,
      complete: true
    });
  });

  it("stays within the configured short range", () => {
    const anchor = { x: 100, y: 200 };
    const midpoint = shortRangeWalkPosition(anchor, 3000, 6000, 48, 1);

    expect(midpoint.x).toBe(148);
    expect(midpoint.y).toBe(200);
    expect(midpoint.offsetX).toBe(48);
    expect(midpoint.complete).toBe(false);
  });

  it("supports walking left", () => {
    const anchor = { x: 100, y: 200 };
    const midpoint = shortRangeWalkPosition(anchor, 3000, 6000, 48, -1);

    expect(midpoint.x).toBe(52);
    expect(midpoint.offsetX).toBe(-48);
  });

  it("uses profile distance for short-range walk", () => {
    const anchor = { x: 100, y: 200 };
    const lively = createBehaviorProfile("lively");
    const midpoint = shortRangeWalkPosition(
      anchor,
      lively.timing.walkDurationMs / 2,
      lively.timing.walkDurationMs,
      lively.walkDistancePx,
      1
    );

    expect(midpoint.x).toBe(172);
    expect(midpoint.offsetX).toBe(72);
  });
});
