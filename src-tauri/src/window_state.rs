use crate::config::AppConfig;
use tauri::WebviewWindow;

#[derive(Debug, PartialEq)]
struct StartupWindowState {
    side: u32,
    x: i32,
    y: i32,
    always_on_top: bool,
    click_through: bool,
}

fn derive_startup_window_state(
    config: &AppConfig,
    screen_width: i32,
    screen_height: i32,
) -> StartupWindowState {
    let side = (160.0 * config.window.scale).round() as u32;
    let config =
        config
            .clone()
            .with_window_bounds(screen_width, screen_height, side as i32, side as i32);

    StartupWindowState {
        side,
        x: config.window.x,
        y: config.window.y,
        always_on_top: true,
        click_through: config.window.click_through,
    }
}

pub fn apply_startup_window_state(
    window: &WebviewWindow,
    config: &AppConfig,
) -> Result<(), String> {
    let monitor = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| *monitor.size());
    let screen_width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let screen_height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let state = derive_startup_window_state(config, screen_width, screen_height);

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: state.side,
            height: state.side,
        }))
        .map_err(|error| error.to_string())?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: state.x,
            y: state.y,
        }))
        .map_err(|error| error.to_string())?;
    window
        .set_always_on_top(state.always_on_top)
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    crate::platform::windows::set_click_through(window, state.click_through)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AppConfig;

    #[test]
    fn startup_window_state_uses_scale_and_normalized_position() {
        let mut config = AppConfig::default();
        config.window.x = 9000;
        config.window.y = 9000;
        config.window.scale = 1.5;

        let state = derive_startup_window_state(&config, 1920, 1080);

        assert_eq!(state.side, 240);
        assert_eq!(state.x, 1600);
        assert_eq!(state.y, 760);
        assert!(state.always_on_top);
        assert!(!state.click_through);
    }

    #[test]
    fn startup_window_state_keeps_scaled_window_inside_screen() {
        let mut config = AppConfig::default();
        config.window.x = 9000;
        config.window.y = 9000;
        config.window.scale = 2.0;

        let state = derive_startup_window_state(&config, 1920, 1080);

        assert_eq!(state.side, 320);
        assert_eq!(state.x, 1520);
        assert_eq!(state.y, 680);
        assert!(state.x + state.side as i32 <= 1920);
        assert!(state.y + state.side as i32 <= 1080);
    }
}
