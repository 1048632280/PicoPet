import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "./tauri/commands";

const commandMocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  setAnimationPaused: vi.fn(),
  setBehaviorPreset: vi.fn(),
  setClickThrough: vi.fn(),
  setLaunchOnLogin: vi.fn(),
  setSleepAfterIdleSeconds: vi.fn(),
  setWalkMode: vi.fn(),
  setWindowScale: vi.fn(),
  resetWindowPosition: vi.fn(),
  openConfigDir: vi.fn(),
  exportConfig: vi.fn(),
  importConfig: vi.fn(),
  openLogFile: vi.fn(),
  resetConfigToDefaults: vi.fn(),
  getDiagnosticsInfo: vi.fn()
}));

vi.mock("./tauri/commands", () => commandMocks);

function cloneDefaultConfig(): AppConfig {
  return {
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
  };
}

function control<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing control: ${selector}`);
  }
  return element;
}

describe("settings window", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of Object.values(commandMocks)) {
      mock.mockReset();
    }
    document.body.innerHTML = '<main id="settings-root"></main>';
  });

  it("renders the three settings sections", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    const { bootSettings } = await import("./settings");

    await bootSettings();

    expect(document.body.textContent).toContain("行为");
    expect(document.body.textContent).toContain("窗口");
    expect(document.body.textContent).toContain("启动与维护");
  });

  it("loads app config and populates controls", async () => {
    commandMocks.getAppConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      window: {
        ...cloneDefaultConfig().window,
        click_through: true,
        scale: 1.5
      },
      animation: {
        ...cloneDefaultConfig().animation,
        paused: true
      },
      startup: {
        launch_on_login: true
      },
      behavior: {
        ...cloneDefaultConfig().behavior,
        preset: "normal",
        walk_mode: "stationary",
        sleep_after_idle_seconds: 120
      }
    });
    const { bootSettings } = await import("./settings");

    await bootSettings();

    expect(control<HTMLSelectElement>('[data-setting="behavior-preset"]').value).toBe("normal");
    expect(control<HTMLSelectElement>('[data-setting="walk-mode"]').value).toBe("stationary");
    expect(control<HTMLInputElement>('[data-setting="sleep-seconds"]').value).toBe("120");
    expect(control<HTMLInputElement>('[data-setting="click-through"]').checked).toBe(true);
    expect(control<HTMLInputElement>('[data-setting="animation-paused"]').checked).toBe(true);
    expect(control<HTMLSelectElement>('[data-setting="window-scale"]').value).toBe("1.5");
    expect(control<HTMLInputElement>('[data-setting="launch-on-login"]').checked).toBe(true);
  });

  it("saves behavior preset and refreshes from returned config", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.setBehaviorPreset.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...cloneDefaultConfig().behavior,
        preset: "lively"
      }
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    const preset = control<HTMLSelectElement>('[data-setting="behavior-preset"]');
    preset.value = "lively";
    preset.dispatchEvent(new Event("change"));
    await Promise.resolve();

    expect(commandMocks.setBehaviorPreset).toHaveBeenCalledWith("lively");
    expect(preset.value).toBe("lively");
  });

  it("saves walk mode and sleep seconds", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.setWalkMode.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...cloneDefaultConfig().behavior,
        walk_mode: "stationary"
      }
    });
    commandMocks.setSleepAfterIdleSeconds.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...cloneDefaultConfig().behavior,
        sleep_after_idle_seconds: 60
      }
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    const walkMode = control<HTMLSelectElement>('[data-setting="walk-mode"]');
    walkMode.value = "stationary";
    walkMode.dispatchEvent(new Event("change"));
    await Promise.resolve();

    const sleep = control<HTMLInputElement>('[data-setting="sleep-seconds"]');
    sleep.value = "5";
    sleep.dispatchEvent(new Event("change"));
    await Promise.resolve();

    expect(commandMocks.setWalkMode).toHaveBeenCalledWith("stationary");
    expect(commandMocks.setSleepAfterIdleSeconds).toHaveBeenCalledWith(5);
    expect(sleep.value).toBe("60");
  });

  it("saves window and startup controls", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.setClickThrough.mockResolvedValue({
      ...cloneDefaultConfig(),
      window: { ...cloneDefaultConfig().window, click_through: true }
    });
    commandMocks.setAnimationPaused.mockResolvedValue({
      ...cloneDefaultConfig(),
      animation: { ...cloneDefaultConfig().animation, paused: true }
    });
    commandMocks.setWindowScale.mockResolvedValue({
      ...cloneDefaultConfig(),
      window: { ...cloneDefaultConfig().window, scale: 1.25 }
    });
    commandMocks.setLaunchOnLogin.mockResolvedValue({
      ...cloneDefaultConfig(),
      startup: { launch_on_login: true }
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    const clickThrough = control<HTMLInputElement>('[data-setting="click-through"]');
    clickThrough.checked = true;
    clickThrough.dispatchEvent(new Event("change"));
    await Promise.resolve();

    const paused = control<HTMLInputElement>('[data-setting="animation-paused"]');
    paused.checked = true;
    paused.dispatchEvent(new Event("change"));
    await Promise.resolve();

    const scale = control<HTMLSelectElement>('[data-setting="window-scale"]');
    scale.value = "1.25";
    scale.dispatchEvent(new Event("change"));
    await Promise.resolve();

    const launch = control<HTMLInputElement>('[data-setting="launch-on-login"]');
    launch.checked = true;
    launch.dispatchEvent(new Event("change"));
    await Promise.resolve();

    expect(commandMocks.setClickThrough).toHaveBeenCalledWith(true);
    expect(commandMocks.setAnimationPaused).toHaveBeenCalledWith(true);
    expect(commandMocks.setWindowScale).toHaveBeenCalledWith(1.25);
    expect(commandMocks.setLaunchOnLogin).toHaveBeenCalledWith(true);
  });

  it("runs maintenance buttons", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.resetWindowPosition.mockResolvedValue(cloneDefaultConfig());
    commandMocks.openConfigDir.mockResolvedValue(undefined);
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="reset-position"]').click();
    await Promise.resolve();
    control<HTMLButtonElement>('[data-action="open-config-dir"]').click();
    await Promise.resolve();

    expect(commandMocks.resetWindowPosition).toHaveBeenCalled();
    expect(commandMocks.openConfigDir).toHaveBeenCalled();
  });

  it("shows a short error and rolls back a failed control change", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.setBehaviorPreset.mockRejectedValue(new Error("save failed"));
    const { bootSettings } = await import("./settings");
    await bootSettings();

    const preset = control<HTMLSelectElement>('[data-setting="behavior-preset"]');
    preset.value = "normal";
    preset.dispatchEvent(new Event("change"));
    await Promise.resolve();

    expect(preset.value).toBe("quiet");
    expect(control<HTMLElement>('[data-role="status"]').textContent).toContain("save failed");
  });

  it("renders maintenance buttons", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    const { bootSettings } = await import("./settings");

    await bootSettings();

    expect(document.body.textContent).toContain("打开日志文件");
    expect(document.body.textContent).toContain("导出配置");
    expect(document.body.textContent).toContain("导入配置");
    expect(document.body.textContent).toContain("恢复默认设置");
    expect(document.body.textContent).toContain("生成诊断信息");
  });

  it("requires a second click before resetting defaults", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.resetConfigToDefaults.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...cloneDefaultConfig().behavior,
        preset: "quiet"
      }
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    const reset = control<HTMLButtonElement>('[data-action="reset-defaults"]');
    reset.click();
    await Promise.resolve();

    expect(commandMocks.resetConfigToDefaults).not.toHaveBeenCalled();
    expect(control<HTMLElement>('[data-role="status"]').textContent).toContain("再次点击确认恢复默认");

    reset.click();
    await Promise.resolve();

    expect(commandMocks.resetConfigToDefaults).toHaveBeenCalled();
  });

  it("exports config and shows the returned path", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.exportConfig.mockResolvedValue({ path: "C:\\Tools\\PicoPet\\data\\config.export.json" });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="export-config"]').click();
    await Promise.resolve();

    expect(commandMocks.exportConfig).toHaveBeenCalled();
    expect(control<HTMLElement>('[data-role="status"]').textContent).toContain("config.export.json");
  });

  it("imports config and refreshes controls from the returned config", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.importConfig.mockResolvedValue({
      ...cloneDefaultConfig(),
      behavior: {
        ...cloneDefaultConfig().behavior,
        preset: "normal",
        walk_mode: "stationary"
      }
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="import-config"]').click();
    await Promise.resolve();

    expect(commandMocks.importConfig).toHaveBeenCalled();
    expect(control<HTMLSelectElement>('[data-setting="behavior-preset"]').value).toBe("normal");
    expect(control<HTMLSelectElement>('[data-setting="walk-mode"]').value).toBe("stationary");
  });

  it("keeps controls unchanged when import fails", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.importConfig.mockRejectedValue(new Error("导入配置解析失败"));
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="import-config"]').click();
    await Promise.resolve();

    expect(control<HTMLSelectElement>('[data-setting="behavior-preset"]').value).toBe("quiet");
    expect(control<HTMLElement>('[data-role="status"]').textContent).toContain("导入配置解析失败");
  });

  it("opens the log file and reports failures", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.openLogFile.mockRejectedValue(new Error("日志文件不存在"));
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="open-log-file"]').click();
    await Promise.resolve();

    expect(commandMocks.openLogFile).toHaveBeenCalled();
    expect(control<HTMLElement>('[data-role="status"]').textContent).toContain("日志文件不存在");
  });

  it("shows diagnostics information", async () => {
    commandMocks.getAppConfig.mockResolvedValue(cloneDefaultConfig());
    commandMocks.getDiagnosticsInfo.mockResolvedValue({
      version: "0.4.0",
      config_dir: "C:\\Tools\\PicoPet\\data",
      config_file: "C:\\Tools\\PicoPet\\data\\config.json",
      log_file: "C:\\Tools\\PicoPet\\data\\picopet.log"
    });
    const { bootSettings } = await import("./settings");
    await bootSettings();

    control<HTMLButtonElement>('[data-action="show-diagnostics"]').click();
    await Promise.resolve();

    const diagnostics = control<HTMLElement>('[data-role="diagnostics"]');
    expect(diagnostics.textContent).toContain("版本: 0.4.0");
    expect(diagnostics.textContent).toContain("配置目录");
    expect(diagnostics.textContent).toContain("picopet.log");
  });
});
