import { invoke } from "@tauri-apps/api/core";

export type AppConfig = {
  window: {
    x: number;
    y: number;
    scale: number;
    always_on_top: boolean;
    click_through: boolean;
  };
  animation: {
    paused: boolean;
    idle_fps: number;
    interactive_fps: number;
  };
  startup: {
    launch_on_login: boolean;
  };
};

export type DiagnosticsInfo = {
  version: string;
  config_dir: string;
  config_file: string;
  log_file: string;
};

export function getAppConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_app_config");
}

export function setAnimationPaused(paused: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_animation_paused", { paused });
}

export function setClickThrough(enabled: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_click_through", { enabled });
}

export function saveWindowPosition(x: number, y: number): Promise<AppConfig> {
  return invoke<AppConfig>("save_window_position", {
    x: Math.round(x),
    y: Math.round(y)
  });
}

export function resetWindowPosition(): Promise<AppConfig> {
  return invoke<AppConfig>("reset_window_position");
}

export function setWindowScale(scale: number): Promise<AppConfig> {
  return invoke<AppConfig>("set_window_scale", { scale });
}

export function getDiagnosticsInfo(): Promise<DiagnosticsInfo> {
  return invoke<DiagnosticsInfo>("get_diagnostics_info");
}

export function setLaunchOnLogin(enabled: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_launch_on_login", { enabled });
}
