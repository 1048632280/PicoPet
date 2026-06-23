use crate::{portable_data, state::AppState};
use std::{
    fs::OpenOptions,
    io::Write,
    path::{Path, PathBuf},
};
use tauri::Manager;

pub fn log_file_path(data_dir: &Path) -> PathBuf {
    portable_data::log_file_path(data_dir)
}

fn app_log_file_path(app: &tauri::AppHandle) -> PathBuf {
    let state = app.state::<AppState>();
    log_file_path(&state.data_dir)
}

pub fn append_log(app: &tauri::AppHandle, message: &str) {
    let path = app_log_file_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{message}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn log_file_path_uses_portable_data_dir() {
        let data_dir = PathBuf::from(r"C:\Tools\PicoPet\data");

        assert_eq!(log_file_path(&data_dir), data_dir.join("picopet.log"));
    }
}
