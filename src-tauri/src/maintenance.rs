use crate::config::AppConfig;
use serde::Serialize;
use std::path::{Path, PathBuf};

pub const CONFIG_EXPORT_FILE_NAME: &str = "config.export.json";
pub const CONFIG_IMPORT_FILE_NAME: &str = "config.import.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct MaintenanceFileResult {
    pub path: String,
}

pub fn export_config_to_data_dir(
    config: &AppConfig,
    data_dir: &Path,
) -> Result<MaintenanceFileResult, String> {
    let path = crate::portable_data::config_export_file_path(data_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let sanitized = config.clone().sanitized();
    let body = serde_json::to_string_pretty(&sanitized).map_err(|error| error.to_string())?;
    std::fs::write(&path, format!("{body}\n")).map_err(|error| error.to_string())?;
    Ok(MaintenanceFileResult {
        path: path.display().to_string(),
    })
}

pub fn import_config_from_data_dir(data_dir: &Path) -> Result<AppConfig, String> {
    let path = crate::portable_data::config_import_file_path(data_dir);
    if !path.exists() {
        return Err(format!("导入配置文件不存在: {}", path.display()));
    }
    let raw = std::fs::read_to_string(&path).map_err(|error| error.to_string())?;
    serde_json::from_str::<AppConfig>(&raw)
        .map(|config| config.sanitized())
        .map_err(|error| format!("导入配置解析失败 {}: {error}", path.display()))
}

pub fn existing_log_file_path(data_dir: &Path) -> Result<PathBuf, String> {
    let path = crate::portable_data::log_file_path(data_dir);
    if !path.exists() {
        return Err(format!("日志文件不存在: {}", path.display()));
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_with_values() -> AppConfig {
        let mut config = AppConfig::default();
        config.window.scale = 1.25;
        config.behavior.preset = "lively".to_string();
        config.behavior.walk_mode = "stationary".to_string();
        config
    }

    #[test]
    fn export_config_writes_sanitized_config_to_fixed_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");
        let mut config = config_with_values();
        config.window.always_on_top = false;

        let result = export_config_to_data_dir(&config, &data_dir).unwrap();
        let exported = std::fs::read_to_string(data_dir.join(CONFIG_EXPORT_FILE_NAME)).unwrap();

        assert_eq!(
            result.path,
            data_dir.join(CONFIG_EXPORT_FILE_NAME).display().to_string()
        );
        assert!(exported.contains("\"scale\": 1.25"));
        assert!(exported.contains("\"always_on_top\": true"));
        assert!(exported.contains("\"preset\": \"lively\""));
        assert!(exported.ends_with('\n'));
    }

    #[test]
    fn import_config_reads_and_sanitizes_fixed_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");
        std::fs::create_dir_all(&data_dir).unwrap();
        std::fs::write(
            data_dir.join(CONFIG_IMPORT_FILE_NAME),
            r#"{
  "window": {
    "x": 11,
    "y": 22,
    "scale": 9.0,
    "always_on_top": false,
    "click_through": true
  },
  "animation": {
    "paused": true,
    "idle_fps": 12,
    "interactive_fps": 30
  },
  "startup": {
    "launch_on_login": false
  },
  "behavior": {
    "enabled": true,
    "preset": "normal",
    "walk_mode": "roaming",
    "sleep_after_idle_seconds": 5
  }
}
"#,
        )
        .unwrap();

        let imported = import_config_from_data_dir(&data_dir).unwrap();

        assert_eq!(imported.window.x, 11);
        assert_eq!(imported.window.y, 22);
        assert_eq!(imported.window.scale, 2.0);
        assert!(imported.window.always_on_top);
        assert_eq!(imported.behavior.preset, "normal");
        assert_eq!(imported.behavior.walk_mode, "short_range");
        assert_eq!(imported.behavior.sleep_after_idle_seconds, 60);
    }

    #[test]
    fn import_config_missing_file_returns_clear_error() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");

        let error = import_config_from_data_dir(&data_dir).unwrap_err();

        assert!(error.contains("config.import.json"));
        assert!(error.contains("不存在") || error.contains("missing"));
    }

    #[test]
    fn import_config_bad_json_returns_clear_error() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");
        std::fs::create_dir_all(&data_dir).unwrap();
        std::fs::write(data_dir.join(CONFIG_IMPORT_FILE_NAME), "{broken json").unwrap();

        let error = import_config_from_data_dir(&data_dir).unwrap_err();

        assert!(error.contains("config.import.json"));
        assert!(error.contains("解析失败") || error.contains("parse"));
    }

    #[test]
    fn existing_log_file_path_requires_real_log_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");

        let error = existing_log_file_path(&data_dir).unwrap_err();

        assert!(error.contains("日志文件不存在"));
    }

    #[test]
    fn existing_log_file_path_returns_portable_log_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("data");
        std::fs::create_dir_all(&data_dir).unwrap();
        let log_file = data_dir.join("picopet.log");
        std::fs::write(&log_file, "PicoPet 启动\n").unwrap();

        let path = existing_log_file_path(&data_dir).unwrap();

        assert_eq!(path, log_file);
    }
}
