use crate::{config::AppConfig, state::AppState};
use tauri::{State, WebviewWindow};

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
    state.store.save(&guard).map_err(|error| error.to_string())?;
    Ok(guard.clone())
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
        config.window.x = x;
        config.window.y = y;
    })
}

#[tauri::command]
pub fn reset_window_position(
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let monitor = window.primary_monitor().map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| *monitor.size());
    let width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let config = AppConfig::default().with_screen_bounds(width, height);

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: config.window.x,
            y: config.window.y,
        }))
        .map_err(|error| error.to_string())?;

    save_updated_config(&state, |current| {
        current.window.x = config.window.x;
        current.window.y = config.window.y;
    })
}

#[tauri::command]
pub fn set_click_through(
    enabled: bool,
    _window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        config.window.click_through = enabled;
    })
}
