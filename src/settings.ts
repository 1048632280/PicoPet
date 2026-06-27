import "./settings.css";
import {
  getAppConfig,
  openConfigDir,
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
  type WalkMode
} from "./tauri/commands";

type Control = HTMLInputElement | HTMLSelectElement | HTMLButtonElement;

let currentConfig: AppConfig | null = null;

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
      <button data-action="open-config-dir" type="button">打开配置目录</button>
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
