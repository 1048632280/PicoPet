use crate::{
    config::AppConfig,
    main_window::MAIN_WINDOW_LABEL,
    maintenance::MaintenanceFileResult,
    state::AppState,
    window_position::{normalize_position_for_screens, screens_with_primary_first, ScreenRect},
};
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow, Window};

pub const CONFIG_EVENT: &str = "picopet://config";

const SUPPORTED_BEHAVIOR_PRESETS: [&str; 3] = ["quiet", "normal", "lively"];
const SUPPORTED_WALK_MODES: [&str; 2] = ["stationary", "short_range"];
const MIN_SLEEP_AFTER_IDLE_SECONDS: u32 = 60;
const MAX_SLEEP_AFTER_IDLE_SECONDS: u32 = 86_400;

fn emit_config(app: &AppHandle, config: &AppConfig) {
    let _ = app.emit(CONFIG_EVENT, config.clone());
}

fn main_window_missing_error() -> String {
    format!("{MAIN_WINDOW_LABEL} window is missing")
}

fn get_main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(main_window_missing_error)
}

fn save_updated_config(
    state: &State<AppState>,
    update: impl FnOnce(&mut AppConfig),
) -> Result<AppConfig, String> {
    let mut guard = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?;
    update(&mut guard);
    *guard = guard.clone().sanitized();
    state
        .store
        .save(&guard)
        .map_err(|error| error.to_string())?;
    Ok(guard.clone())
}

fn save_updated_config_and_emit(
    state: &State<AppState>,
    app: &AppHandle,
    update: impl FnOnce(&mut AppConfig) -> Result<(), String>,
) -> Result<AppConfig, String> {
    let mut guard = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?;
    update(&mut guard)?;
    *guard = guard.clone().sanitized();
    state
        .store
        .save(&guard)
        .map_err(|error| error.to_string())?;
    let config = guard.clone();
    drop(guard);
    emit_config(app, &config);
    Ok(config)
}

fn save_imported_config(state: &AppState, imported: AppConfig) -> Result<AppConfig, String> {
    let config = imported.sanitized();
    let mut guard = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?;
    state
        .store
        .save(&config)
        .map_err(|error| error.to_string())?;
    *guard = config.clone();
    Ok(config)
}

fn apply_behavior_preset(config: &mut AppConfig, preset: &str) -> Result<(), String> {
    if !SUPPORTED_BEHAVIOR_PRESETS.contains(&preset) {
        return Err(format!("unsupported behavior preset: {preset}"));
    }
    config.behavior.preset = preset.to_string();
    Ok(())
}

fn apply_walk_mode(config: &mut AppConfig, walk_mode: &str) -> Result<(), String> {
    if !SUPPORTED_WALK_MODES.contains(&walk_mode) {
        return Err(format!("unsupported walk mode: {walk_mode}"));
    }
    config.behavior.walk_mode = walk_mode.to_string();
    Ok(())
}

fn apply_sleep_after_idle_seconds(config: &mut AppConfig, seconds: u32) {
    config.behavior.sleep_after_idle_seconds =
        seconds.clamp(MIN_SLEEP_AFTER_IDLE_SECONDS, MAX_SLEEP_AFTER_IDLE_SECONDS);
}

fn persist_window_position(config: &mut AppConfig, x: i32, y: i32) {
    config.window.x = x;
    config.window.y = y;
}

fn save_window_position_from_coordinates(
    x: i32,
    y: i32,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        persist_window_position(config, x, y);
    })
}

#[tauri::command]
pub fn get_app_config(state: State<AppState>) -> Result<AppConfig, String> {
    let guard = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn set_animation_paused(
    paused: bool,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| {
        config.animation.paused = paused;
        Ok(())
    })
}

#[tauri::command]
pub fn save_window_position(
    x: i32,
    y: i32,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| {
        persist_window_position(config, x, y);
        Ok(())
    })
}

pub fn save_current_window_position(
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let position = window.outer_position().map_err(|error| error.to_string())?;

    save_window_position_from_coordinates(position.x, position.y, state)
}

pub fn persist_main_window_position(window: WebviewWindow) -> Result<AppConfig, String> {
    let state_window = window.clone();
    let state = state_window.state::<AppState>();
    save_current_window_position(window, state)
}

pub fn persist_main_window_position_from_event_window(
    window: &Window,
) -> Result<AppConfig, String> {
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let state = window.state::<AppState>();
    save_window_position_from_coordinates(position.x, position.y, state)
}

fn screen_from_monitor(monitor: &tauri::Monitor) -> ScreenRect {
    let position = monitor.position();
    let size = monitor.size();
    ScreenRect {
        x: position.x,
        y: position.y,
        width: size.width as i32,
        height: size.height as i32,
    }
}

fn derive_window_geometry_config(config: &AppConfig, screens: &[ScreenRect]) -> AppConfig {
    let mut visible = config.clone();
    let side = visible.scaled_window_side();
    let (x, y) =
        normalize_position_for_screens(visible.window.x, visible.window.y, side, side, screens);
    visible.window.x = x;
    visible.window.y = y;
    visible
}

fn apply_window_geometry(window: &WebviewWindow, config: &AppConfig) -> Result<AppConfig, String> {
    let primary_screen = window
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .as_ref()
        .map(screen_from_monitor);
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let available_screens: Vec<ScreenRect> = monitors.iter().map(screen_from_monitor).collect();
    let screens = screens_with_primary_first(primary_screen, &available_screens);
    let visible = derive_window_geometry_config(config, &screens);
    let side = visible.scaled_window_side();

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: side as u32,
            height: side as u32,
        }))
        .map_err(|error| error.to_string())?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: visible.window.x,
            y: visible.window.y,
        }))
        .map_err(|error| error.to_string())?;

    Ok(visible)
}

#[tauri::command]
pub fn reset_window_position(app: AppHandle, state: State<AppState>) -> Result<AppConfig, String> {
    let window = get_main_window(&app)?;
    let monitor = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| *monitor.size());
    let width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let config = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?
        .clone()
        .sanitized()
        .placed_at_bottom_right(width, height);
    let visible_config = apply_window_geometry(&window, &config)?;

    save_updated_config_and_emit(&state, &app, |current| {
        current.window.x = visible_config.window.x;
        current.window.y = visible_config.window.y;
        Ok(())
    })
}

#[tauri::command]
pub fn set_window_scale(
    scale: f64,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let window = get_main_window(&app)?;
    let next_config = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?
        .clone()
        .with_scale(scale);

    let visible_config = apply_window_geometry(&window, &next_config)?;

    save_updated_config_and_emit(&state, &app, |config| {
        config.window.scale = visible_config.window.scale;
        config.window.x = visible_config.window.x;
        config.window.y = visible_config.window.y;
        Ok(())
    })
}

#[tauri::command]
pub fn set_click_through(
    enabled: bool,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let window = get_main_window(&app)?;
    #[cfg(target_os = "windows")]
    crate::platform::windows::set_click_through(&window, enabled)?;

    save_updated_config_and_emit(&state, &app, |config| {
        config.window.click_through = enabled;
        Ok(())
    })
}

#[tauri::command]
pub fn set_launch_on_login(
    enabled: bool,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
        crate::platform::windows_autostart::set_launch_on_login("PicoPet", &exe_path, enabled)
            .map_err(|error| error.to_string())?;
    }

    crate::logging::append_log(&app, &format!("开机自启动设置为: {enabled}"));

    save_updated_config_and_emit(&state, &app, |config| {
        config.startup.launch_on_login = enabled;
        Ok(())
    })
}

#[tauri::command]
pub fn set_behavior_preset(
    preset: String,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| {
        apply_behavior_preset(config, &preset)
    })
}

#[tauri::command]
pub fn set_walk_mode(
    walk_mode: String,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| apply_walk_mode(config, &walk_mode))
}

#[tauri::command]
pub fn set_sleep_after_idle_seconds(
    seconds: u32,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| {
        apply_sleep_after_idle_seconds(config, seconds);
        Ok(())
    })
}

#[tauri::command]
pub fn reset_config_to_defaults(
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config_and_emit(&state, &app, |config| {
        *config = AppConfig::default().sanitized();
        Ok(())
    })
}

#[tauri::command]
pub fn export_config(state: State<AppState>) -> Result<MaintenanceFileResult, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?
        .clone();
    crate::maintenance::export_config_to_data_dir(&config, &state.data_dir)
}

#[tauri::command]
pub fn import_config(app: AppHandle, state: State<AppState>) -> Result<AppConfig, String> {
    let imported = crate::maintenance::import_config_from_data_dir(&state.data_dir)?;
    let config = save_imported_config(&state, imported)?;
    emit_config(&app, &config);
    Ok(config)
}

#[tauri::command]
pub fn open_log_file(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let log_file = crate::maintenance::existing_log_file_path(&state.data_dir)?;
    std::process::Command::new("explorer")
        .arg(format!("/select,{}", log_file.display()))
        .spawn()
        .map_err(|error| error.to_string())?;
    crate::logging::append_log(&app, "设置窗口打开日志文件");
    Ok(())
}

#[tauri::command]
pub fn open_config_dir(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&state.data_dir)
        .spawn()
        .map_err(|error| error.to_string())?;
    crate::logging::append_log(&app, "设置窗口打开配置目录");
    Ok(())
}

#[tauri::command]
pub fn open_settings_window(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    crate::settings_window::open_settings_window(&app, &state.data_dir).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ConfigStore;

    #[test]
    fn persist_window_position_only_updates_coordinates() {
        let mut config = AppConfig::default();
        config.window.scale = 1.5;
        config.window.click_through = true;
        config.animation.paused = true;

        persist_window_position(&mut config, 320, 480);

        assert_eq!(config.window.x, 320);
        assert_eq!(config.window.y, 480);
        assert_eq!(config.window.scale, 1.5);
        assert!(config.window.click_through);
        assert!(config.animation.paused);
    }

    #[test]
    fn behavior_preset_update_accepts_supported_values() {
        for preset in ["quiet", "normal", "lively"] {
            let mut config = AppConfig::default();

            apply_behavior_preset(&mut config, preset).unwrap();

            assert_eq!(config.behavior.preset, preset);
        }
    }

    #[test]
    fn behavior_preset_update_rejects_unknown_values() {
        let mut config = AppConfig::default();

        let error = apply_behavior_preset(&mut config, "loud").unwrap_err();

        assert!(error.contains("unsupported behavior preset"));
        assert_eq!(config.behavior.preset, "quiet");
    }

    #[test]
    fn walk_mode_update_accepts_supported_values() {
        for walk_mode in ["stationary", "short_range"] {
            let mut config = AppConfig::default();

            apply_walk_mode(&mut config, walk_mode).unwrap();

            assert_eq!(config.behavior.walk_mode, walk_mode);
        }
    }

    #[test]
    fn walk_mode_update_rejects_roaming_and_unknown_values() {
        for walk_mode in ["roaming", "teleport"] {
            let mut config = AppConfig::default();

            let error = apply_walk_mode(&mut config, walk_mode).unwrap_err();

            assert!(error.contains("unsupported walk mode"));
            assert_eq!(config.behavior.walk_mode, "short_range");
        }
    }

    #[test]
    fn sleep_timeout_update_clamps_to_supported_range() {
        let mut low = AppConfig::default();
        apply_sleep_after_idle_seconds(&mut low, 5);
        assert_eq!(low.behavior.sleep_after_idle_seconds, 60);

        let mut high = AppConfig::default();
        apply_sleep_after_idle_seconds(&mut high, 100_000);
        assert_eq!(high.behavior.sleep_after_idle_seconds, 86_400);

        let mut normal = AppConfig::default();
        apply_sleep_after_idle_seconds(&mut normal, 1200);
        assert_eq!(normal.behavior.sleep_after_idle_seconds, 1200);
    }

    #[test]
    fn main_window_missing_error_names_main_window() {
        let error = main_window_missing_error();

        assert!(error.contains("main window is missing"));
    }

    #[test]
    fn scaled_geometry_preserves_position_on_secondary_monitor() {
        let mut config = AppConfig::default();
        config.window.x = 2200;
        config.window.y = 200;
        config.window.scale = 2.0;
        let screens = [
            crate::window_position::ScreenRect {
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
            crate::window_position::ScreenRect {
                x: 1920,
                y: 0,
                width: 1920,
                height: 1080,
            },
        ];

        let visible = derive_window_geometry_config(&config, &screens);

        assert_eq!(visible.window.x, 2200);
        assert_eq!(visible.window.y, 200);
        assert_eq!(visible.window.scale, 2.0);
    }

    #[test]
    fn import_persistence_failure_keeps_in_memory_config_unchanged() {
        let temp_dir = tempfile::tempdir().unwrap();
        let config_path = temp_dir.path().join("config.json");
        std::fs::create_dir(&config_path).unwrap();
        let mut original = AppConfig::default();
        original.window.x = 111;
        original.window.y = 222;
        let mut imported = AppConfig::default();
        imported.window.x = 333;
        imported.window.y = 444;
        let state = AppState::new(
            original.clone(),
            ConfigStore::new(config_path),
            temp_dir.path().to_path_buf(),
        );

        let result = save_imported_config(&state, imported);

        assert!(result.is_err());
        assert_eq!(*state.config.lock().unwrap(), original);
    }

    #[test]
    fn import_persistence_takes_config_lock_before_saving() {
        let temp_dir = tempfile::tempdir().unwrap();
        let config_path = temp_dir.path().join("config.json");
        let state = AppState::new(
            AppConfig::default(),
            ConfigStore::new(config_path.clone()),
            temp_dir.path().to_path_buf(),
        );
        let _ = std::panic::catch_unwind(|| {
            let _guard = state.config.lock().unwrap();
            panic!("poison config lock");
        });

        let result = save_imported_config(&state, AppConfig::default());

        assert_eq!(result.unwrap_err(), "config lock is poisoned");
        assert!(!config_path.exists());
    }
}
