import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args?: unknown) => ({ command, args }))
}));

describe("command wrappers", () => {
  it("calls open_settings_window without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { openSettingsWindow } = await import("./commands");

    await openSettingsWindow();

    expect(invoke).toHaveBeenCalledWith("open_settings_window");
  });

  it("calls set_behavior_preset with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setBehaviorPreset } = await import("./commands");

    await setBehaviorPreset("normal");

    expect(invoke).toHaveBeenCalledWith("set_behavior_preset", { preset: "normal" });
  });

  it("calls set_walk_mode with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setWalkMode } = await import("./commands");

    await setWalkMode("stationary");

    expect(invoke).toHaveBeenCalledWith("set_walk_mode", { walkMode: "stationary" });
  });

  it("calls set_sleep_after_idle_seconds with rounded seconds", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setSleepAfterIdleSeconds } = await import("./commands");

    await setSleepAfterIdleSeconds(90.6);

    expect(invoke).toHaveBeenCalledWith("set_sleep_after_idle_seconds", { seconds: 91 });
  });

  it("calls open_config_dir without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { openConfigDir } = await import("./commands");

    await openConfigDir();

    expect(invoke).toHaveBeenCalledWith("open_config_dir");
  });

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

  it("calls reset_config_to_defaults without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { resetConfigToDefaults } = await import("./commands");

    await resetConfigToDefaults();

    expect(invoke).toHaveBeenCalledWith("reset_config_to_defaults");
  });

  it("calls export_config without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { exportConfig } = await import("./commands");

    await exportConfig();

    expect(invoke).toHaveBeenCalledWith("export_config");
  });

  it("calls import_config without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { importConfig } = await import("./commands");

    await importConfig();

    expect(invoke).toHaveBeenCalledWith("import_config");
  });

  it("calls open_log_file without payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { openLogFile } = await import("./commands");

    await openLogFile();

    expect(invoke).toHaveBeenCalledWith("open_log_file");
  });
});
