use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub log_file: String,
}

#[tauri::command]
pub fn get_diagnostics_info(app: tauri::AppHandle) -> Result<DiagnosticsInfo, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    let log_file = crate::logging::log_file_path(&app)?;

    Ok(DiagnosticsInfo {
        version: app.package_info().version.to_string(),
        config_dir: config_dir.display().to_string(),
        log_file: log_file.display().to_string(),
    })
}
