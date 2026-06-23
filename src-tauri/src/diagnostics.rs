use crate::{portable_data, state::AppState};
use serde::Serialize;
use std::path::Path;
use tauri::Manager;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub config_file: String,
    pub log_file: String,
}

pub fn diagnostics_info(version: &str, data_dir: &Path) -> DiagnosticsInfo {
    DiagnosticsInfo {
        version: version.to_string(),
        config_dir: data_dir.display().to_string(),
        config_file: portable_data::config_file_path(data_dir)
            .display()
            .to_string(),
        log_file: portable_data::log_file_path(data_dir).display().to_string(),
    }
}

#[tauri::command]
pub fn get_diagnostics_info(app: tauri::AppHandle) -> Result<DiagnosticsInfo, String> {
    let state = app.state::<AppState>();

    Ok(diagnostics_info(
        &app.package_info().version.to_string(),
        &state.data_dir,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn diagnostics_reports_portable_paths() {
        let data_dir = PathBuf::from(r"C:\Tools\PicoPet\data");

        let info = diagnostics_info("0.1.0", &data_dir);

        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.config_dir, data_dir.display().to_string());
        assert_eq!(
            info.config_file,
            data_dir.join("config.json").display().to_string()
        );
        assert_eq!(
            info.log_file,
            data_dir.join("picopet.log").display().to_string()
        );
    }
}
