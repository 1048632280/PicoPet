use std::path::Path;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const SETTINGS_WINDOW_LABEL: &str = "settings";
pub const SETTINGS_WINDOW_TITLE: &str = "PicoPet 设置";
pub const SETTINGS_WINDOW_URL: &str = "settings.html";
pub const SETTINGS_WINDOW_WIDTH: f64 = 360.0;
pub const SETTINGS_WINDOW_HEIGHT: f64 = 460.0;

pub fn open_settings_window(app: &AppHandle, data_dir: &Path) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
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
}
