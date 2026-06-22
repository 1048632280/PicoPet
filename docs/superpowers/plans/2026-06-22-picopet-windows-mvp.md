# PicoPet Windows MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-only lightweight desktop pet MVP with a transparent always-on-top pet window, built-in spritesheet animation, tray controls, drag persistence, pause/resume, and a click-through toggle.

**Architecture:** Tauri 2 hosts a Rust app core for window, tray, configuration, and Windows platform operations. A vanilla TypeScript frontend owns only rendering, animation state, and user interaction plumbing through typed Tauri command wrappers.

**Tech Stack:** Tauri 2, Rust stable MSVC toolchain, WebView2, Vite, vanilla TypeScript, Vitest, Canvas 2D, `windows-sys` for Windows extended window styles.

## Global Constraints

- First release is Windows-only.
- Target resident memory is 50-100 MB.
- Use Tauri 2 + Rust + WebView2.
- Do not add Electron, React, Vue, Svelte, Tailwind, or large UI frameworks.
- Use built-in spritesheet/atlas assets only; no external skin packages.
- Default window is transparent, borderless, always on top, and not click-through.
- Tray menu labels are Chinese.
- Persist window position, scale, click-through state, and animation paused state.
- `window.scale` allowed range is exactly 0.5-2.0.
- Idle animation FPS defaults to 12; interactive FPS defaults to 30.
- Comments in source code must be Chinese when comments are necessary.
- All text files are UTF-8.
- Windows installer must account for WebView2 Runtime availability.

---

## Reference Documents

- Approved design spec: `docs/superpowers/specs/2026-06-22-picopet-windows-mvp-design.md`
- Tauri create project docs: <https://v2.tauri.app/start/create-project/>
- Tauri prerequisites: <https://v2.tauri.app/start/prerequisites/>
- Tauri window customization: <https://v2.tauri.app/learn/window-customization/>
- Tauri system tray: <https://v2.tauri.app/learn/system-tray/>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
- Microsoft extended window styles: <https://learn.microsoft.com/en-us/windows/win32/winmsg/extended-window-styles>

## Planned File Structure

```text
E:/GithubRepo/PicoPet/
  package.json
  pnpm-lock.yaml
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  index.html
  docs/
    qa/
      windows-mvp-checklist.md
      memory-baseline.md
    superpowers/
      specs/
        2026-06-22-picopet-windows-mvp-design.md
      plans/
        2026-06-22-picopet-windows-mvp.md
  scripts/
    generate-placeholder-spritesheet.mjs
  src/
    app.ts
    main.ts
    style.css
    app.test.ts
    assets/
      pet/
        pico_idle.json
        pico_idle.png
    pet/
      animationClock.ts
      animationClock.test.ts
      atlas.ts
      atlas.test.ts
      renderer.ts
      renderer.test.ts
      types.ts
    tauri/
      commands.ts
      commands.test.ts
      window.ts
      window.test.ts
  src-tauri/
    Cargo.toml
    build.rs
    tauri.conf.json
    capabilities/
      default.json
    src/
      commands.rs
      config.rs
      lib.rs
      main.rs
      platform/
        mod.rs
        windows.rs
      state.rs
      tray.rs
      window_state.rs
```

## Public Interfaces

Rust interfaces created by the plan:

```rust
pub struct AppConfig;
pub struct WindowConfig;
pub struct AnimationConfig;

impl AppConfig {
    pub fn sanitized(self) -> Self;
    pub fn with_screen_bounds(self, screen_width: i32, screen_height: i32) -> Self;
}

pub struct ConfigStore;

impl ConfigStore {
    pub fn new(path: std::path::PathBuf) -> Self;
    pub fn load_or_repair(&self) -> Result<AppConfig, ConfigError>;
    pub fn save(&self, config: &AppConfig) -> Result<(), ConfigError>;
}

pub struct AppState;

#[tauri::command]
pub fn get_app_config(state: tauri::State<AppState>) -> Result<AppConfig, String>;

#[tauri::command]
pub fn set_animation_paused(paused: bool, state: tauri::State<AppState>) -> Result<AppConfig, String>;

#[tauri::command]
pub fn save_window_position(x: i32, y: i32, state: tauri::State<AppState>) -> Result<AppConfig, String>;

#[tauri::command]
pub fn reset_window_position(window: tauri::WebviewWindow, state: tauri::State<AppState>) -> Result<AppConfig, String>;

#[tauri::command]
pub fn set_click_through(enabled: bool, window: tauri::WebviewWindow, state: tauri::State<AppState>) -> Result<AppConfig, String>;
```

Frontend interfaces created by the plan:

```ts
export type AppConfig = {
  window: {
    x: number;
    y: number;
    scale: number;
    always_on_top: boolean;
    click_through: boolean;
  };
  animation: {
    paused: boolean;
    idle_fps: number;
    interactive_fps: number;
  };
};

export type AtlasManifest = {
  image: string;
  frame_width: number;
  frame_height: number;
  frames: number;
  fps: number;
  loop: boolean;
};

export function normalizeAtlasManifest(input: unknown): AtlasManifest;
export function frameIndexAt(elapsedMs: number, fps: number, frameCount: number): number;
export function shouldRenderFrame(previousMs: number, nowMs: number, fps: number): boolean;
export function getAppConfig(): Promise<AppConfig>;
export function setAnimationPaused(paused: boolean): Promise<AppConfig>;
export function setClickThrough(enabled: boolean): Promise<AppConfig>;
export function saveWindowPosition(x: number, y: number): Promise<AppConfig>;
export function resetWindowPosition(): Promise<AppConfig>;
```

---

### Task 1: Bootstrap Tauri 2 Vanilla TypeScript App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/app.ts`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src/app.test.ts`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: approved design spec.
- Produces: runnable Tauri shell with one transparent borderless always-on-top window labeled `main`.

- [ ] **Step 1: Create frontend package files**

Write `package.json`:

```json
{
  "name": "picopet",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  },
  "packageManager": "pnpm@10.0.0"
}
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    strictPort: true,
    host: "127.0.0.1",
    port: 1420
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2022",
    minify: "esbuild"
  }
});
```

Write `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"]
  }
});
```

- [ ] **Step 2: Create minimal frontend shell**

Write `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PicoPet</title>
  </head>
  <body>
    <canvas id="pet-canvas" width="128" height="128" aria-label="PicoPet"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Write `src/app.ts`:

```ts
import "./style.css";

export function boot(): string {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }
  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
```

Write `src/main.ts`:

```ts
import { boot } from "./app";

void boot();
```

Write `src/style.css`:

```css
:root {
  background: transparent;
  color: transparent;
  font-family: system-ui, sans-serif;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
}

body {
  display: grid;
  place-items: center;
  user-select: none;
}

#pet-canvas {
  width: 128px;
  height: 128px;
  image-rendering: auto;
}
```

Write `src/app.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { boot } from "./app";

describe("boot", () => {
  it("marks the pet canvas as ready", () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';

    expect(boot()).toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
```

- [ ] **Step 3: Create Rust/Tauri shell files**

Write `src-tauri/Cargo.toml`:

```toml
[package]
name = "picopet"
version = "0.1.0"
description = "A lightweight Windows desktop pet"
authors = ["PicoPet contributors"]
edition = "2021"

[lib]
name = "picopet_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2" }

[dependencies]
tauri = { version = "2" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
raw-window-handle = "0.6"
windows-sys = { version = "0.60", features = [
  "Win32_Foundation",
  "Win32_UI_WindowsAndMessaging"
] }

[dev-dependencies]
tempfile = "3"
```

Write `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build();
}
```

Write `src-tauri/src/main.rs`:

```rust
fn main() {
    picopet_lib::run();
}
```

Write `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run PicoPet");
}
```

Write `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "PicoPet",
  "version": "0.1.0",
  "identifier": "com.picopet.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://127.0.0.1:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "label": "main",
        "title": "PicoPet",
        "width": 160,
        "height": 160,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "resizable": false,
        "skipTaskbar": true,
        "shadow": false,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
    "bundle": {
      "active": true,
      "targets": ["nsis"],
      "windows": {
        "webviewInstallMode": {
          "type": "downloadBootstrapper"
      }
    }
  }
}
```

Write `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability for PicoPet main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-outer-position",
    "core:window:allow-set-position"
  ]
}
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
corepack enable
pnpm install
```

Expected:

```text
Packages: +...
Done in ...
```

Also confirm `pnpm-lock.yaml` exists.

- [ ] **Step 5: Run baseline verification**

Run:

```powershell
pnpm test -- --run
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

Expected:

```text
1 passed
test result: ok
vite build ... built
```

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.config.ts index.html src src-tauri
git commit -m "chore: bootstrap tauri windows app"
```

---

### Task 2: Add Rust Configuration Domain

**Files:**
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: no runtime dependencies from earlier tasks beyond Rust crate setup.
- Produces: `AppConfig`, `WindowConfig`, `AnimationConfig`, `ConfigStore`, and `ConfigError`.

- [ ] **Step 1: Write failing Rust config tests**

Create `src-tauri/src/config.rs` with only the test module first:

```rust
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
        assert_eq!(normalized.window.y, 820);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml config
```

Expected: FAIL with unresolved types such as `AppConfig` and `ConfigStore`.

- [ ] **Step 3: Implement configuration domain**

Replace `src-tauri/src/config.rs` with:

```rust
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
        if self.animation.interactive_fps < self.animation.idle_fps || self.animation.interactive_fps > 60 {
            self.animation.interactive_fps = DEFAULT_INTERACTIVE_FPS;
        }
        self
    }

    pub fn with_screen_bounds(mut self, screen_width: i32, screen_height: i32) -> Self {
        let max_x = screen_width - PET_WINDOW_WIDTH;
        let max_y = screen_height - PET_WINDOW_HEIGHT;
        let is_visible = self.window.x >= -SCREEN_MARGIN
            && self.window.y >= -SCREEN_MARGIN
            && self.window.x <= max_x + SCREEN_MARGIN
            && self.window.y <= max_y + SCREEN_MARGIN;

        if !is_visible {
            self.window.x = (screen_width - PET_WINDOW_WIDTH - SCREEN_MARGIN).max(0);
            self.window.y = (screen_height - PET_WINDOW_HEIGHT - SCREEN_MARGIN).max(0);
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
        assert_eq!(normalized.window.y, 820);
    }
}
```

Modify `src-tauri/src/lib.rs`:

```rust
mod config;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run PicoPet");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml config
```

Expected:

```text
running 4 tests
test result: ok. 4 passed
```

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/config.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: add app configuration domain"
```

---

### Task 3: Add Frontend Animation Domain

**Files:**
- Create: `src/pet/types.ts`
- Create: `src/pet/atlas.ts`
- Create: `src/pet/atlas.test.ts`
- Create: `src/pet/animationClock.ts`
- Create: `src/pet/animationClock.test.ts`

**Interfaces:**
- Consumes: no Rust APIs.
- Produces: `AtlasManifest`, `normalizeAtlasManifest`, `frameIndexAt`, and `shouldRenderFrame`.

- [ ] **Step 1: Write failing atlas tests**

Create `src/pet/atlas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeAtlasManifest } from "./atlas";

describe("normalizeAtlasManifest", () => {
  it("accepts a valid atlas manifest", () => {
    expect(
      normalizeAtlasManifest({
        image: "pico_idle.png",
        frame_width: 128,
        frame_height: 128,
        frames: 8,
        fps: 12,
        loop: true
      })
    ).toEqual({
      image: "pico_idle.png",
      frame_width: 128,
      frame_height: 128,
      frames: 8,
      fps: 12,
      loop: true
    });
  });

  it("rejects invalid dimensions", () => {
    expect(() =>
      normalizeAtlasManifest({
        image: "pico_idle.png",
        frame_width: 0,
        frame_height: 128,
        frames: 8,
        fps: 12,
        loop: true
      })
    ).toThrow("invalid atlas frame_width");
  });
});
```

Create `src/pet/animationClock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { frameIndexAt, shouldRenderFrame } from "./animationClock";

describe("animationClock", () => {
  it("calculates a looping frame index", () => {
    expect(frameIndexAt(0, 12, 8)).toBe(0);
    expect(frameIndexAt(84, 12, 8)).toBe(1);
    expect(frameIndexAt(667, 12, 8)).toBe(0);
  });

  it("gates rendering by fps", () => {
    expect(shouldRenderFrame(0, 40, 12)).toBe(false);
    expect(shouldRenderFrame(0, 84, 12)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm test -- --run src/pet/atlas.test.ts src/pet/animationClock.test.ts
```

Expected: FAIL with missing modules `./atlas` and `./animationClock`.

- [ ] **Step 3: Implement animation domain**

Create `src/pet/types.ts`:

```ts
export type AtlasManifest = {
  image: string;
  frame_width: number;
  frame_height: number;
  frames: number;
  fps: number;
  loop: boolean;
};
```

Create `src/pet/atlas.ts`:

```ts
import type { AtlasManifest } from "./types";

function requirePositiveInteger(value: unknown, field: keyof AtlasManifest): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`invalid atlas ${field}`);
  }
  return Number(value);
}

export function normalizeAtlasManifest(input: unknown): AtlasManifest {
  if (!input || typeof input !== "object") {
    throw new Error("invalid atlas manifest");
  }

  const manifest = input as Record<string, unknown>;
  if (typeof manifest.image !== "string" || manifest.image.length === 0) {
    throw new Error("invalid atlas image");
  }
  if (typeof manifest.loop !== "boolean") {
    throw new Error("invalid atlas loop");
  }

  return {
    image: manifest.image,
    frame_width: requirePositiveInteger(manifest.frame_width, "frame_width"),
    frame_height: requirePositiveInteger(manifest.frame_height, "frame_height"),
    frames: requirePositiveInteger(manifest.frames, "frames"),
    fps: requirePositiveInteger(manifest.fps, "fps"),
    loop: manifest.loop
  };
}
```

Create `src/pet/animationClock.ts`:

```ts
export function frameIndexAt(elapsedMs: number, fps: number, frameCount: number): number {
  if (fps <= 0 || frameCount <= 0) {
    return 0;
  }
  const frameDurationMs = 1000 / fps;
  return Math.floor(elapsedMs / frameDurationMs) % frameCount;
}

export function shouldRenderFrame(previousMs: number, nowMs: number, fps: number): boolean {
  if (fps <= 0) {
    return false;
  }
  return nowMs - previousMs >= 1000 / fps;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm test -- --run src/pet/atlas.test.ts src/pet/animationClock.test.ts
```

Expected:

```text
2 files passed
4 tests passed
```

- [ ] **Step 5: Commit**

```powershell
git add src/pet
git commit -m "feat: add animation domain"
```

---

### Task 4: Generate Built-In Spritesheet and Canvas Renderer

**Files:**
- Create: `scripts/generate-placeholder-spritesheet.mjs`
- Create: `src/assets/pet/pico_idle.json`
- Create: `src/assets/pet/pico_idle.png`
- Create: `src/pet/renderer.ts`
- Create: `src/pet/renderer.test.ts`
- Modify: `src/app.ts`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `AtlasManifest`, `normalizeAtlasManifest`, and `frameIndexAt`.
- Produces: `PetRenderer` with `renderFrame(frameIndex: number)` and `renderFallback()` methods.

- [ ] **Step 1: Write failing renderer tests**

Create `src/pet/renderer.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { PetRenderer } from "./renderer";
import type { AtlasManifest } from "./types";

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  return canvas;
}

function createContextMock() {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D & { drawImage: ReturnType<typeof vi.fn> };
}

describe("PetRenderer", () => {
  const atlas: AtlasManifest = {
    image: "pico_idle.png",
    frame_width: 128,
    frame_height: 128,
    frames: 8,
    fps: 12,
    loop: true
  };

  it("renders fallback when no image is available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(createContextMock());
    const canvas = createCanvas();
    const renderer = new PetRenderer(canvas, atlas);

    expect(() => renderer.renderFallback()).not.toThrow();
  });

  it("does not draw out-of-range frames", () => {
    const context = createContextMock();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const canvas = createCanvas();
    const renderer = new PetRenderer(canvas, atlas);

    renderer.renderFrame(99);

    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test -- --run src/pet/renderer.test.ts
```

Expected: FAIL with missing module `./renderer`.

- [ ] **Step 3: Add deterministic placeholder spritesheet generator**

Create `scripts/generate-placeholder-spritesheet.mjs`:

```js
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const assetDir = join(root, "src", "assets", "pet");
const frameWidth = 128;
const frameHeight = 128;
const frames = 8;
const width = frameWidth * frames;
const height = frameHeight;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng() {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const frame = Math.floor(x / frameWidth);
      const localX = x % frameWidth;
      const dx = localX - 64;
      const dy = y - 68 + Math.sin(frame / frames * Math.PI * 2) * 5;
      const body = Math.hypot(dx, dy) <= 38;
      const eyeLeft = Math.hypot(localX - 50, y - 58) <= 4;
      const eyeRight = Math.hypot(localX - 78, y - 58) <= 4;
      const offset = row + 1 + x * 4;

      if (body) {
        raw[offset] = 80 + frame * 12;
        raw[offset + 1] = 160;
        raw[offset + 2] = 220;
        raw[offset + 3] = 255;
      }
      if (eyeLeft || eyeRight) {
        raw[offset] = 20;
        raw[offset + 1] = 30;
        raw[offset + 2] = 40;
        raw[offset + 3] = 255;
      }
    }
  }

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

mkdirSync(assetDir, { recursive: true });
writeFileSync(join(assetDir, "pico_idle.png"), createPng());
writeFileSync(
  join(assetDir, "pico_idle.json"),
  `${JSON.stringify(
    {
      image: "pico_idle.png",
      frame_width: frameWidth,
      frame_height: frameHeight,
      frames,
      fps: 12,
      loop: true
    },
    null,
    2
  )}\n`
);

console.log(`Generated ${join(assetDir, "pico_idle.png")}`);
```

Run:

```powershell
node scripts/generate-placeholder-spritesheet.mjs
```

Expected:

```text
Generated E:\GithubRepo\PicoPet\src\assets\pet\pico_idle.png
```

- [ ] **Step 4: Implement renderer**

Create `src/pet/renderer.ts`:

```ts
import type { AtlasManifest } from "./types";

export class PetRenderer {
  private readonly context: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly atlas: AtlasManifest
  ) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2d canvas is unavailable");
    }
    this.context = context;
    this.canvas.width = atlas.frame_width;
    this.canvas.height = atlas.frame_height;
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
  }

  renderFrame(frameIndex: number): void {
    if (!this.image || frameIndex < 0 || frameIndex >= this.atlas.frames) {
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(
      this.image,
      frameIndex * this.atlas.frame_width,
      0,
      this.atlas.frame_width,
      this.atlas.frame_height,
      0,
      0,
      this.atlas.frame_width,
      this.atlas.frame_height
    );
  }

  renderFallback(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "rgba(80, 160, 220, 0.92)";
    this.context.beginPath();
    this.context.arc(this.canvas.width / 2, this.canvas.height / 2, 38, 0, Math.PI * 2);
    this.context.fill();
    this.context.fillStyle = "rgba(20, 30, 40, 1)";
    this.context.beginPath();
    this.context.arc(50, 58, 4, 0, Math.PI * 2);
    this.context.arc(78, 58, 4, 0, Math.PI * 2);
    this.context.fill();
  }
}
```

- [ ] **Step 5: Wire renderer into frontend**

Replace `src/app.ts`:

```ts
import "./style.css";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { normalizeAtlasManifest } from "./pet/atlas";
import { PetRenderer } from "./pet/renderer";

export function boot(): string {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }

  const atlas = normalizeAtlasManifest(idleAtlasRaw);
  const renderer = new PetRenderer(canvas, atlas);
  const image = new Image();
  let startedAt = performance.now();
  let previousFrameAt = 0;

  image.onload = () => {
    renderer.setImage(image);
    requestAnimationFrame(tick);
  };
  image.onerror = () => renderer.renderFallback();
  image.src = idleImageUrl;

  function tick(now: number) {
    if (shouldRenderFrame(previousFrameAt, now, atlas.fps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, atlas.fps, atlas.frames));
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
```

Replace `src/main.ts`:

```ts
import { boot } from "./app";

void boot();
```

Replace `src/app.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { boot } from "./app";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D);
});

describe("boot", () => {
  it("marks the pet canvas as ready", () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';

    expect(boot()).toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
```

Update `src/style.css`:

```css
:root {
  background: transparent;
  color: transparent;
  font-family: system-ui, sans-serif;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
}

body {
  display: grid;
  place-items: center;
  user-select: none;
}

#pet-canvas {
  width: 128px;
  height: 128px;
  display: block;
  image-rendering: auto;
  cursor: grab;
}

#pet-canvas:active {
  cursor: grabbing;
}
```

- [ ] **Step 6: Run tests and build**

Run:

```powershell
pnpm test -- --run src/pet/renderer.test.ts src/app.test.ts
pnpm build
```

Expected:

```text
2 files passed
vite build ... built
```

- [ ] **Step 7: Commit**

```powershell
git add scripts src/assets src/pet/renderer.ts src/pet/renderer.test.ts src/app.ts src/main.ts src/style.css src/app.test.ts
git commit -m "feat: add built-in pet renderer"
```

---

### Task 5: Add Rust App State and Tauri Command Bridge

**Files:**
- Create: `src-tauri/src/state.rs`
- Create: `src-tauri/src/commands.rs`
- Create: `src/tauri/commands.ts`
- Create: `src/tauri/commands.test.ts`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `ConfigStore` and `AppConfig`.
- Produces: typed Tauri commands and frontend command wrappers.

- [ ] **Step 1: Write failing command wrapper tests**

Create `src/tauri/commands.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args?: unknown) => ({ command, args }))
}));

describe("command wrappers", () => {
  it("calls set_animation_paused with the expected payload", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { setAnimationPaused } = await import("./commands");

    await setAnimationPaused(true);

    expect(invoke).toHaveBeenCalledWith("set_animation_paused", { paused: true });
  });

  it("calls save_window_position with integer coordinates", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { saveWindowPosition } = await import("./commands");

    await saveWindowPosition(12.8, 99.2);

    expect(invoke).toHaveBeenCalledWith("save_window_position", { x: 13, y: 99 });
  });
});
```

- [ ] **Step 2: Run frontend test to verify it fails**

Run:

```powershell
pnpm test -- --run src/tauri/commands.test.ts
```

Expected: FAIL with missing module `./commands`.

- [ ] **Step 3: Implement frontend command wrappers**

Create `src/tauri/commands.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

export type AppConfig = {
  window: {
    x: number;
    y: number;
    scale: number;
    always_on_top: boolean;
    click_through: boolean;
  };
  animation: {
    paused: boolean;
    idle_fps: number;
    interactive_fps: number;
  };
};

export function getAppConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_app_config");
}

export function setAnimationPaused(paused: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_animation_paused", { paused });
}

export function setClickThrough(enabled: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_click_through", { enabled });
}

export function saveWindowPosition(x: number, y: number): Promise<AppConfig> {
  return invoke<AppConfig>("save_window_position", {
    x: Math.round(x),
    y: Math.round(y)
  });
}

export function resetWindowPosition(): Promise<AppConfig> {
  return invoke<AppConfig>("reset_window_position");
}
```

- [ ] **Step 4: Write Rust state and command implementation**

Create `src-tauri/src/state.rs`:

```rust
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
```

Create `src-tauri/src/commands.rs`:

```rust
use crate::{config::AppConfig, state::AppState};
use tauri::{Manager, State, WebviewWindow};

fn save_updated_config(
    state: &State<AppState>,
    update: impl FnOnce(&mut AppConfig),
) -> Result<AppConfig, String> {
    let mut guard = state.config.lock().map_err(|_| "config lock is poisoned".to_string())?;
    update(&mut guard);
    *guard = guard.clone().sanitized();
    state.store.save(&guard).map_err(|error| error.to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn get_app_config(state: State<AppState>) -> Result<AppConfig, String> {
    let guard = state.config.lock().map_err(|_| "config lock is poisoned".to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn set_animation_paused(paused: bool, state: State<AppState>) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        config.animation.paused = paused;
    })
}

#[tauri::command]
pub fn save_window_position(x: i32, y: i32, state: State<AppState>) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        config.window.x = x;
        config.window.y = y;
    })
}

#[tauri::command]
pub fn reset_window_position(window: WebviewWindow, state: State<AppState>) -> Result<AppConfig, String> {
    let monitor = window.primary_monitor().map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| monitor.size().clone());
    let width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let config = AppConfig::default().with_screen_bounds(width, height);

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: config.window.x,
            y: config.window.y,
        }))
        .map_err(|error| error.to_string())?;

    save_updated_config(&state, |current| {
        current.window.x = config.window.x;
        current.window.y = config.window.y;
    })
}

#[tauri::command]
pub fn set_click_through(enabled: bool, _window: WebviewWindow, state: State<AppState>) -> Result<AppConfig, String> {
    save_updated_config(&state, |config| {
        config.window.click_through = enabled;
    })
}
```

Modify `src-tauri/src/lib.rs`:

```rust
mod commands;
mod config;
mod state;

use commands::{
    get_app_config, reset_window_position, save_window_position, set_animation_paused,
    set_click_through,
};
use config::{AppConfig, ConfigStore};
use state::AppState;

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
```

- [ ] **Step 5: Run verification**

Run:

```powershell
pnpm test -- --run src/tauri/commands.test.ts
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

Expected:

```text
2 tests passed
test result: ok
vite build ... built
```

- [ ] **Step 6: Commit**

```powershell
git add src/tauri src-tauri/src
git commit -m "feat: add tauri config commands"
```

---

### Task 6: Add Drag Persistence and Pause-Aware Animation Loop

**Files:**
- Create: `src/tauri/window.ts`
- Create: `src/tauri/window.test.ts`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `saveWindowPosition`, `getAppConfig`, and `setAnimationPaused`.
- Produces: `persistPositionAfterDrag(windowApi, savePosition)` and pause-aware rendering in `main.ts`.

- [ ] **Step 1: Write failing drag persistence tests**

Create `src/tauri/window.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { persistPositionAfterDrag } from "./window";

describe("persistPositionAfterDrag", () => {
  it("starts native dragging and saves the final outer position", async () => {
    const windowApi = {
      startDragging: vi.fn(async () => undefined),
      outerPosition: vi.fn(async () => ({ x: 42, y: 64 }))
    };
    const savePosition = vi.fn(async () => undefined);

    await persistPositionAfterDrag(windowApi, savePosition);

    expect(windowApi.startDragging).toHaveBeenCalledTimes(1);
    expect(windowApi.outerPosition).toHaveBeenCalledTimes(1);
    expect(savePosition).toHaveBeenCalledWith(42, 64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test -- --run src/tauri/window.test.ts
```

Expected: FAIL with missing module `./window`.

- [ ] **Step 3: Implement drag helper**

Create `src/tauri/window.ts`:

```ts
export type DragWindowApi = {
  startDragging(): Promise<void>;
  outerPosition(): Promise<{ x: number; y: number }>;
};

export async function persistPositionAfterDrag(
  windowApi: DragWindowApi,
  savePosition: (x: number, y: number) => Promise<unknown>
): Promise<void> {
  await windowApi.startDragging();
  const position = await windowApi.outerPosition();
  await savePosition(position.x, position.y);
}
```

- [ ] **Step 4: Wire drag, config load, and pause state into `app.ts`**

Replace `src/app.ts`:

```ts
import "./style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import idleAtlasRaw from "./assets/pet/pico_idle.json";
import idleImageUrl from "./assets/pet/pico_idle.png?url";
import { frameIndexAt, shouldRenderFrame } from "./pet/animationClock";
import { normalizeAtlasManifest } from "./pet/atlas";
import { PetRenderer } from "./pet/renderer";
import { getAppConfig, saveWindowPosition } from "./tauri/commands";
import { persistPositionAfterDrag } from "./tauri/window";

export async function boot(): Promise<string> {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }

  const atlas = normalizeAtlasManifest(idleAtlasRaw);
  const renderer = new PetRenderer(canvas, atlas);
  const appWindow = getCurrentWindow();
  let config = await getAppConfig();
  let startedAt = performance.now();
  let previousFrameAt = 0;
  let paused = config.animation.paused;

  canvas.style.width = `${atlas.frame_width * config.window.scale}px`;
  canvas.style.height = `${atlas.frame_height * config.window.scale}px`;

  canvas.addEventListener("pointerdown", async (event) => {
    if (event.button !== 0 || config.window.click_through) {
      return;
    }
    await persistPositionAfterDrag(appWindow, async (x, y) => {
      config = await saveWindowPosition(x, y);
    });
  });

  const image = new Image();
  image.onload = () => {
    renderer.setImage(image);
    requestAnimationFrame(tick);
  };
  image.onerror = () => renderer.renderFallback();
  image.src = idleImageUrl;

  function tick(now: number) {
    if (!paused && !document.hidden && shouldRenderFrame(previousFrameAt, now, config.animation.idle_fps)) {
      previousFrameAt = now;
      renderer.renderFrame(frameIndexAt(now - startedAt, config.animation.idle_fps, atlas.frames));
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("picopet:config", (event) => {
    const custom = event as CustomEvent<typeof config>;
    config = custom.detail;
    paused = config.animation.paused;
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      startedAt = performance.now();
      previousFrameAt = 0;
    }
  });

  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
```

Keep `src/main.ts` as:

```ts
import { boot } from "./app";

void boot();
```

Replace `src/app.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const defaultConfig = {
  window: {
    x: 1200,
    y: 680,
    scale: 1,
    always_on_top: true,
    click_through: false
  },
  animation: {
    paused: false,
    idle_fps: 12,
    interactive_fps: 30
  }
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startDragging: vi.fn(async () => undefined),
    outerPosition: vi.fn(async () => ({ x: 1200, y: 680 }))
  })
}));

vi.mock("./tauri/commands", () => ({
  getAppConfig: vi.fn(async () => defaultConfig),
  saveWindowPosition: vi.fn(async () => defaultConfig)
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D);
});

describe("boot", () => {
  it("marks the pet canvas as ready", async () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';
    const { boot } = await import("./app");

    await expect(boot()).resolves.toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
```

- [ ] **Step 5: Run verification**

Run:

```powershell
pnpm test -- --run src/tauri/window.test.ts src/app.test.ts
pnpm build
```

Expected:

```text
2 files passed
vite build ... built
```

- [ ] **Step 6: Commit**

```powershell
git add src/app.ts src/app.test.ts src/main.ts src/style.css src/tauri/window.ts src/tauri/window.test.ts
git commit -m "feat: persist pet drag position"
```

---

### Task 7: Implement Windows Click-Through Platform Layer

**Files:**
- Create: `src-tauri/src/platform/mod.rs`
- Create: `src-tauri/src/platform/windows.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `set_click_through` command from Task 5.
- Produces: Windows implementation using `WS_EX_LAYERED` and `WS_EX_TRANSPARENT`; config saves only after the platform call succeeds.

- [ ] **Step 1: Write failing Windows style tests**

Create `src-tauri/src/platform/mod.rs`:

```rust
#[cfg(target_os = "windows")]
pub mod windows;
```

Create `src-tauri/src/platform/windows.rs` with tests first:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enabling_click_through_adds_required_bits() {
        let style = apply_click_through_ex_style(0, true);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(style & WS_EX_TRANSPARENT as isize, WS_EX_TRANSPARENT as isize);
    }

    #[test]
    fn disabling_click_through_keeps_layered_and_removes_transparent() {
        let original = (WS_EX_LAYERED | WS_EX_TRANSPARENT) as isize;

        let style = apply_click_through_ex_style(original, false);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(style & WS_EX_TRANSPARENT as isize, 0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml platform
```

Expected: FAIL with missing `apply_click_through_ex_style` and missing style constants.

- [ ] **Step 3: Implement Windows click-through**

Replace `src-tauri/src/platform/windows.rs`:

```rust
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tauri::WebviewWindow;
use windows_sys::Win32::{
    Foundation::{GetLastError, SetLastError, HWND},
    UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, SWP_FRAMECHANGED,
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_LAYERED, WS_EX_TRANSPARENT,
    },
};

pub fn apply_click_through_ex_style(current_style: isize, enabled: bool) -> isize {
    if enabled {
        current_style | WS_EX_LAYERED as isize | WS_EX_TRANSPARENT as isize
    } else {
        (current_style | WS_EX_LAYERED as isize) & !(WS_EX_TRANSPARENT as isize)
    }
}

pub fn set_click_through(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    let handle = window.window_handle().map_err(|error| error.to_string())?;
    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => handle.hwnd.get() as HWND,
        _ => return Err("window handle is not Win32".to_string()),
    };

    unsafe {
        let current_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let next_style = apply_click_through_ex_style(current_style, enabled);

        SetLastError(0);
        let previous = SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next_style);
        let error = GetLastError();
        if previous == 0 && error != 0 {
            return Err(format!("SetWindowLongPtrW failed with error {error}"));
        }

        let changed = SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
        );
        if changed == 0 {
            return Err(format!("SetWindowPos failed with error {}", GetLastError()));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enabling_click_through_adds_required_bits() {
        let style = apply_click_through_ex_style(0, true);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(style & WS_EX_TRANSPARENT as isize, WS_EX_TRANSPARENT as isize);
    }

    #[test]
    fn disabling_click_through_keeps_layered_and_removes_transparent() {
        let original = (WS_EX_LAYERED | WS_EX_TRANSPARENT) as isize;

        let style = apply_click_through_ex_style(original, false);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(style & WS_EX_TRANSPARENT as isize, 0);
    }
}
```

- [ ] **Step 4: Update command to call platform before saving config**

Modify the `set_click_through` function in `src-tauri/src/commands.rs`:

```rust
#[tauri::command]
pub fn set_click_through(enabled: bool, window: WebviewWindow, state: State<AppState>) -> Result<AppConfig, String> {
    #[cfg(target_os = "windows")]
    crate::platform::windows::set_click_through(&window, enabled)?;

    save_updated_config(&state, |config| {
        config.window.click_through = enabled;
    })
}
```

Modify `src-tauri/src/lib.rs` module list:

```rust
mod commands;
mod config;
mod platform;
mod state;
```

- [ ] **Step 5: Run verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml platform
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected:

```text
running 2 tests
test result: ok. 2 passed
test result: ok
```

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/platform src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat: add windows click-through control"
```

---

### Task 8: Add System Tray Menu and Runtime Events

**Files:**
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`
- Modify: `src/tauri/commands.ts`

**Interfaces:**
- Consumes: `AppState`, config commands, and Windows click-through function.
- Produces: Chinese tray menu entries for pause/resume, click-through toggle, reset position, and exit.

- [ ] **Step 1: Add tray service**

Create `src-tauri/src/tray.rs`:

```rust
use crate::{commands, state::AppState};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindow,
};

const PAUSE_ID: &str = "toggle_pause";
const CLICK_THROUGH_ID: &str = "toggle_click_through";
const RESET_ID: &str = "reset_position";
const EXIT_ID: &str = "exit";

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let pause = MenuItem::with_id(app, PAUSE_ID, "暂停动画", true, None::<&str>)?;
    let click_through = MenuItem::with_id(app, CLICK_THROUGH_ID, "开启点击穿透", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, RESET_ID, "重置位置", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, EXIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&pause, &click_through, &reset, &exit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .build(app)?;

    let app_handle = app.clone();
    app.on_menu_event(move |app, event| {
        let Some(window) = app.get_webview_window("main") else {
            return;
        };

        match event.id().as_ref() {
            PAUSE_ID => toggle_pause(app, &window),
            CLICK_THROUGH_ID => toggle_click_through(app, &window),
            RESET_ID => reset_position(app, window),
            EXIT_ID => app_handle.exit(0),
            _ => {}
        }
    });

    Ok(())
}

fn emit_config(app: &AppHandle, config: crate::config::AppConfig) {
    let _ = app.emit("picopet://config", config);
}

fn toggle_pause(app: &AppHandle, _window: &WebviewWindow) {
    let state = app.state::<AppState>();
    let paused = state
        .config
        .lock()
        .map(|config| !config.animation.paused)
        .unwrap_or(false);
    if let Ok(config) = commands::set_animation_paused(paused, state) {
        emit_config(app, config);
    }
}

fn toggle_click_through(app: &AppHandle, window: &WebviewWindow) {
    let state = app.state::<AppState>();
    let enabled = state
        .config
        .lock()
        .map(|config| !config.window.click_through)
        .unwrap_or(false);
    if let Ok(config) = commands::set_click_through(enabled, window.clone(), state) {
        emit_config(app, config);
    }
}

fn reset_position(app: &AppHandle, window: WebviewWindow) {
    let state = app.state::<AppState>();
    if let Ok(config) = commands::reset_window_position(window, state) {
        emit_config(app, config);
    }
}
```

- [ ] **Step 2: Register tray during setup and emit initial config**

Modify `src-tauri/src/lib.rs`:

```rust
mod commands;
mod config;
mod platform;
mod state;
mod tray;

use commands::{
    get_app_config, reset_window_position, save_window_position, set_animation_paused,
    set_click_through,
};
use config::ConfigStore;
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let store = ConfigStore::new(config_dir.join("config.json"));
            let config = store.load_or_repair()?;
            app.manage(AppState::new(config, store));
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
            set_click_through
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PicoPet");
}
```

- [ ] **Step 3: Listen for tray-driven config updates in frontend**

Modify `src/app.ts` imports:

```ts
import { listen } from "@tauri-apps/api/event";
```

Inside `boot()`, after config is loaded, add:

```ts
  await listen<typeof config>("picopet://config", (event) => {
    config = event.payload;
    window.dispatchEvent(new CustomEvent("picopet:config", { detail: config }));
  });
```

Keep the existing `window.addEventListener("picopet:config", ...)` block.

Modify `src/app.test.ts` by adding this mock next to the other Tauri mocks:

```ts
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => undefined)
}));
```

- [ ] **Step 4: Run verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

Expected:

```text
test result: ok
vite build ... built
```

- [ ] **Step 5: Manual tray smoke check**

Run:

```powershell
pnpm tauri dev
```

Expected:

```text
PicoPet window appears
Tray menu contains 暂停动画, 开启点击穿透, 重置位置, 退出
退出 closes the process
```

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/tray.rs src-tauri/src/lib.rs src/app.ts src/app.test.ts src/tauri/commands.ts
git commit -m "feat: add tray controls"
```

---

### Task 9: Apply Startup Window State and Packaging Settings

**Files:**
- Create: `src-tauri/src/window_state.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: `AppConfig` and Tauri `WebviewWindow`.
- Produces: startup placement, scale-derived window size, always-on-top confirmation, and WebView2 installer mode.

- [ ] **Step 1: Add window state helper**

Create `src-tauri/src/window_state.rs`:

```rust
use crate::config::AppConfig;
use tauri::{Manager, WebviewWindow};

pub fn apply_startup_window_state(window: &WebviewWindow, config: &AppConfig) -> Result<(), String> {
    let monitor = window.primary_monitor().map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| monitor.size().clone());
    let screen_width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let screen_height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let config = config.clone().with_screen_bounds(screen_width, screen_height);
    let side = (160.0 * config.window.scale).round() as f64;

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: side as u32,
            height: side as u32,
        }))
        .map_err(|error| error.to_string())?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: config.window.x,
            y: config.window.y,
        }))
        .map_err(|error| error.to_string())?;
    window.set_always_on_top(true).map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    crate::platform::windows::set_click_through(window, config.window.click_through)?;

    Ok(())
}
```

- [ ] **Step 2: Apply startup state in setup**

Modify `src-tauri/src/lib.rs` module list:

```rust
mod commands;
mod config;
mod platform;
mod state;
mod tray;
mod window_state;
```

Inside setup, after `app.manage(...)`, add:

```rust
            if let Some(window) = app.get_webview_window("main") {
                if let Err(error) = window_state::apply_startup_window_state(&window, &config) {
                    eprintln!("窗口状态应用失败: {error}");
                }
            }
```

The setup block should keep tray initialization after this window state block.

- [ ] **Step 3: Confirm Windows WebView2 packaging setting**

Ensure `src-tauri/tauri.conf.json` still contains:

```json
"windows": {
  "webviewInstallMode": {
    "type": "downloadBootstrapper"
  }
}
```

This satisfies the MVP requirement that the Windows installer accounts for WebView2 Runtime availability.

- [ ] **Step 4: Run verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm tauri build --debug
```

Expected:

```text
test result: ok
vite build ... built
Finished dev [unoptimized + debuginfo] target(s)
```

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/window_state.rs src-tauri/src/lib.rs src-tauri/tauri.conf.json
git commit -m "feat: apply startup window state"
```

---

### Task 10: Add QA Checklist and Memory Baseline Procedure

**Files:**
- Create: `docs/qa/windows-mvp-checklist.md`
- Create: `docs/qa/memory-baseline.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed MVP app.
- Produces: repeatable Windows manual verification and memory measurement commands.

- [ ] **Step 1: Add QA checklist**

Create `docs/qa/windows-mvp-checklist.md`:

```markdown
# PicoPet Windows MVP QA Checklist

## Environment

- Windows 10 or Windows 11
- WebView2 Runtime installed or installer can bootstrap it
- Built with `pnpm tauri build --debug`

## Manual Checks

- [ ] Launch app from `pnpm tauri dev`.
- [ ] Confirm the pet window is transparent and borderless.
- [ ] Confirm the pet window stays above a normal Notepad window.
- [ ] Drag the pet to a new position.
- [ ] Exit from tray menu.
- [ ] Launch again and confirm the previous position is restored.
- [ ] Use tray menu `暂停动画`; confirm animation stops.
- [ ] Use tray menu again; confirm animation resumes.
- [ ] Use tray menu `开启点击穿透`; confirm clicks pass through to a window underneath.
- [ ] Disable click-through from tray and confirm dragging works again.
- [ ] Use tray menu `重置位置`; confirm pet returns near the primary screen bottom-right.
- [ ] Use tray menu `退出`; confirm no PicoPet process remains in Task Manager.
```

- [ ] **Step 2: Add memory baseline procedure**

Create `docs/qa/memory-baseline.md`:

```markdown
# PicoPet Memory Baseline

## Target

Resident memory target: 50-100 MB while idle on Windows.

## Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
Get-Process PicoPet,picopet -ErrorAction SilentlyContinue |
  Select-Object ProcessName,Id,@{Name="WorkingSetMB";Expression={[math]::Round($_.WorkingSet64 / 1MB, 1)}}
```

## Expected Result

- `WorkingSetMB` is between 50 and 100 MB during idle animation.
- CPU usage remains near 0% when the pet is idle.
- When animation is paused, memory does not grow across five minutes.

## Record Template

| Date | Build | Windows Version | WebView2 Version | WorkingSetMB | Notes |
| --- | --- | --- | --- | ---: | --- |
```

- [ ] **Step 3: Add validation script aliases**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "check": "pnpm test -- --run && pnpm build && cargo test --manifest-path src-tauri/Cargo.toml",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 4: Run full verification**

Run:

```powershell
pnpm check
pnpm tauri build --debug
```

Expected:

```text
all vitest files passed
vite build ... built
test result: ok
Finished dev [unoptimized + debuginfo] target(s)
```

- [ ] **Step 5: Commit**

```powershell
git add docs/qa package.json
git commit -m "docs: add windows mvp qa checklist"
```

---

## Final Verification

After Task 10, run these commands from `E:/GithubRepo/PicoPet`:

```powershell
pnpm check
pnpm tauri build --debug
pnpm tauri dev
```

Expected:

```text
Vitest passes
TypeScript/Vite build passes
Rust tests pass
Tauri debug bundle builds
Windows manual QA checklist passes
Idle WorkingSetMB is recorded in docs/qa/memory-baseline.md and remains in the 50-100 MB target range
```

## Implementation Notes

- If a Tauri permission name changes in the installed Tauri 2 schema, inspect `src-tauri/gen/schemas/desktop-schema.json` after the first build and update `src-tauri/capabilities/default.json` to the schema-supported permission names.
- If `webviewInstallMode` schema rejects `downloadBootstrapper`, use the Tauri Windows installer documentation's current WebView2 runtime option and keep the invariant that the installer handles missing WebView2 Runtime.

## Self-Review Result

- Spec coverage: every approved requirement maps to at least one task.
- Placeholder scan: no empty implementation sections or unresolved placeholder markers.
- Type consistency: Rust and TypeScript command names match the public interface section.
- Scope check: plan stays within Windows-only MVP and leaves AI, skin packages, macOS, and Linux out of implementation scope.
