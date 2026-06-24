import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "./tauri/commands";

const commandMocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  saveWindowPosition: vi.fn()
}));

const eventMocks = vi.hoisted(() => ({
  listen: vi.fn()
}));

const frameMocks = vi.hoisted(() => ({
  requestAnimationFrame: vi.fn(() => 1),
  cancelAnimationFrame: vi.fn()
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
  },
  startup: {
    launch_on_login: false
  },
  behavior: {
    enabled: true,
    preset: "quiet",
    walk_mode: "short_range",
    sleep_after_idle_seconds: 900
  }
} satisfies AppConfig;

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startDragging: vi.fn(async () => undefined),
    outerPosition: vi.fn(async () => ({ x: 1200, y: 680 })),
    setPosition: vi.fn(async () => undefined)
  }),
  PhysicalPosition: class PhysicalPosition {
    constructor(
      public readonly x: number,
      public readonly y: number
    ) {}
  }
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: eventMocks.listen
}));

vi.mock("./tauri/commands", () => ({
  getAppConfig: commandMocks.getAppConfig,
  saveWindowPosition: commandMocks.saveWindowPosition
}));

type ContextMock = CanvasRenderingContext2D & {
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
};

function cloneDefaultConfig() {
  return structuredClone(defaultConfig);
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
  commandMocks.saveWindowPosition.mockResolvedValue(cloneDefaultConfig());
  eventMocks.listen.mockResolvedValue(() => undefined);
  vi.stubGlobal("requestAnimationFrame", frameMocks.requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", frameMocks.cancelAnimationFrame);
  frameMocks.requestAnimationFrame.mockClear();
  frameMocks.cancelAnimationFrame.mockClear();
});

function mockCanvasContext(): ContextMock {
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
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
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, 128, 128, -64, -64, 128, 128);
    expect(frameMocks.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("applies tray config events to runtime interactions", async () => {
    mockCanvasContext();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    const listener = eventMocks.listen.mock.calls.find(([eventName]) => eventName === "picopet://config")?.[1];
    expect(listener).toBeTypeOf("function");

    listener?.({
      event: "picopet://config",
      id: 1,
      payload: {
        ...cloneDefaultConfig(),
        window: {
          ...defaultConfig.window,
          click_through: true
        }
      }
    });
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );

    expect(commandMocks.saveWindowPosition).not.toHaveBeenCalled();
  });

  it("keeps behavior config available from the runtime config", async () => {
    mockCanvasContext();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();

    expect(commandMocks.getAppConfig).toHaveBeenCalledTimes(1);
    expect(commandMocks.getAppConfig.mock.results[0].type).toBe("return");
  });

  it("applies tray config scale changes to the canvas size", async () => {
    mockCanvasContext();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    const listener = eventMocks.listen.mock.calls.find(([eventName]) => eventName === "picopet://config")?.[1];
    expect(listener).toBeTypeOf("function");

    listener?.({
      event: "picopet://config",
      id: 1,
      payload: {
        ...cloneDefaultConfig(),
        window: {
          ...defaultConfig.window,
          scale: 1.5
        }
      }
    });

    expect(document.querySelector<HTMLCanvasElement>("#pet-canvas")?.style.width).toBe("192px");
  });
});
