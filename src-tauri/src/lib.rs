mod commands;
pub mod config;
mod diagnostics;
mod logging;
mod main_window;
mod platform;
mod portable_data;
mod state;
mod tray;
mod window_position;
mod window_state;

use commands::{
    get_app_config, open_config_dir, reset_window_position, save_window_position,
    set_animation_paused, set_behavior_preset, set_click_through, set_launch_on_login,
    set_sleep_after_idle_seconds, set_walk_mode, set_window_scale,
};
use config::ConfigStore;
use diagnostics::get_diagnostics_info;
use state::AppState;
use tauri::{Manager, WindowEvent};

fn should_persist_main_window_position(label: &str, event: &WindowEvent) -> bool {
    label == "main"
        && matches!(
            event,
            WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed
        )
}

pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if should_persist_main_window_position(window.label(), event) {
                if let Err(error) = commands::persist_main_window_position_from_event_window(window)
                {
                    eprintln!("窗口关闭前保存位置失败: {error}");
                }
            }
        })
        .setup(|app| {
            let data_dir = portable_data::current_exe_data_dir()?;
            portable_data::ensure_data_dirs(&data_dir)?;
            let store = ConfigStore::new(portable_data::config_file_path(&data_dir));
            let config = store.load_or_repair()?;
            app.manage(AppState::new(config.clone(), store, data_dir.clone()));
            logging::append_log(app.handle(), "PicoPet 启动");
            let window_config = main_window::find_main_window_config(&app.config().app.windows)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::NotFound, error))?
                .clone();
            let window = main_window::create_main_window(app.handle(), &window_config, &data_dir)?;
            if let Err(error) = window_state::apply_startup_window_state(&window, &config) {
                eprintln!("窗口状态应用失败: {error}");
            }
            if let Err(error) = tray::setup_tray(app.handle()) {
                eprintln!("托盘初始化失败: {error}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            set_animation_paused,
            save_window_position,
            reset_window_position,
            set_window_scale,
            set_click_through,
            set_launch_on_login,
            set_behavior_preset,
            set_walk_mode,
            set_sleep_after_idle_seconds,
            open_config_dir,
            get_diagnostics_info
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PicoPet");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn destroyed_main_window_event_requires_position_persistence() {
        assert!(should_persist_main_window_position(
            "main",
            &WindowEvent::Destroyed
        ));
    }

    #[test]
    fn destroyed_non_main_window_event_does_not_persist_position() {
        assert!(!should_persist_main_window_position(
            "settings",
            &WindowEvent::Destroyed
        ));
    }
}
