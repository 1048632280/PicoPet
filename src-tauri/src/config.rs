use serde::{Deserialize, Serialize};
use std::{fs, io, path::PathBuf};
use thiserror::Error;

const DEFAULT_X: i32 = 1200;
const DEFAULT_Y: i32 = 680;
const DEFAULT_SCALE: f64 = 1.0;
const MIN_SCALE: f64 = 0.5;
const MAX_SCALE: f64 = 2.0;
const DEFAULT_IDLE_FPS: u16 = 12;
const DEFAULT_INTERACTIVE_FPS: u16 = 30;
const PET_WINDOW_WIDTH: i32 = 160;
const PET_WINDOW_HEIGHT: i32 = 160;
const SCREEN_MARGIN: i32 = 80;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub window: WindowConfig,
    pub animation: AnimationConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            window: WindowConfig::default(),
            animation: AnimationConfig::default(),
        }
    }
}

impl AppConfig {
    pub fn sanitized(mut self) -> Self {
        self.window.scale = self.window.scale.clamp(MIN_SCALE, MAX_SCALE);
        self.window.always_on_top = true;
        if self.animation.idle_fps == 0 || self.animation.idle_fps > DEFAULT_INTERACTIVE_FPS {
            self.animation.idle_fps = DEFAULT_IDLE_FPS;
        }
        if self.animation.interactive_fps < self.animation.idle_fps
            || self.animation.interactive_fps > 60
        {
            self.animation.interactive_fps = DEFAULT_INTERACTIVE_FPS;
        }
        self
    }

    pub fn with_screen_bounds(self, screen_width: i32, screen_height: i32) -> Self {
        self.with_window_bounds(
            screen_width,
            screen_height,
            PET_WINDOW_WIDTH,
            PET_WINDOW_HEIGHT,
        )
    }

    pub fn with_window_bounds(
        mut self,
        screen_width: i32,
        screen_height: i32,
        window_width: i32,
        window_height: i32,
    ) -> Self {
        let max_x = screen_width - window_width;
        let max_y = screen_height - window_height;
        let is_visible = self.window.x >= -SCREEN_MARGIN
            && self.window.y >= -SCREEN_MARGIN
            && self.window.x <= max_x + SCREEN_MARGIN
            && self.window.y <= max_y + SCREEN_MARGIN;

        if !is_visible {
            self.window.x = (screen_width - window_width - SCREEN_MARGIN).max(0);
            self.window.y = (screen_height - window_height - SCREEN_MARGIN).max(0);
        }

        self
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct WindowConfig {
    pub x: i32,
    pub y: i32,
    pub scale: f64,
    pub always_on_top: bool,
    pub click_through: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            x: DEFAULT_X,
            y: DEFAULT_Y,
            scale: DEFAULT_SCALE,
            always_on_top: true,
            click_through: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AnimationConfig {
    pub paused: bool,
    pub idle_fps: u16,
    pub interactive_fps: u16,
}

impl Default for AnimationConfig {
    fn default() -> Self {
        Self {
            paused: false,
            idle_fps: DEFAULT_IDLE_FPS,
            interactive_fps: DEFAULT_INTERACTIVE_FPS,
        }
    }
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("failed to read or write config: {0}")]
    Io(#[from] io::Error),
    #[error("failed to parse config: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone)]
pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load_or_repair(&self) -> Result<AppConfig, ConfigError> {
        if !self.path.exists() {
            let config = AppConfig::default();
            self.save(&config)?;
            return Ok(config);
        }

        let raw = fs::read_to_string(&self.path)?;
        let parsed = serde_json::from_str::<AppConfig>(&raw);
        let config = match parsed {
            Ok(config) => config.sanitized(),
            Err(_) => AppConfig::default(),
        };

        self.save(&config)?;
        Ok(config)
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), ConfigError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let body = serde_json::to_string_pretty(config)?;
        fs::write(&self.path, format!("{body}\n"))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_matches_mvp_constraints() {
        let config = AppConfig::default();

        assert_eq!(config.window.scale, 1.0);
        assert!(config.window.always_on_top);
        assert!(!config.window.click_through);
        assert!(!config.animation.paused);
        assert_eq!(config.animation.idle_fps, 12);
        assert_eq!(config.animation.interactive_fps, 30);
    }

    #[test]
    fn sanitized_config_clamps_scale_and_fps() {
        let mut config = AppConfig::default();
        config.window.scale = 9.0;
        config.animation.idle_fps = 0;
        config.animation.interactive_fps = 120;

        let sanitized = config.sanitized();

        assert_eq!(sanitized.window.scale, 2.0);
        assert_eq!(sanitized.animation.idle_fps, 12);
        assert_eq!(sanitized.animation.interactive_fps, 30);
    }

    #[test]
    fn damaged_config_is_repaired_to_default() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        std::fs::write(&path, "{broken json").unwrap();
        let store = ConfigStore::new(path.clone());

        let config = store.load_or_repair().unwrap();
        let repaired = std::fs::read_to_string(path).unwrap();

        assert_eq!(config, AppConfig::default());
        assert!(repaired.contains("\"click_through\": false"));
    }

    #[test]
    fn offscreen_position_resets_to_bottom_right() {
        let mut config = AppConfig::default();
        config.window.x = 9000;
        config.window.y = 9000;

        let normalized = config.with_screen_bounds(1920, 1080);

        assert_eq!(normalized.window.x, 1680);
        assert_eq!(normalized.window.y, 840);
    }
}
