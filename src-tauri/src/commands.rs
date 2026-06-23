use crate::{config::AppConfig, state::AppState};
use tauri::{Manager, State, WebviewWindow};

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

fn persist_window_position(config: &mut AppConfig, x: i32, y: i32) {
    config.window.x = x;
    config.window.y = y;
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
pub fn set_animation_paused(paused: bool, state: State<AppState>) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        config.animation.paused = paused;
    })
}

#[tauri::command]
pub fn save_window_position(x: i32, y: i32, state: State<AppState>) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        persist_window_position(config, x, y);
    })
}

pub fn save_current_window_position(
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let position = window.outer_position().map_err(|error| error.to_string())?;

    save_updated_config(&state, |config| {
        persist_window_position(config, position.x, position.y);
    })
}

pub fn persist_main_window_position(window: WebviewWindow) -> Result<AppConfig, String> {
    let state_window = window.clone();
    let state = state_window.state::<AppState>();
    save_current_window_position(window, state)
}

fn apply_window_geometry(window: &WebviewWindow, config: &AppConfig) -> Result<AppConfig, String> {
    let monitor = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| *monitor.size());
    let width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let side = config.scaled_window_side();
    let visible = config
        .clone()
        .with_strict_window_bounds(width, height, side, side);

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
pub fn reset_window_position(
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
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

    save_updated_config(&state, |current| {
        current.window.x = visible_config.window.x;
        current.window.y = visible_config.window.y;
    })
}

#[tauri::command]
pub fn set_window_scale(
    scale: f64,
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let next_config = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?
        .clone()
        .with_scale(scale);

    let visible_config = apply_window_geometry(&window, &next_config)?;

    save_updated_config(&state, |config| {
        config.window.scale = visible_config.window.scale;
        config.window.x = visible_config.window.x;
        config.window.y = visible_config.window.y;
    })
}

#[tauri::command]
pub fn set_click_through(
    enabled: bool,
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    #[cfg(target_os = "windows")]
    crate::platform::windows::set_click_through(&window, enabled)?;

    save_updated_config(&state, |config| {
        config.window.click_through = enabled;
    })
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
