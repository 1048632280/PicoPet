mod commands;
pub mod config;
mod state;

use commands::{
    get_app_config, reset_window_position, save_window_position, set_animation_paused,
    set_click_through,
};
use config::ConfigStore;
use state::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let store = ConfigStore::new(config_dir.join("config.json"));
            let config = store.load_or_repair()?;
            app.manage(AppState::new(config, store));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            set_animation_paused,
            save_window_position,
            reset_window_position,
            set_click_through
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PicoPet");
}
