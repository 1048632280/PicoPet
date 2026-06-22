import { describe, expect, it, vi } from "vitest";
import { persistPositionAfterDrag } from "./window";

describe("persistPositionAfterDrag", () => {
  it("starts native dragging and saves the final outer position", async () => {
    const windowApi = {
      startDragging: vi.fn(async () => undefined),
      outerPosition: vi.fn(async () => ({ x: 42, y: 64 }))
    };
    const savePosition = vi.fn(async () => undefined);

    await persistPositionAfterDrag(windowApi, savePosition);

    expect(windowApi.startDragging).toHaveBeenCalledTimes(1);
    expect(windowApi.outerPosition).toHaveBeenCalledTimes(1);
    expect(savePosition).toHaveBeenCalledWith(42, 64);
  });
});
