import { describe, expect, it, vi } from "vitest";
import { moveWindowTo, persistPositionAfterDrag, readPositionAfterNativeDrag } from "./window";

describe("window helpers", () => {
  it("starts native dragging and returns the final outer position", async () => {
    const windowApi = {
      startDragging: vi.fn(async () => undefined),
      outerPosition: vi.fn(async () => ({ x: 42, y: 64 })),
      setPosition: vi.fn(async (_position: { x: number; y: number }) => undefined)
    };

    await expect(readPositionAfterNativeDrag(windowApi)).resolves.toEqual({ x: 42, y: 64 });

    expect(windowApi.startDragging).toHaveBeenCalledTimes(1);
    expect(windowApi.outerPosition).toHaveBeenCalledTimes(1);
  });

  it("starts native dragging and saves the final outer position", async () => {
    const windowApi = {
      startDragging: vi.fn(async () => undefined),
      outerPosition: vi.fn(async () => ({ x: 42, y: 64 })),
      setPosition: vi.fn(async (_position: { x: number; y: number }) => undefined)
    };
    const savePosition = vi.fn(async () => undefined);

    await expect(persistPositionAfterDrag(windowApi, savePosition)).resolves.toEqual({ x: 42, y: 64 });

    expect(savePosition).toHaveBeenCalledWith(42, 64);
  });

  it("moves the window to rounded physical coordinates", async () => {
    const windowApi = {
      startDragging: vi.fn(async () => undefined),
      outerPosition: vi.fn(async () => ({ x: 0, y: 0 })),
      setPosition: vi.fn(async (_position: { x: number; y: number }) => undefined)
    };

    await moveWindowTo(windowApi, 12.8, 99.2);

    expect(windowApi.setPosition).toHaveBeenCalledTimes(1);
    const [position] = windowApi.setPosition.mock.calls[0];
    expect(position.x).toBe(13);
    expect(position.y).toBe(99);
  });
});
