use crate::{
    config::AppConfig,
    window_position::{normalize_position_for_screens, screens_with_primary_first, ScreenRect},
};
use tauri::WebviewWindow;

#[derive(Debug, PartialEq)]
struct StartupWindowState {
    side: u32,
    x: i32,
    y: i32,
    always_on_top: bool,
    click_through: bool,
}

fn derive_startup_window_state(config: &AppConfig, screens: &[ScreenRect]) -> StartupWindowState {
    let side = config.scaled_window_side() as u32;
    let (x, y) = normalize_position_for_screens(
        config.window.x,
        config.window.y,
        side as i32,
        side as i32,
        screens,
    );

    StartupWindowState {
        side,
        x,
        y,
        always_on_top: true,
        click_through: config.window.click_through,
    }
}

pub fn apply_startup_window_state(
    window: &WebviewWindow,
    config: &AppConfig,
) -> Result<(), String> {
    let screen_from_monitor = |monitor: &tauri::Monitor| {
        let position = monitor.position();
        let size = monitor.size();
        ScreenRect {
            x: position.x,
            y: position.y,
            width: size.width as i32,
            height: size.height as i32,
        }
    };
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
    let state = derive_startup_window_state(config, &screens);

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

        let screens = [ScreenRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        }];

        let state = derive_startup_window_state(&config, &screens);

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

        let screens = [ScreenRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        }];

        let state = derive_startup_window_state(&config, &screens);

        assert_eq!(state.side, 320);
        assert_eq!(state.x, 1520);
        assert_eq!(state.y, 680);
        assert!(state.x + state.side as i32 <= 1920);
        assert!(state.y + state.side as i32 <= 1080);
    }
}
