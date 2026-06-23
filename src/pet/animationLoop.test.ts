import { describe, expect, it, vi } from "vitest";
import { createAnimationLoop } from "./animationLoop";

describe("createAnimationLoop", () => {
  it("does not request a frame while inactive", () => {
    const requestFrame = vi.fn();
    const loop = createAnimationLoop({
      isActive: () => false,
      tick: vi.fn(),
      requestFrame
    });

    loop.sync();

    expect(requestFrame).not.toHaveBeenCalled();
    expect(loop.isRunning()).toBe(false);
  });

  it("requests one frame while active and keeps only one pending frame", () => {
    const requestFrame = vi.fn(() => 7);
    const loop = createAnimationLoop({
      isActive: () => true,
      tick: vi.fn(),
      requestFrame
    });

    loop.sync();
    loop.sync();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(loop.isRunning()).toBe(true);
  });

  it("cancels a pending frame when it becomes inactive", () => {
    let active = true;
    const requestFrame = vi.fn(() => 11);
    const cancelFrame = vi.fn();
    const loop = createAnimationLoop({
      isActive: () => active,
      tick: vi.fn(),
      requestFrame,
      cancelFrame
    });

    loop.sync();
    active = false;
    loop.sync();

    expect(cancelFrame).toHaveBeenCalledWith(11);
    expect(loop.isRunning()).toBe(false);
  });

  it("runs tick and schedules the next frame only when still active", () => {
    const callbacks: FrameRequestCallback[] = [];
    let active = true;
    const tick = vi.fn(() => {
      active = false;
    });
    const loop = createAnimationLoop({
      isActive: () => active,
      tick,
      requestFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      }
    });

    loop.sync();
    callbacks[0](100);

    expect(tick).toHaveBeenCalledWith(100);
    expect(callbacks).toHaveLength(1);
    expect(loop.isRunning()).toBe(false);
  });
});
