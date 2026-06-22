use crate::config::{AppConfig, ConfigStore};
use std::sync::Mutex;

#[derive(Debug)]
pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub store: ConfigStore,
}

impl AppState {
    pub fn new(config: AppConfig, store: ConfigStore) -> Self {
        Self {
            config: Mutex::new(config),
            store,
        }
    }
}
