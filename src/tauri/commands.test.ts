import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args?: unknown) => ({ command, args }))
}));

describe("command wrappers", () => {
  it("calls set_animation_paused with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setAnimationPaused } = await import("./commands");

    await setAnimationPaused(true);

    expect(invoke).toHaveBeenCalledWith("set_animation_paused", { paused: true });
  });

  it("calls save_window_position with integer coordinates", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { saveWindowPosition } = await import("./commands");

    await saveWindowPosition(12.8, 99.2);

    expect(invoke).toHaveBeenCalledWith("save_window_position", { x: 13, y: 99 });
  });

  it("calls set_window_scale with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setWindowScale } = await import("./commands");

    await setWindowScale(1.25);

    expect(invoke).toHaveBeenCalledWith("set_window_scale", { scale: 1.25 });
  });

  it("calls set_launch_on_login with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setLaunchOnLogin } = await import("./commands");

    await setLaunchOnLogin(true);

    expect(invoke).toHaveBeenCalledWith("set_launch_on_login", { enabled: true });
  });

  it("calls get_diagnostics_info without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { getDiagnosticsInfo } = await import("./commands");

    await getDiagnosticsInfo();

    expect(invoke).toHaveBeenCalledWith("get_diagnostics_info");
  });
});
