import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "./tauri/commands";

const commandMocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  saveWindowPosition: vi.fn()
}));

const eventMocks = vi.hoisted(() => ({
  listen: vi.fn()
}));

const windowApiMocks = vi.hoisted(() => ({
  startDragging: vi.fn(async () => undefined),
  outerPosition: vi.fn(async () => ({ x: 1200, y: 680 })),
  setPosition: vi.fn(async () => undefined)
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
  getCurrentWindow: () => windowApiMocks,
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
  windowApiMocks.startDragging.mockClear();
  windowApiMocks.outerPosition.mockReset();
  windowApiMocks.outerPosition.mockResolvedValue({ x: 1200, y: 680 });
  windowApiMocks.setPosition.mockClear();
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

async function flushNativeDragFlow() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function mockImageLoading() {
  const images: Array<{ onload: (() => void) | null; onerror: (() => void) | null }> = [];
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
  return images;
}

function runLatestAnimationFrame(now: number) {
  const latestCall = frameMocks.requestAnimationFrame.mock.calls[
    frameMocks.requestAnimationFrame.mock.calls.length - 1
  ] as unknown as [FrameRequestCallback] | undefined;
  const callback = latestCall?.[0];
  expect(callback).toBeTypeOf("function");
  callback?.(now);
}

function expectLastWindowPosition(x: number, y: number) {
  const latestCall = windowApiMocks.setPosition.mock.calls[
    windowApiMocks.setPosition.mock.calls.length - 1
  ] as unknown as [unknown] | undefined;
  expect(latestCall?.[0]).toEqual(expect.objectContaining({ x, y }));
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

  it("treats an unchanged native drag position as a short press without saving position", async () => {
    mockCanvasContext();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();

    expect(windowApiMocks.startDragging).toHaveBeenCalledTimes(1);
    expect(commandMocks.saveWindowPosition).not.toHaveBeenCalled();
  });

  it("treats an unchanged native drag at a walked offset as a short press without saving position", async () => {
    mockCanvasContext();
    windowApiMocks.outerPosition
      .mockResolvedValueOnce({ x: 1240, y: 680 })
      .mockResolvedValueOnce({ x: 1240, y: 680 });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();

    expect(windowApiMocks.startDragging).toHaveBeenCalledTimes(1);
    expect(windowApiMocks.outerPosition).toHaveBeenCalledTimes(2);
    expect(commandMocks.saveWindowPosition).not.toHaveBeenCalled();
  });

  it("saves position when native drag changes the outer position past the drag threshold", async () => {
    mockCanvasContext();
    windowApiMocks.outerPosition
      .mockResolvedValueOnce({ x: 1200, y: 680 })
      .mockResolvedValueOnce({ x: 1230, y: 680 });
    commandMocks.saveWindowPosition.mockResolvedValue({
      ...cloneDefaultConfig(),
      window: {
        ...defaultConfig.window,
        x: 1230,
        y: 680
      }
    });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();

    expect(commandMocks.saveWindowPosition).toHaveBeenCalledWith(1230, 680);
  });

  it("returns the native window to the saved anchor when a short-range walk completes", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    runLatestAnimationFrame(240000);
    await flushNativeDragFlow();
    runLatestAnimationFrame(243000);
    await flushNativeDragFlow();
    expectLastWindowPosition(1240, 680);

    runLatestAnimationFrame(246000);
    await flushNativeDragFlow();

    expectLastWindowPosition(1200, 680);
  });

  it("returns the native window to the saved anchor when a walk is interrupted by pause", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    runLatestAnimationFrame(240000);
    await flushNativeDragFlow();
    runLatestAnimationFrame(243000);
    await flushNativeDragFlow();
    expectLastWindowPosition(1240, 680);
    const listener = eventMocks.listen.mock.calls.find(([eventName]) => eventName === "picopet://config")?.[1];

    listener?.({
      event: "picopet://config",
      id: 1,
      payload: {
        ...cloneDefaultConfig(),
        animation: {
          ...defaultConfig.animation,
          paused: true
        }
      }
    });
    await flushNativeDragFlow();

    expectLastWindowPosition(1200, 680);
  });

  it("does not move the window autonomously when walk mode is stationary", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...defaultConfig.behavior,
        walk_mode: "stationary"
      }
    });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    runLatestAnimationFrame(240000);
    await flushNativeDragFlow();

    expect(windowApiMocks.setPosition).not.toHaveBeenCalled();
  });

  it("uses lively profile distance for autonomous short-range walk", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...defaultConfig.behavior,
        preset: "lively"
      }
    });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    runLatestAnimationFrame(90000);
    await flushNativeDragFlow();
    runLatestAnimationFrame(94000);
    await flushNativeDragFlow();

    expectLastWindowPosition(1272, 680);
  });

  it("recovers behavior state when native drag startup fails", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    windowApiMocks.startDragging.mockRejectedValueOnce(new Error("native drag failed"));
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();
    runLatestAnimationFrame(240000);
    await flushNativeDragFlow();

    expectLastWindowPosition(1200, 680);
  });

  it("keeps the saved anchor and recovers behavior state when saving a drag position fails", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    mockCanvasContext();
    const images = mockImageLoading();
    windowApiMocks.outerPosition
      .mockResolvedValueOnce({ x: 1200, y: 680 })
      .mockResolvedValueOnce({ x: 1230, y: 680 });
    commandMocks.saveWindowPosition.mockRejectedValueOnce(new Error("save failed"));
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();
    runLatestAnimationFrame(240000);
    await flushNativeDragFlow();

    expect(commandMocks.saveWindowPosition).toHaveBeenCalledWith(1230, 680);
    expectLastWindowPosition(1200, 680);
  });

  it("does not surface stale happy effects after a click that starts while paused", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const context = mockCanvasContext();
    const images = mockImageLoading();
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      animation: {
        ...defaultConfig.animation,
        paused: true
      }
    });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    images[0].onload?.();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();
    const listener = eventMocks.listen.mock.calls.find(([eventName]) => eventName === "picopet://config")?.[1];
    listener?.({
      event: "picopet://config",
      id: 1,
      payload: cloneDefaultConfig()
    });
    runLatestAnimationFrame(700);

    expect(context.scale).toHaveBeenLastCalledWith(1, 1);
  });

  it("does not run behavior interactions while behavior is disabled", async () => {
    mockCanvasContext();
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...defaultConfig.behavior,
        enabled: false
      }
    });
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await boot();
    document.querySelector<HTMLCanvasElement>("#pet-canvas")?.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0 })
    );
    await flushNativeDragFlow();

    expect(windowApiMocks.startDragging).toHaveBeenCalledTimes(1);
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
