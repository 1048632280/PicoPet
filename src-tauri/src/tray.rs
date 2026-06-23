use crate::{commands, state::AppState};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindow, Wry,
};

const PAUSE_ID: &str = "toggle_pause";
const CLICK_THROUGH_ID: &str = "toggle_click_through";
const RESET_ID: &str = "reset_position";
const SCALE_UP_ID: &str = "scale_up";
const SCALE_DOWN_ID: &str = "scale_down";
const SCALE_RESET_ID: &str = "scale_reset";
const EXIT_ID: &str = "exit";

#[derive(Debug, PartialEq, Eq)]
enum MenuEventAction {
    PersistWindowPositionAndExit,
    UseMainWindow,
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let initial_config = app
        .state::<AppState>()
        .config
        .lock()
        .map(|config| config.clone())
        .unwrap_or_default();

    let pause = MenuItem::with_id(
        app,
        PAUSE_ID,
        pause_label(initial_config.animation.paused),
        true,
        None::<&str>,
    )?;
    let click_through = MenuItem::with_id(
        app,
        CLICK_THROUGH_ID,
        click_through_label(initial_config.window.click_through),
        true,
        None::<&str>,
    )?;
    let reset = MenuItem::with_id(app, RESET_ID, "重置位置", true, None::<&str>)?;
    let scale_up = MenuItem::with_id(app, SCALE_UP_ID, "放大", true, None::<&str>)?;
    let scale_down = MenuItem::with_id(app, SCALE_DOWN_ID, "缩小", true, None::<&str>)?;
    let scale_reset = MenuItem::with_id(app, SCALE_RESET_ID, "重置大小", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, EXIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &pause,
            &click_through,
            &reset,
            &scale_up,
            &scale_down,
            &scale_reset,
            &exit,
        ],
    )?;

    let mut tray_builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("PicoPet")
        .show_menu_on_left_click(true);
    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }
    tray_builder.build(app)?;

    let app_handle = app.clone();
    let pause_item = pause.clone();
    let click_through_item = click_through.clone();
    app.on_menu_event(move |app, event| {
        let event_id = event.id();
        let event_id = event_id.as_ref();

        if menu_event_action(event_id) == MenuEventAction::PersistWindowPositionAndExit {
            if let Some(window) = app.get_webview_window("main") {
                save_window_position_before_exit(app, window);
            }
            app_handle.exit(0);
            return;
        }

        let Some(window) = app.get_webview_window("main") else {
            return;
        };

        match event_id {
            PAUSE_ID => toggle_pause(app, &pause_item),
            CLICK_THROUGH_ID => toggle_click_through(app, &window, &click_through_item),
            RESET_ID => reset_position(app, window),
            SCALE_UP_ID => scale_window(app, window, scale_up_value),
            SCALE_DOWN_ID => scale_window(app, window, scale_down_value),
            SCALE_RESET_ID => scale_window(app, window, |_| 1.0),
            _ => {}
        }
    });

    Ok(())
}

fn pause_label(paused: bool) -> &'static str {
    if paused {
        "继续动画"
    } else {
        "暂停动画"
    }
}

fn click_through_label(enabled: bool) -> &'static str {
    if enabled {
        "关闭点击穿透"
    } else {
        "开启点击穿透"
    }
}

fn menu_event_action(id: &str) -> MenuEventAction {
    if id == EXIT_ID {
        MenuEventAction::PersistWindowPositionAndExit
    } else {
        MenuEventAction::UseMainWindow
    }
}

fn scale_up_value(current: f64) -> f64 {
    crate::config::AppConfig::default()
        .with_scale(current)
        .with_scale_delta(crate::config::SCALE_STEP)
        .window
        .scale
}

fn scale_down_value(current: f64) -> f64 {
    crate::config::AppConfig::default()
        .with_scale(current)
        .with_scale_delta(-crate::config::SCALE_STEP)
        .window
        .scale
}

fn emit_config(app: &AppHandle, config: crate::config::AppConfig) {
    let _ = app.emit("picopet://config", config);
}

fn save_window_position_before_exit(_app: &AppHandle, window: WebviewWindow) {
    if let Err(error) = commands::persist_main_window_position(window) {
        eprintln!("退出前保存窗口位置失败: {error}");
    }
}

fn toggle_pause(app: &AppHandle, pause_item: &MenuItem<Wry>) {
    let state = app.state::<AppState>();
    let paused = state
        .config
        .lock()
        .map(|config| !config.animation.paused)
        .unwrap_or(false);
    if let Ok(config) = commands::set_animation_paused(paused, state) {
        let _ = pause_item.set_text(pause_label(config.animation.paused));
        emit_config(app, config);
    }
}

fn toggle_click_through(
    app: &AppHandle,
    window: &WebviewWindow,
    click_through_item: &MenuItem<Wry>,
) {
    let state = app.state::<AppState>();
    let enabled = state
        .config
        .lock()
        .map(|config| !config.window.click_through)
        .unwrap_or(false);
    if let Ok(config) = commands::set_click_through(enabled, window.clone(), state) {
        let _ = click_through_item.set_text(click_through_label(config.window.click_through));
        emit_config(app, config);
    }
}

fn reset_position(app: &AppHandle, window: WebviewWindow) {
    let state = app.state::<AppState>();
    if let Ok(config) = commands::reset_window_position(window, state) {
        emit_config(app, config);
    }
}

fn scale_window(app: &AppHandle, window: WebviewWindow, next_scale: impl FnOnce(f64) -> f64) {
    let state = app.state::<AppState>();
    let current_scale = state
        .config
        .lock()
        .map(|config| config.window.scale)
        .unwrap_or(1.0);
    if let Ok(config) = commands::set_window_scale(next_scale(current_scale), window, state) {
        emit_config(app, config);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pause_label_matches_current_animation_state() {
        assert_eq!(pause_label(true), "继续动画");
        assert_eq!(pause_label(false), "暂停动画");
    }

    #[test]
    fn click_through_label_matches_current_window_state() {
        assert_eq!(click_through_label(true), "关闭点击穿透");
        assert_eq!(click_through_label(false), "开启点击穿透");
    }

    #[test]
    fn exit_menu_event_persists_window_position_before_exit() {
        assert_eq!(
            menu_event_action(EXIT_ID),
            MenuEventAction::PersistWindowPositionAndExit
        );
    }

    #[test]
    fn non_exit_menu_events_operate_on_main_window() {
        assert_eq!(menu_event_action(PAUSE_ID), MenuEventAction::UseMainWindow);
        assert_eq!(
            menu_event_action(CLICK_THROUGH_ID),
            MenuEventAction::UseMainWindow
        );
        assert_eq!(menu_event_action(RESET_ID), MenuEventAction::UseMainWindow);
    }

    #[test]
    fn scale_menu_event_requires_main_window() {
        assert_eq!(
            menu_event_action(SCALE_UP_ID),
            MenuEventAction::UseMainWindow
        );
        assert_eq!(
            menu_event_action(SCALE_DOWN_ID),
            MenuEventAction::UseMainWindow
        );
        assert_eq!(
            menu_event_action(SCALE_RESET_ID),
            MenuEventAction::UseMainWindow
        );
    }

    #[test]
    fn scale_step_helpers_clamp_at_bounds() {
        assert_eq!(scale_up_value(1.0), 1.25);
        assert_eq!(scale_up_value(2.0), 2.0);
        assert_eq!(scale_down_value(1.0), 0.75);
        assert_eq!(scale_down_value(0.5), 0.5);
    }
}
