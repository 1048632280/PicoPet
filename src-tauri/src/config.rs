use serde::{Deserialize, Serialize};
use std::{fs, io, path::PathBuf};
use thiserror::Error;

const DEFAULT_X: i32 = 1200;
const DEFAULT_Y: i32 = 680;
const DEFAULT_SCALE: f64 = 1.0;
const MIN_SCALE: f64 = 0.5;
const MAX_SCALE: f64 = 2.0;
pub const SCALE_STEP: f64 = 0.25;
const DEFAULT_IDLE_FPS: u16 = 12;
const DEFAULT_INTERACTIVE_FPS: u16 = 30;
const DEFAULT_BEHAVIOR_PRESET: &str = "quiet";
const SUPPORTED_BEHAVIOR_PRESETS: [&str; 3] = ["quiet", "normal", "lively"];
const DEFAULT_WALK_MODE: &str = "short_range";
const SUPPORTED_WALK_MODES: [&str; 2] = ["stationary", "short_range"];
const DEFAULT_SLEEP_AFTER_IDLE_SECONDS: u32 = 900;
const MIN_SLEEP_AFTER_IDLE_SECONDS: u32 = 60;
const MAX_SLEEP_AFTER_IDLE_SECONDS: u32 = 86_400;
const PET_WINDOW_WIDTH: i32 = 160;
const PET_WINDOW_HEIGHT: i32 = 160;
const SCREEN_MARGIN: i32 = 80;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub window: WindowConfig,
    pub animation: AnimationConfig,
    pub startup: StartupConfig,
    pub behavior: BehaviorConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            window: WindowConfig::default(),
            animation: AnimationConfig::default(),
            startup: StartupConfig::default(),
            behavior: BehaviorConfig::default(),
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
        if !SUPPORTED_BEHAVIOR_PRESETS.contains(&self.behavior.preset.as_str()) {
            self.behavior.preset = DEFAULT_BEHAVIOR_PRESET.to_string();
        }
        if !SUPPORTED_WALK_MODES.contains(&self.behavior.walk_mode.as_str()) {
            self.behavior.walk_mode = DEFAULT_WALK_MODE.to_string();
        }
        self.behavior.sleep_after_idle_seconds = self
            .behavior
            .sleep_after_idle_seconds
            .clamp(MIN_SLEEP_AFTER_IDLE_SECONDS, MAX_SLEEP_AFTER_IDLE_SECONDS);
        self
    }

    pub fn scaled_window_side(&self) -> i32 {
        (PET_WINDOW_WIDTH as f64 * self.window.scale.clamp(MIN_SCALE, MAX_SCALE)).round() as i32
    }

    pub fn with_scale(mut self, scale: f64) -> Self {
        self.window.scale = scale;
        self.sanitized()
    }

    pub fn with_scale_delta(self, delta: f64) -> Self {
        let next = ((self.window.scale + delta) * 100.0).round() / 100.0;
        self.with_scale(next)
    }

    pub fn placed_at_bottom_right(mut self, screen_width: i32, screen_height: i32) -> Self {
        let side = self.scaled_window_side();
        self.window.x = (screen_width - side - SCREEN_MARGIN).max(0);
        self.window.y = (screen_height - side - SCREEN_MARGIN).max(0);
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

    pub fn with_strict_window_bounds(
        mut self,
        screen_width: i32,
        screen_height: i32,
        window_width: i32,
        window_height: i32,
    ) -> Self {
        let max_x = (screen_width - window_width).max(0);
        let max_y = (screen_height - window_height).max(0);

        self.window.x = self.window.x.clamp(0, max_x);
        self.window.y = self.window.y.clamp(0, max_y);

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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct StartupConfig {
    pub launch_on_login: bool,
}

impl Default for StartupConfig {
    fn default() -> Self {
        Self {
            launch_on_login: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct BehaviorConfig {
    pub enabled: bool,
    pub preset: String,
    pub walk_mode: String,
    pub sleep_after_idle_seconds: u32,
}

impl Default for BehaviorConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            preset: DEFAULT_BEHAVIOR_PRESET.to_string(),
            walk_mode: DEFAULT_WALK_MODE.to_string(),
            sleep_after_idle_seconds: DEFAULT_SLEEP_AFTER_IDLE_SECONDS,
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
    fn default_config_disables_launch_on_login() {
        let config = AppConfig::default();

        assert!(!config.startup.launch_on_login);
    }

    #[test]
    fn repaired_config_contains_startup_section() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        let store = ConfigStore::new(path.clone());

        let _ = store.load_or_repair().unwrap();
        let repaired = std::fs::read_to_string(path).unwrap();

        assert!(repaired.contains("\"startup\""));
        assert!(repaired.contains("\"launch_on_login\": false"));
    }

    #[test]
    fn default_config_contains_behavior_section() {
        let config = AppConfig::default();

        assert!(config.behavior.enabled);
        assert_eq!(config.behavior.preset, "quiet");
        assert_eq!(config.behavior.walk_mode, "short_range");
        assert_eq!(config.behavior.sleep_after_idle_seconds, 900);
    }

    #[test]
    fn repaired_config_contains_behavior_section() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        let store = ConfigStore::new(path.clone());

        let _ = store.load_or_repair().unwrap();
        let repaired = std::fs::read_to_string(path).unwrap();

        assert!(repaired.contains("\"behavior\""));
        assert!(repaired.contains("\"enabled\": true"));
        assert!(repaired.contains("\"preset\": \"quiet\""));
        assert!(repaired.contains("\"walk_mode\": \"short_range\""));
        assert!(repaired.contains("\"sleep_after_idle_seconds\": 900"));
    }

    #[test]
    fn old_config_is_repaired_with_default_behavior() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        std::fs::write(
            &path,
            r#"{
  "window": {
    "x": 320,
    "y": 240,
    "scale": 1.25,
    "always_on_top": true,
    "click_through": false
  },
  "animation": {
    "paused": false,
    "idle_fps": 12,
    "interactive_fps": 30
  },
  "startup": {
    "launch_on_login": false
  }
}
"#,
        )
        .unwrap();
        let store = ConfigStore::new(path.clone());

        let config = store.load_or_repair().unwrap();
        let repaired = std::fs::read_to_string(path).unwrap();

        assert_eq!(config.window.x, 320);
        assert_eq!(config.window.y, 240);
        assert_eq!(config.window.scale, 1.25);
        assert!(config.behavior.enabled);
        assert_eq!(config.behavior.preset, "quiet");
        assert!(repaired.contains("\"behavior\""));
    }

    #[test]
    fn sanitized_behavior_config_clamps_unknown_values_and_sleep_timeout() {
        let mut config = AppConfig::default();
        config.behavior.enabled = false;
        config.behavior.preset = "loud".to_string();
        config.behavior.walk_mode = "teleport".to_string();
        config.behavior.sleep_after_idle_seconds = 5;

        let sanitized = config.sanitized();

        assert!(!sanitized.behavior.enabled);
        assert_eq!(sanitized.behavior.preset, "quiet");
        assert_eq!(sanitized.behavior.walk_mode, "short_range");
        assert_eq!(sanitized.behavior.sleep_after_idle_seconds, 60);

        let mut config = AppConfig::default();
        config.behavior.sleep_after_idle_seconds = 100_000;

        let sanitized = config.sanitized();

        assert_eq!(sanitized.behavior.sleep_after_idle_seconds, 86_400);
    }

    #[test]
    fn sanitized_behavior_config_accepts_v021_presets() {
        for preset in ["quiet", "normal", "lively"] {
            let mut config = AppConfig::default();
            config.behavior.preset = preset.to_string();

            let sanitized = config.sanitized();

            assert_eq!(sanitized.behavior.preset, preset);
            assert_eq!(sanitized.behavior.walk_mode, "short_range");
        }
    }

    #[test]
    fn sanitized_behavior_config_accepts_stationary_and_short_range_walk_modes() {
        for walk_mode in ["stationary", "short_range"] {
            let mut config = AppConfig::default();
            config.behavior.walk_mode = walk_mode.to_string();

            let sanitized = config.sanitized();

            assert_eq!(sanitized.behavior.walk_mode, walk_mode);
            assert_eq!(sanitized.behavior.preset, "quiet");
        }
    }

    #[test]
    fn sanitized_behavior_config_repairs_roaming_and_unknown_walk_modes() {
        for walk_mode in ["roaming", "teleport"] {
            let mut config = AppConfig::default();
            config.behavior.walk_mode = walk_mode.to_string();

            let sanitized = config.sanitized();

            assert_eq!(sanitized.behavior.walk_mode, "short_range");
        }
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
    fn with_scale_clamps_to_supported_range() {
        let config = AppConfig::default().with_scale(9.0);

        assert_eq!(config.window.scale, 2.0);

        let config = AppConfig::default().with_scale(0.1);

        assert_eq!(config.window.scale, 0.5);
    }

    #[test]
    fn with_scale_delta_moves_by_fixed_step() {
        let mut config = AppConfig::default();
        config.window.scale = 1.0;

        let larger = config.clone().with_scale_delta(0.25);
        let smaller = config.with_scale_delta(-0.25);

        assert_eq!(larger.window.scale, 1.25);
        assert_eq!(smaller.window.scale, 0.75);
    }

    #[test]
    fn strict_window_bounds_clamps_scaled_position_inside_screen() {
        let mut config = AppConfig::default();
        config.window.x = 1660;
        config.window.y = 20;
        config.window.scale = 2.0;

        let side = config.scaled_window_side();
        let normalized = config.with_strict_window_bounds(1920, 1080, side, side);

        assert_eq!(normalized.window.x, 1600);
        assert_eq!(normalized.window.y, 20);
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

    #[test]
    fn explicit_bottom_right_reset_moves_visible_default_position() {
        let config = AppConfig::default();

        let reset = config.placed_at_bottom_right(1920, 1080);

        assert_eq!(reset.window.x, 1680);
        assert_eq!(reset.window.y, 840);
    }

    #[test]
    fn explicit_bottom_right_reset_uses_scaled_window_size_and_preserves_fields() {
        let mut config = AppConfig::default();
        config.window.x = 25;
        config.window.y = 35;
        config.window.scale = 1.5;
        config.window.click_through = true;
        config.animation.paused = true;

        let reset = config.placed_at_bottom_right(1920, 1080);

        assert_eq!(reset.window.x, 1600);
        assert_eq!(reset.window.y, 760);
        assert_eq!(reset.window.scale, 1.5);
        assert!(reset.window.click_through);
        assert!(reset.animation.paused);
    }
}
