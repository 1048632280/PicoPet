use crate::{commands, state::AppState};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindow, Wry,
};

const PAUSE_ID: &str = "toggle_pause";
const CLICK_THROUGH_ID: &str = "toggle_click_through";
const RESET_ID: &str = "reset_position";
const EXIT_ID: &str = "exit";

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
    let exit = MenuItem::with_id(app, EXIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&pause, &click_through, &reset, &exit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .build(app)?;

    let app_handle = app.clone();
    let pause_item = pause.clone();
    let click_through_item = click_through.clone();
    app.on_menu_event(move |app, event| {
        let Some(window) = app.get_webview_window("main") else {
            return;
        };

        match event.id().as_ref() {
            PAUSE_ID => toggle_pause(app, &pause_item),
            CLICK_THROUGH_ID => toggle_click_through(app, &window, &click_through_item),
            RESET_ID => reset_position(app, window),
            EXIT_ID => app_handle.exit(0),
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

fn emit_config(app: &AppHandle, config: crate::config::AppConfig) {
    let _ = app.emit("picopet://config", config);
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
}
