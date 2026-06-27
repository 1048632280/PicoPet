use std::path::Path;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const SETTINGS_WINDOW_LABEL: &str = "settings";
pub const SETTINGS_WINDOW_TITLE: &str = "PicoPet 设置";
pub const SETTINGS_WINDOW_URL: &str = "settings.html";
pub const SETTINGS_WINDOW_WIDTH: f64 = 360.0;
pub const SETTINGS_WINDOW_HEIGHT: f64 = 460.0;

#[derive(Debug, PartialEq, Eq)]
enum SettingsWindowLifecycleAction {
    Create,
    FocusExisting,
}

fn settings_window_lifecycle_action(window_exists: bool) -> SettingsWindowLifecycleAction {
    if window_exists {
        SettingsWindowLifecycleAction::FocusExisting
    } else {
        SettingsWindowLifecycleAction::Create
    }
}

pub fn open_settings_window(app: &AppHandle, data_dir: &Path) -> Result<WebviewWindow, String> {
    let existing_window = app.get_webview_window(SETTINGS_WINDOW_LABEL);

    if let (SettingsWindowLifecycleAction::FocusExisting, Some(window)) = (
        settings_window_lifecycle_action(existing_window.is_some()),
        existing_window,
    )
    {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(window);
    }

    WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App(SETTINGS_WINDOW_URL.into()),
    )
    .title(SETTINGS_WINDOW_TITLE)
    .inner_size(SETTINGS_WINDOW_WIDTH, SETTINGS_WINDOW_HEIGHT)
    .resizable(false)
    .decorations(true)
    .skip_taskbar(false)
    .center()
    .data_directory(crate::portable_data::webview_data_dir(data_dir))
    .build()
    .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_window_constants_match_spec() {
        assert_eq!(SETTINGS_WINDOW_LABEL, "settings");
        assert_eq!(SETTINGS_WINDOW_TITLE, "PicoPet 设置");
        assert_eq!(SETTINGS_WINDOW_WIDTH, 360.0);
        assert_eq!(SETTINGS_WINDOW_HEIGHT, 460.0);
    }

    #[test]
    fn settings_window_url_points_to_settings_html() {
        assert_eq!(SETTINGS_WINDOW_URL, "settings.html");
    }

    #[test]
    fn lifecycle_action_creates_when_missing() {
        assert_eq!(
            settings_window_lifecycle_action(false),
            SettingsWindowLifecycleAction::Create
        );
    }

    #[test]
    fn lifecycle_action_focuses_existing_window() {
        assert_eq!(
            settings_window_lifecycle_action(true),
            SettingsWindowLifecycleAction::FocusExisting
        );
    }

    #[test]
    fn lifecycle_action_recreates_after_close_removes_existing_window() {
        let mut window_exists = false;

        assert_eq!(
            settings_window_lifecycle_action(window_exists),
            SettingsWindowLifecycleAction::Create
        );
        window_exists = true;

        assert_eq!(
            settings_window_lifecycle_action(window_exists),
            SettingsWindowLifecycleAction::FocusExisting
        );
        window_exists = false;

        assert_eq!(
            settings_window_lifecycle_action(window_exists),
            SettingsWindowLifecycleAction::Create
        );
    }
}
