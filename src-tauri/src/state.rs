use crate::config::{AppConfig, ConfigStore};
use std::{path::PathBuf, sync::Mutex};

#[derive(Debug)]
pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub store: ConfigStore,
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn new(config: AppConfig, store: ConfigStore, data_dir: PathBuf) -> Self {
        Self {
            config: Mutex::new(config),
            store,
            data_dir,
        }
    }
}
