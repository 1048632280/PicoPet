use std::path::Path;
use tauri::{utils::config::WindowConfig, WebviewWindow, WebviewWindowBuilder};

pub const MAIN_WINDOW_LABEL: &str = "main";

pub fn find_main_window_config(windows: &[WindowConfig]) -> Result<&WindowConfig, String> {
    windows
        .iter()
        .find(|window| window.label == MAIN_WINDOW_LABEL)
        .ok_or_else(|| format!("missing {MAIN_WINDOW_LABEL} window config"))
}

pub fn create_main_window(
    app: &tauri::AppHandle,
    window_config: &WindowConfig,
    data_dir: &Path,
) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::from_config(app, window_config)?
        .data_directory(crate::portable_data::webview_data_dir(data_dir))
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::utils::config::WindowConfig;

    #[test]
    fn finds_main_window_config_by_label() {
        let mut main = WindowConfig::default();
        main.label = "main".to_string();
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings, main];

        let found = find_main_window_config(&windows).unwrap();

        assert_eq!(found.label, "main");
    }

    #[test]
    fn reports_missing_main_window_config() {
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings];

        let error = find_main_window_config(&windows).unwrap_err();

        assert!(error.contains("main"));
    }
}
