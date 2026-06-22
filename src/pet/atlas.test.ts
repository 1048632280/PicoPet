import { describe, expect, it } from "vitest";
import { normalizeAtlasManifest } from "./atlas";

describe("normalizeAtlasManifest", () => {
  it("accepts a valid atlas manifest", () => {
    expect(
      normalizeAtlasManifest({
        image: "pico_idle.png",
        frame_width: 128,
        frame_height: 128,
        frames: 8,
        fps: 12,
        loop: true
      })
    ).toEqual({
      image: "pico_idle.png",
      frame_width: 128,
      frame_height: 128,
      frames: 8,
      fps: 12,
      loop: true
    });
  });

  it("rejects invalid dimensions", () => {
    expect(() =>
      normalizeAtlasManifest({
        image: "pico_idle.png",
        frame_width: 0,
        frame_height: 128,
        frames: 8,
        fps: 12,
        loop: true
      })
    ).toThrow("invalid atlas frame_width");
  });
});
