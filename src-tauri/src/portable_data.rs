use std::{
    env, fs, io,
    path::{Path, PathBuf},
};
use thiserror::Error;

const DATA_DIR_NAME: &str = "data";
const CONFIG_FILE_NAME: &str = "config.json";
const LOG_FILE_NAME: &str = "picopet.log";
const WEBVIEW_DATA_DIR_NAME: &str = "EBWebView";

#[derive(Debug, Error)]
pub enum PortableDataError {
    #[error("failed to resolve current executable path: {0}")]
    CurrentExe(io::Error),
    #[error("current executable path has no parent directory: {0}")]
    MissingExecutableParent(PathBuf),
    #[error("failed to create portable data directory {path}: {source}")]
    CreateDir { path: PathBuf, source: io::Error },
}

pub fn data_dir_for_exe(exe_path: &Path) -> Result<PathBuf, PortableDataError> {
    let parent = exe_path
        .parent()
        .ok_or_else(|| PortableDataError::MissingExecutableParent(exe_path.to_path_buf()))?;
    Ok(parent.join(DATA_DIR_NAME))
}

pub fn current_exe_data_dir() -> Result<PathBuf, PortableDataError> {
    let exe_path = env::current_exe().map_err(PortableDataError::CurrentExe)?;
    data_dir_for_exe(&exe_path)
}

pub fn config_file_path(data_dir: &Path) -> PathBuf {
    data_dir.join(CONFIG_FILE_NAME)
}

pub fn log_file_path(data_dir: &Path) -> PathBuf {
    data_dir.join(LOG_FILE_NAME)
}

pub fn webview_data_dir(data_dir: &Path) -> PathBuf {
    data_dir.join(WEBVIEW_DATA_DIR_NAME)
}

pub fn ensure_data_dirs(data_dir: &Path) -> Result<(), PortableDataError> {
    create_dir(data_dir)?;
    create_dir(&webview_data_dir(data_dir))?;
    Ok(())
}

fn create_dir(path: &Path) -> Result<(), PortableDataError> {
    fs::create_dir_all(path).map_err(|source| PortableDataError::CreateDir {
        path: path.to_path_buf(),
        source,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn data_dir_is_next_to_executable() {
        let exe_path = PathBuf::from(r"C:\Tools\PicoPet\picopet.exe");

        let data_dir = data_dir_for_exe(&exe_path).unwrap();

        assert_eq!(data_dir, PathBuf::from(r"C:\Tools\PicoPet\data"));
    }

    #[test]
    fn portable_file_paths_live_under_data_dir() {
        let data_dir = PathBuf::from(r"C:\Tools\PicoPet\data");

        assert_eq!(config_file_path(&data_dir), data_dir.join("config.json"));
        assert_eq!(log_file_path(&data_dir), data_dir.join("picopet.log"));
        assert_eq!(webview_data_dir(&data_dir), data_dir.join("EBWebView"));
    }

    #[test]
    fn ensure_data_dirs_creates_data_and_webview_dirs() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("PicoPet").join("data");

        ensure_data_dirs(&data_dir).unwrap();

        assert!(data_dir.is_dir());
        assert!(data_dir.join("EBWebView").is_dir());
    }
}
