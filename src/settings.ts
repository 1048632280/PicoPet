import "./settings.css";
import {
  exportConfig,
  getAppConfig,
  getDiagnosticsInfo,
  importConfig,
  openConfigDir,
  openLogFile,
  resetConfigToDefaults,
  resetWindowPosition,
  setAnimationPaused,
  setBehaviorPreset,
  setClickThrough,
  setLaunchOnLogin,
  setSleepAfterIdleSeconds,
  setWalkMode,
  setWindowScale,
  type AppConfig,
  type BehaviorPreset,
  type DiagnosticsInfo,
  type WalkMode
} from "./tauri/commands";

type Control = HTMLInputElement | HTMLSelectElement | HTMLButtonElement;

let currentConfig: AppConfig | null = null;
let resetDefaultsConfirmUntil = 0;

const behaviorPresetLabels: Record<BehaviorPreset, string> = {
  quiet: "安静",
  normal: "标准",
  lively: "活跃"
};

const walkModeLabels: Record<WalkMode, string> = {
  stationary: "原地",
  short_range: "小范围"
};

const scaleOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function option(value: string, label: string): string {
  return `<option value="${value}">${label}</option>`;
}

function renderShell(root: HTMLElement) {
  root.innerHTML = `
    <section class="settings-section">
      <h2>行为</h2>
      <label>
        <span>行为强度</span>
        <select data-setting="behavior-preset">
          ${Object.entries(behaviorPresetLabels).map(([value, label]) => option(value, label)).join("")}
        </select>
      </label>
      <label>
        <span>行走模式</span>
        <select data-setting="walk-mode">
          ${Object.entries(walkModeLabels).map(([value, label]) => option(value, label)).join("")}
        </select>
      </label>
      <label>
        <span>睡眠等待时间</span>
        <input data-setting="sleep-seconds" type="number" min="60" max="86400" step="1" />
      </label>
    </section>
    <section class="settings-section">
      <h2>窗口</h2>
      <label class="settings-row">
        <span>点击穿透</span>
        <input data-setting="click-through" type="checkbox" />
      </label>
      <label class="settings-row">
        <span>暂停动画</span>
        <input data-setting="animation-paused" type="checkbox" />
      </label>
      <label>
        <span>缩放</span>
        <select data-setting="window-scale">
          ${scaleOptions.map((value) => option(String(value), `${Math.round(value * 100)}%`)).join("")}
        </select>
      </label>
      <button data-action="reset-position" type="button">重置位置</button>
    </section>
    <section class="settings-section">
      <h2>启动与维护</h2>
      <label class="settings-row">
        <span>开机启动</span>
        <input data-setting="launch-on-login" type="checkbox" />
      </label>
      <div class="maintenance-grid">
        <button data-action="open-config-dir" type="button">打开配置目录</button>
        <button data-action="open-log-file" type="button">打开日志文件</button>
        <button data-action="export-config" type="button">导出配置</button>
        <button data-action="import-config" type="button">导入配置</button>
        <button data-action="reset-defaults" type="button">恢复默认设置</button>
        <button data-action="show-diagnostics" type="button">生成诊断信息</button>
      </div>
      <pre class="settings-diagnostics" data-role="diagnostics" aria-live="polite"></pre>
    </section>
    <p class="settings-status" data-role="status" aria-live="polite"></p>
  `;
}

function find<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing settings control: ${selector}`);
  }
  return element;
}

function setStatus(root: HTMLElement, message: string) {
  find<HTMLElement>(root, '[data-role="status"]').textContent = message;
}

function setPending(control: Control, pending: boolean) {
  control.disabled = pending;
}

function formatMaintenancePath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const dataIndex = normalized.lastIndexOf("/data/");
  return dataIndex >= 0 ? normalized.slice(dataIndex + 1) : path;
}

function formatDiagnostics(info: DiagnosticsInfo): string {
  return [
    `版本: ${info.version}`,
    `配置目录: ${info.config_dir}`,
    `配置文件: ${info.config_file}`,
    `日志文件: ${info.log_file}`
  ].join("\n");
}

function setDiagnostics(root: HTMLElement, text: string) {
  find<HTMLElement>(root, '[data-role="diagnostics"]').textContent = text;
}

function applyConfig(root: HTMLElement, config: AppConfig) {
  currentConfig = config;
  find<HTMLSelectElement>(root, '[data-setting="behavior-preset"]').value = String(config.behavior.preset);
  find<HTMLSelectElement>(root, '[data-setting="walk-mode"]').value = String(config.behavior.walk_mode);
  find<HTMLInputElement>(root, '[data-setting="sleep-seconds"]').value = String(config.behavior.sleep_after_idle_seconds);
  find<HTMLInputElement>(root, '[data-setting="click-through"]').checked = config.window.click_through;
  find<HTMLInputElement>(root, '[data-setting="animation-paused"]').checked = config.animation.paused;
  find<HTMLSelectElement>(root, '[data-setting="window-scale"]').value = String(config.window.scale);
  find<HTMLInputElement>(root, '[data-setting="launch-on-login"]').checked = config.startup.launch_on_login;
}

async function runConfigCommand(root: HTMLElement, control: Control, command: () => Promise<AppConfig>) {
  if (!currentConfig) {
    return;
  }
  const previous = currentConfig;
  setPending(control, true);
  setStatus(root, "保存中");
  try {
    const nextConfig = await command();
    applyConfig(root, nextConfig);
    setStatus(root, "");
  } catch (error) {
    applyConfig(root, previous);
    setStatus(root, error instanceof Error ? error.message : String(error));
  } finally {
    setPending(control, false);
  }
}

async function runVoidCommand(
  root: HTMLElement,
  control: Control,
  command: () => Promise<void>,
  successMessage = ""
) {
  setPending(control, true);
  setStatus(root, "处理中");
  try {
    await command();
    setStatus(root, successMessage);
  } catch (error) {
    setStatus(root, error instanceof Error ? error.message : String(error));
  } finally {
    setPending(control, false);
  }
}

async function runMaintenanceConfigCommand(
  root: HTMLElement,
  control: Control,
  command: () => Promise<AppConfig>,
  successMessage: string
) {
  if (!currentConfig) {
    return;
  }
  const previous = currentConfig;
  setPending(control, true);
  setStatus(root, "处理中");
  try {
    const nextConfig = await command();
    applyConfig(root, nextConfig);
    setStatus(root, successMessage);
  } catch (error) {
    applyConfig(root, previous);
    setStatus(root, error instanceof Error ? error.message : String(error));
  } finally {
    setPending(control, false);
  }
}

async function handleResetDefaultsClick(root: HTMLElement, control: HTMLButtonElement) {
  const now = Date.now();
  if (now > resetDefaultsConfirmUntil) {
    resetDefaultsConfirmUntil = now + 5000;
    setStatus(root, "再次点击确认恢复默认");
    return;
  }
  resetDefaultsConfirmUntil = 0;
  await runMaintenanceConfigCommand(root, control, resetConfigToDefaults, "已恢复默认设置");
}

async function showDiagnosticsInfo(root: HTMLElement, control: HTMLButtonElement) {
  setPending(control, true);
  setStatus(root, "处理中");
  try {
    const info = await getDiagnosticsInfo();
    setDiagnostics(root, formatDiagnostics(info));
    setStatus(root, "已生成诊断信息");
  } catch (error) {
    setStatus(root, error instanceof Error ? error.message : String(error));
  } finally {
    setPending(control, false);
  }
}

function bindControls(root: HTMLElement) {
  find<HTMLSelectElement>(root, '[data-setting="behavior-preset"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLSelectElement;
    void runConfigCommand(root, control, () => setBehaviorPreset(control.value as BehaviorPreset));
  });

  find<HTMLSelectElement>(root, '[data-setting="walk-mode"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLSelectElement;
    void runConfigCommand(root, control, () => setWalkMode(control.value as WalkMode));
  });

  find<HTMLInputElement>(root, '[data-setting="sleep-seconds"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLInputElement;
    void runConfigCommand(root, control, () => setSleepAfterIdleSeconds(Number(control.value)));
  });

  find<HTMLInputElement>(root, '[data-setting="click-through"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLInputElement;
    void runConfigCommand(root, control, () => setClickThrough(control.checked));
  });

  find<HTMLInputElement>(root, '[data-setting="animation-paused"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLInputElement;
    void runConfigCommand(root, control, () => setAnimationPaused(control.checked));
  });

  find<HTMLSelectElement>(root, '[data-setting="window-scale"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLSelectElement;
    void runConfigCommand(root, control, () => setWindowScale(Number(control.value)));
  });

  find<HTMLInputElement>(root, '[data-setting="launch-on-login"]').addEventListener("change", (event) => {
    const control = event.currentTarget as HTMLInputElement;
    void runConfigCommand(root, control, () => setLaunchOnLogin(control.checked));
  });

  find<HTMLButtonElement>(root, '[data-action="reset-position"]').addEventListener("click", (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    void runConfigCommand(root, control, resetWindowPosition);
  });

  find<HTMLButtonElement>(root, '[data-action="open-config-dir"]').addEventListener("click", async (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    setPending(control, true);
    setStatus(root, "");
    try {
      await openConfigDir();
    } catch (error) {
      setStatus(root, error instanceof Error ? error.message : String(error));
    } finally {
      setPending(control, false);
    }
  });

  find<HTMLButtonElement>(root, '[data-action="open-log-file"]').addEventListener("click", (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    void runVoidCommand(root, control, openLogFile);
  });

  find<HTMLButtonElement>(root, '[data-action="export-config"]').addEventListener("click", async (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    setPending(control, true);
    setStatus(root, "处理中");
    try {
      const result = await exportConfig();
      setStatus(root, `已导出到 ${formatMaintenancePath(result.path)}`);
    } catch (error) {
      setStatus(root, error instanceof Error ? error.message : String(error));
    } finally {
      setPending(control, false);
    }
  });

  find<HTMLButtonElement>(root, '[data-action="import-config"]').addEventListener("click", (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    void runMaintenanceConfigCommand(root, control, importConfig, "已导入配置");
  });

  find<HTMLButtonElement>(root, '[data-action="reset-defaults"]').addEventListener("click", (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    void handleResetDefaultsClick(root, control);
  });

  find<HTMLButtonElement>(root, '[data-action="show-diagnostics"]').addEventListener("click", (event) => {
    const control = event.currentTarget as HTMLButtonElement;
    void showDiagnosticsInfo(root, control);
  });
}

export async function bootSettings(root = document.querySelector<HTMLElement>("#settings-root")): Promise<void> {
  if (!root) {
    throw new Error("settings root is missing");
  }
  renderShell(root);
  bindControls(root);
  try {
    applyConfig(root, await getAppConfig());
  } catch (error) {
    setStatus(root, error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.env.MODE !== "test") {
  void bootSettings();
}
