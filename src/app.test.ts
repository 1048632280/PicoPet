import { beforeEach, describe, expect, it, vi } from "vitest";

const commandMocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  saveWindowPosition: vi.fn()
}));

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
  getAppConfig: commandMocks.getAppConfig,
  saveWindowPosition: commandMocks.saveWindowPosition
}));

type ContextMock = CanvasRenderingContext2D & {
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
};

function cloneDefaultConfig() {
  return structuredClone(defaultConfig);
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
  commandMocks.saveWindowPosition.mockResolvedValue(cloneDefaultConfig());
  vi.stubGlobal("requestAnimationFrame", vi.fn());
});

function mockCanvasContext(): ContextMock {
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as ContextMock;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  return context;
}

describe("boot", () => {
  it("marks the pet canvas as ready", async () => {
    mockCanvasContext();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await expect(boot()).resolves.toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });

  it("renders the first frame after image load when animation starts paused", async () => {
    const context = mockCanvasContext();
    const images: Array<{ onload: (() => void) | null }> = [];
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      animation: {
        ...defaultConfig.animation,
        paused: true
      }
    });
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = "";

        constructor() {
          images.push(this);
        }
      }
    );
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 128, 128);
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, 128, 128, 0, 0, 128, 128);
  });
});
