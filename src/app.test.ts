import { beforeEach, describe, expect, it, vi } from "vitest";

const defaultConfig = {
  window: {
    x: 1200,
    y: 680,
    scale: 1,
    always_on_top: true,
    click_through: false
  },
  animation: {
    paused: false,
    idle_fps: 12,
    interactive_fps: 30
  }
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startDragging: vi.fn(async () => undefined),
    outerPosition: vi.fn(async () => ({ x: 1200, y: 680 }))
  })
}));

vi.mock("./tauri/commands", () => ({
  getAppConfig: vi.fn(async () => defaultConfig),
  saveWindowPosition: vi.fn(async () => defaultConfig)
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D);
});

describe("boot", () => {
  it("marks the pet canvas as ready", async () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await expect(boot()).resolves.toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
