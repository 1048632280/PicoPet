# PicoPet Portable Data Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Windows Beta build store config, logs, and WebView2 data under `PicoPet/data/`, and produce a green portable zip artifact.

**Architecture:** Add one focused Rust module that derives all portable paths from the running executable directory. Runtime code consumes that module through `AppState`, while the main Tauri webview is created manually so WebView2 receives `data/EBWebView/` before startup. Release packaging remains PowerShell-based and adds a portable zip beside the existing NSIS installer.

**Tech Stack:** Tauri 2.11, Rust stable MSVC toolchain, WebView2, Vanilla TypeScript, Vite, Vitest, PowerShell 5+, NSIS, Windows ZIP APIs through `System.IO.Compression`.

## Global Constraints

- Scope is Windows Beta only.
- Portable data directory is exactly `parent(current_exe) / "data"`.
- Runtime writable layout is `PicoPet/data/config.json`, `PicoPet/data/picopet.log`, and `PicoPet/data/EBWebView/`.
- The app must not read from or write to `%APPDATA%/com.picopet.app`, `%APPDATA%/com.picopet.desktop`, `%LOCALAPPDATA%/com.picopet.app`, or `%LOCALAPPDATA%/com.picopet.desktop`.
- Do not add AppData migration.
- Do not add user-selectable data directories, profiles, plugins, skins, macOS/Linux support, or code signing in this phase.
- The NSIS installer preserves `data/` during overwrite install and uninstall for Beta.
- The portable zip layout is exactly `PicoPet/picopet.exe` plus `PicoPet/data/`.
- If the install directory is read-only, a startup error dialog is out of scope; QA should use a user-writable install directory.
- Keep runtime memory lightweight and do not add Electron, React, Vue, Svelte, Tailwind, or large runtime dependencies.
- All text files are UTF-8. PowerShell scripts must set UTF-8 output before reading or writing Chinese text.
- Code comments must be Chinese when comments are necessary.

---

## Reference Documents

- Approved design: `docs/superpowers/specs/2026-06-23-portable-data-directory-design.md`
- Current release process: `docs/release/windows-release-process.md`
- Beta QA checklist: `docs/qa/windows-beta-checklist.md`
- Installer QA checklist: `docs/qa/windows-installer-checklist.md`
- Current artifact validation: `scripts/assert-windows-artifacts.ps1`
- Current release gate: `scripts/windows-release-gate.ps1`
- Tauri local API reference checked during planning:
  - `tauri-2.11.3/src/app.rs`: config windows are created before user `setup()`.
  - `tauri-2.11.3/src/webview/webview_window.rs`: `WebviewWindowBuilder::from_config` supports chaining `data_directory`.
  - `tauri-utils-2.9.3/src/config.rs`: `WindowConfig.create = false` requires manual creation from config.

## Planned File Structure

```text
E:/GithubRepo/PicoPet/
  package.json
  README.md
  docs/
    qa/
      windows-beta-checklist.md
      windows-installer-checklist.md
    release/
      windows-release-process.md
    superpowers/
      plans/
        2026-06-23-portable-data-directory.md
  scripts/
    assert-windows-artifacts.ps1
    package-windows-portable.ps1
    windows-release-gate.ps1
  src/
    tauri/
      commands.ts
  src-tauri/
    tauri.conf.json
    src/
      diagnostics.rs
      lib.rs
      logging.rs
      main_window.rs
      portable_data.rs
      state.rs
      tray.rs
```

## Public Interfaces

Rust interfaces added or changed by this plan:

```rust
pub fn data_dir_for_exe(exe_path: &std::path::Path) -> Result<std::path::PathBuf, PortableDataError>;
pub fn current_exe_data_dir() -> Result<std::path::PathBuf, PortableDataError>;
pub fn ensure_data_dirs(data_dir: &std::path::Path) -> Result<(), PortableDataError>;
pub fn config_file_path(data_dir: &std::path::Path) -> std::path::PathBuf;
pub fn log_file_path(data_dir: &std::path::Path) -> std::path::PathBuf;
pub fn webview_data_dir(data_dir: &std::path::Path) -> std::path::PathBuf;

pub struct AppState {
    pub config: std::sync::Mutex<AppConfig>,
    pub store: ConfigStore,
    pub data_dir: std::path::PathBuf,
}

pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub config_file: String,
    pub log_file: String,
}

pub fn find_main_window_config(
    windows: &[tauri::utils::config::WindowConfig],
) -> Result<&tauri::utils::config::WindowConfig, String>;

pub fn create_main_window(
    app: &tauri::AppHandle,
    window_config: &tauri::utils::config::WindowConfig,
    data_dir: &std::path::Path,
) -> tauri::Result<tauri::WebviewWindow>;
```

TypeScript interface changed by this plan:

```ts
export type DiagnosticsInfo = {
  version: string;
  config_dir: string;
  config_file: string;
  log_file: string;
};
```

## Task 1: Portable Data Path Module

**Files:**
- Create: `src-tauri/src/portable_data.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/portable_data.rs`

**Interfaces:**
- Consumes: `std::env::current_exe`, `std::fs::create_dir_all`
- Produces: `portable_data::{data_dir_for_exe,current_exe_data_dir,ensure_data_dirs,config_file_path,log_file_path,webview_data_dir}`

- [ ] **Step 1: Write the failing tests and register the module**

Add this module declaration near the other Rust modules in `src-tauri/src/lib.rs`:

```rust
mod portable_data;
```

Create `src-tauri/src/portable_data.rs` with only the tests first:

```rust
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
```

- [ ] **Step 2: Run the tests to verify the expected failure**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml portable_data -- --nocapture
```

Expected: FAIL at compile time because `data_dir_for_exe`, `config_file_path`, `log_file_path`, `webview_data_dir`, and `ensure_data_dirs` are not defined yet.

- [ ] **Step 3: Implement the portable data module**

Replace `src-tauri/src/portable_data.rs` with:

```rust
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
```

- [ ] **Step 4: Run the module tests**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml portable_data -- --nocapture
```

Expected: PASS for all `portable_data` tests.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/lib.rs src-tauri/src/portable_data.rs
git commit -m "feat: add portable data path helpers"
```

## Task 2: Move Config, Logs, Diagnostics, And Tray Directory To Portable Data

**Files:**
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/logging.rs`
- Modify: `src-tauri/src/diagnostics.rs`
- Modify: `src-tauri/src/tray.rs`
- Modify: `src/tauri/commands.ts`
- Test: `src-tauri/src/logging.rs`
- Test: `src-tauri/src/diagnostics.rs`

**Interfaces:**
- Consumes: `portable_data::{config_file_path,log_file_path}`, `AppState.data_dir`
- Produces: runtime config path `data/config.json`, log path `data/picopet.log`, diagnostics field `config_file`

- [ ] **Step 1: Write failing Rust tests for log and diagnostics paths**

Add this test module to the bottom of `src-tauri/src/logging.rs`:

```rust
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
```

Add this test module to the bottom of `src-tauri/src/diagnostics.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn diagnostics_reports_portable_paths() {
        let data_dir = PathBuf::from(r"C:\Tools\PicoPet\data");

        let info = diagnostics_info("0.1.0", &data_dir);

        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.config_dir, data_dir.display().to_string());
        assert_eq!(
            info.config_file,
            data_dir.join("config.json").display().to_string()
        );
        assert_eq!(
            info.log_file,
            data_dir.join("picopet.log").display().to_string()
        );
    }
}
```

- [ ] **Step 2: Run the tests to verify the expected failure**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml log_file_path_uses_portable_data_dir diagnostics_reports_portable_paths -- --nocapture
```

Expected: FAIL because `logging::log_file_path` still accepts `&tauri::AppHandle`, and `diagnostics_info` does not exist.

- [ ] **Step 3: Update `AppState` to carry the portable data directory**

Replace `src-tauri/src/state.rs` with:

```rust
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
```

- [ ] **Step 4: Update startup config creation in `lib.rs`**

In `src-tauri/src/lib.rs`, replace the existing path and state setup at the start of the `.setup` callback with:

```rust
            let data_dir = portable_data::current_exe_data_dir()?;
            portable_data::ensure_data_dirs(&data_dir)?;
            let store = ConfigStore::new(portable_data::config_file_path(&data_dir));
            let config = store.load_or_repair()?;
            app.manage(AppState::new(config.clone(), store, data_dir.clone()));
            logging::append_log(app.handle(), "PicoPet 启动");
```

Keep the existing window-state and tray setup code after this block for this task.

- [ ] **Step 5: Replace logging path resolution**

Replace `src-tauri/src/logging.rs` with:

```rust
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
```

- [ ] **Step 6: Replace diagnostics path resolution**

Replace `src-tauri/src/diagnostics.rs` with:

```rust
use crate::{portable_data, state::AppState};
use serde::Serialize;
use std::path::Path;
use tauri::Manager;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub config_file: String,
    pub log_file: String,
}

pub fn diagnostics_info(version: &str, data_dir: &Path) -> DiagnosticsInfo {
    DiagnosticsInfo {
        version: version.to_string(),
        config_dir: data_dir.display().to_string(),
        config_file: portable_data::config_file_path(data_dir)
            .display()
            .to_string(),
        log_file: portable_data::log_file_path(data_dir).display().to_string(),
    }
}

#[tauri::command]
pub fn get_diagnostics_info(app: tauri::AppHandle) -> Result<DiagnosticsInfo, String> {
    let state = app.state::<AppState>();

    Ok(diagnostics_info(
        &app.package_info().version.to_string(),
        &state.data_dir,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn diagnostics_reports_portable_paths() {
        let data_dir = PathBuf::from(r"C:\Tools\PicoPet\data");

        let info = diagnostics_info("0.1.0", &data_dir);

        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.config_dir, data_dir.display().to_string());
        assert_eq!(
            info.config_file,
            data_dir.join("config.json").display().to_string()
        );
        assert_eq!(
            info.log_file,
            data_dir.join("picopet.log").display().to_string()
        );
    }
}
```

- [ ] **Step 7: Make the tray open `data/`**

In `src-tauri/src/tray.rs`, replace `open_config_dir` with:

```rust
fn open_config_dir(app: &AppHandle) {
    let state = app.state::<AppState>();
    let _ = std::process::Command::new("explorer")
        .arg(&state.data_dir)
        .spawn();
    crate::logging::append_log(app, "打开配置目录");
}
```

- [ ] **Step 8: Update the TypeScript diagnostics type**

In `src/tauri/commands.ts`, replace the `DiagnosticsInfo` type with:

```ts
export type DiagnosticsInfo = {
  version: string;
  config_dir: string;
  config_file: string;
  log_file: string;
};
```

- [ ] **Step 9: Run focused tests**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml log_file_path_uses_portable_data_dir diagnostics_reports_portable_paths -- --nocapture
```

Expected: PASS.

- [ ] **Step 10: Run full Rust tests**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: PASS.

- [ ] **Step 11: Commit**

```powershell
git add src-tauri/src/state.rs src-tauri/src/lib.rs src-tauri/src/logging.rs src-tauri/src/diagnostics.rs src-tauri/src/tray.rs src/tauri/commands.ts
git commit -m "feat: store runtime data under portable data"
```

## Task 3: Route WebView2 User Data To `data/EBWebView/`

**Files:**
- Create: `src-tauri/src/main_window.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Test: `src-tauri/src/main_window.rs`

**Interfaces:**
- Consumes: `portable_data::webview_data_dir`
- Produces: `main_window::{find_main_window_config,create_main_window}` and Tauri config `create: false`

- [ ] **Step 1: Write failing tests for main window config selection**

Add `mod main_window;` near the other module declarations in `src-tauri/src/lib.rs`.

Create `src-tauri/src/main_window.rs` with only tests first:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tauri::utils::config::WindowConfig;

    #[test]
    fn finds_main_window_config_by_label() {
        let mut main = WindowConfig::default();
        main.label = "main".to_string();
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings, main];

        let found = find_main_window_config(&windows).unwrap();

        assert_eq!(found.label, "main");
    }

    #[test]
    fn reports_missing_main_window_config() {
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings];

        let error = find_main_window_config(&windows).unwrap_err();

        assert!(error.contains("main"));
    }
}
```

- [ ] **Step 2: Run the tests to verify the expected failure**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml main_window -- --nocapture
```

Expected: FAIL because `find_main_window_config` is not defined.

- [ ] **Step 3: Implement explicit main window creation**

Replace `src-tauri/src/main_window.rs` with:

```rust
use std::path::Path;
use tauri::{
    utils::config::WindowConfig, WebviewWindow, WebviewWindowBuilder,
};

pub const MAIN_WINDOW_LABEL: &str = "main";

pub fn find_main_window_config(windows: &[WindowConfig]) -> Result<&WindowConfig, String> {
    windows
        .iter()
        .find(|window| window.label == MAIN_WINDOW_LABEL)
        .ok_or_else(|| format!("missing {MAIN_WINDOW_LABEL} window config"))
}

pub fn create_main_window(
    app: &tauri::AppHandle,
    window_config: &WindowConfig,
    data_dir: &Path,
) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::from_config(app, window_config)?
        .data_directory(crate::portable_data::webview_data_dir(data_dir))
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::utils::config::WindowConfig;

    #[test]
    fn finds_main_window_config_by_label() {
        let mut main = WindowConfig::default();
        main.label = "main".to_string();
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings, main];

        let found = find_main_window_config(&windows).unwrap();

        assert_eq!(found.label, "main");
    }

    #[test]
    fn reports_missing_main_window_config() {
        let mut settings = WindowConfig::default();
        settings.label = "settings".to_string();
        let windows = vec![settings];

        let error = find_main_window_config(&windows).unwrap_err();

        assert!(error.contains("main"));
    }
}
```

- [ ] **Step 4: Disable automatic creation of the config window**

In `src-tauri/tauri.conf.json`, add `"create": false` to the existing `main` window object:

```json
      {
        "label": "main",
        "title": "PicoPet",
        "create": false,
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
```

- [ ] **Step 5: Create the main window from setup with the portable WebView2 directory**

In `src-tauri/src/lib.rs`, replace the current `app.get_webview_window("main")` startup-window block with:

```rust
            let window_config = main_window::find_main_window_config(&app.config().app.windows)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::NotFound, error))?
                .clone();
            let window = main_window::create_main_window(app.handle(), &window_config, &data_dir)?;
            if let Err(error) = window_state::apply_startup_window_state(&window, &config) {
                eprintln!("窗口状态应用失败: {error}");
            }
```

Keep this block after `app.manage(AppState::new(config.clone(), store, data_dir.clone()));` so frontend commands can access state as soon as the webview loads.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
cargo test --manifest-path src-tauri/Cargo.toml main_window -- --nocapture
```

Expected: PASS.

- [ ] **Step 7: Run a release smoke build**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm check:windows:release
```

Expected: PASS. The release executable still builds as a GUI subsystem app.

- [ ] **Step 8: Manual runtime check**

Run the release executable:

```powershell
src-tauri\target\release\picopet.exe
```

Expected after launch:

```text
src-tauri/target/release/data/config.json exists
src-tauri/target/release/data/picopet.log exists
src-tauri/target/release/data/EBWebView/ exists
```

Also verify no new `%APPDATA%/com.picopet.*` or `%LOCALAPPDATA%/com.picopet.*` directory timestamp changes during this launch.

- [ ] **Step 9: Commit**

```powershell
git add src-tauri/src/lib.rs src-tauri/src/main_window.rs src-tauri/tauri.conf.json
git commit -m "feat: route webview data to portable data"
```

## Task 4: Add Windows Portable Zip Packaging And Artifact Validation

**Files:**
- Create: `scripts/package-windows-portable.ps1`
- Modify: `package.json`
- Modify: `scripts/assert-windows-artifacts.ps1`
- Modify: `scripts/windows-release-gate.ps1`

**Interfaces:**
- Consumes: release executable `src-tauri/target/release/picopet.exe`
- Produces: `src-tauri/target/release/bundle/portable/PicoPet_0.1.0_x64-portable.zip`

- [ ] **Step 1: Add the npm script and failing artifact expectation**

In `package.json`, add this script entry after `artifact:windows`:

```json
    "portable:windows": "powershell -ExecutionPolicy Bypass -File scripts/package-windows-portable.ps1",
```

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm portable:windows
```

Expected: FAIL because `scripts/package-windows-portable.ps1` does not exist.

- [ ] **Step 2: Create the portable packaging script**

Create `scripts/package-windows-portable.ps1`:

```powershell
param(
  [string]$ReleaseExe = "",
  [string]$OutputZip = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ($ReleaseExe -eq "") {
  $ReleaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
}

$packageJson = Get-Content -Encoding UTF8 (Join-Path $repoRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version
$portableDir = Join-Path $repoRoot "src-tauri\target\release\bundle\portable"
if ($OutputZip -eq "") {
  $OutputZip = Join-Path $portableDir "PicoPet_${version}_x64-portable.zip"
}

if (-not (Test-Path -LiteralPath $ReleaseExe)) {
  throw "Release executable is missing: $ReleaseExe"
}

New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
if (Test-Path -LiteralPath $OutputZip) {
  Remove-Item -LiteralPath $OutputZip -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($OutputZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $zip,
    $ReleaseExe,
    "PicoPet/picopet.exe",
    [System.IO.Compression.CompressionLevel]::Optimal
  ) | Out-Null
  $zip.CreateEntry("PicoPet/data/") | Out-Null
}
finally {
  $zip.Dispose()
}

$item = Get-Item -LiteralPath $OutputZip
Write-Host "Portable artifact created: $OutputZip ($($item.Length) bytes)"
```

- [ ] **Step 3: Run portable packaging**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm portable:windows
```

Expected: PASS and create `src-tauri/target/release/bundle/portable/PicoPet_0.1.0_x64-portable.zip`.

- [ ] **Step 4: Extend artifact validation**

Replace `scripts/assert-windows-artifacts.ps1` with:

```powershell
param(
  [string]$ReleaseExe = "",
  [string]$Installer = "",
  [string]$PortableZip = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ($ReleaseExe -eq "") {
  $ReleaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
}
if ($Installer -eq "") {
  $Installer = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis\PicoPet_0.1.0_x64-setup.exe"
}
if ($PortableZip -eq "") {
  $PortableZip = Join-Path $repoRoot "src-tauri\target\release\bundle\portable\PicoPet_0.1.0_x64-portable.zip"
}

function Assert-File {
  param(
    [string]$Path,
    [int64]$MinimumBytes
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Expected artifact is missing: $Path"
  }

  $item = Get-Item -LiteralPath $Path
  if ($item.Length -lt $MinimumBytes) {
    throw "Artifact is unexpectedly small: $Path ($($item.Length) bytes)"
  }

  Write-Host "Artifact verified: $Path ($($item.Length) bytes)"
}

function Assert-ZipEntry {
  param(
    [string]$Path,
    [string]$EntryName
  )

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1
    if ($null -eq $entry) {
      throw "Expected zip entry is missing: $EntryName in $Path"
    }
    Write-Host "Zip entry verified: $EntryName"
  }
  finally {
    $zip.Dispose()
  }
}

Assert-File -Path $ReleaseExe -MinimumBytes 1000000
Assert-File -Path $Installer -MinimumBytes 500000
Assert-File -Path $PortableZip -MinimumBytes 1000000

Assert-ZipEntry -Path $PortableZip -EntryName "PicoPet/picopet.exe"
Assert-ZipEntry -Path $PortableZip -EntryName "PicoPet/data/"

& (Join-Path $PSScriptRoot "assert-windows-gui-subsystem.ps1") -ExePath $ReleaseExe
```

- [ ] **Step 5: Update release gate to build the portable artifact before validation**

In `scripts/windows-release-gate.ps1`, insert this step between release smoke and artifact validation:

```powershell
Invoke-Step "windows portable artifact packaging" { pnpm portable:windows }
```

The verification block should read:

```powershell
Invoke-Step "windows release smoke" { pnpm check:windows:release }
Invoke-Step "windows portable artifact packaging" { pnpm portable:windows }
Invoke-Step "windows artifact validation" { pnpm artifact:windows }
```

- [ ] **Step 6: Run artifact packaging and validation**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm portable:windows
pnpm artifact:windows
```

Expected: PASS. Validation reports the release exe, NSIS installer, portable zip, `PicoPet/picopet.exe`, and `PicoPet/data/`.

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts/package-windows-portable.ps1 scripts/assert-windows-artifacts.ps1 scripts/windows-release-gate.ps1
git commit -m "build: add Windows portable artifact"
```

## Task 5: Update User-Facing Docs And QA Checklists

**Files:**
- Modify: `README.md`
- Modify: `docs/release/windows-release-process.md`
- Modify: `docs/qa/windows-beta-checklist.md`
- Modify: `docs/qa/windows-installer-checklist.md`

**Interfaces:**
- Consumes: portable runtime behavior from Tasks 1-4
- Produces: QA instructions that verify `PicoPet/data/` and the portable zip

- [ ] **Step 1: Update README feature and scope language**

In `README.md`, update the intro from Alpha to Beta preparation:

```markdown
PicoPet is a lightweight Windows desktop pet built with Tauri 2, Rust, WebView2, and vanilla TypeScript. The current focus is a small Windows-first Beta: transparent always-on-top pet window, built-in animation, tray controls, click-through, drag persistence, portable local data, installer QA, and repeatable release checks.
```

Update the note:

```markdown
> [!NOTE]
> PicoPet is Windows-only right now. macOS and Linux are planned as separate platform-layer work, not part of this Beta phase.
```

Add these feature bullets:

```markdown
- Portable local data under `PicoPet/data/`.
- Green portable zip artifact for unzip-and-run testing.
```

- [ ] **Step 2: Document the portable data layout in README**

Add this section after `## Build`:

````markdown
## Local Data

PicoPet writes runtime data beside the executable:

```text
PicoPet/
  picopet.exe
  uninstall.exe
  data/
    config.json
    picopet.log
    EBWebView/
```

`uninstall.exe` is present only in the NSIS installer build. The portable zip contains `PicoPet/picopet.exe` and `PicoPet/data/`; `config.json`, `picopet.log`, and `EBWebView/` are created on first launch.
````

- [ ] **Step 3: Document portable packaging in README**

In the `## Build` command block, include:

```powershell
pnpm portable:windows
```

After the build paragraph, add:

```markdown
The Windows portable zip is written to `src-tauri/target/release/bundle/portable/PicoPet_0.1.0_x64-portable.zip`.
```

- [ ] **Step 4: Update release process artifact docs**

In `docs/release/windows-release-process.md`, update the diagnostic commands block to include:

```powershell
pnpm check:windows:release
pnpm portable:windows
pnpm artifact:windows
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

Update the artifacts section to:

```markdown
## Artifacts

- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`
- Portable zip: `src-tauri/target/release/bundle/portable/PicoPet_0.1.0_x64-portable.zip`
```

- [ ] **Step 5: Update Beta QA checklist**

In `docs/qa/windows-beta-checklist.md`, add these items under `## Automated Gate`:

```markdown
- [ ] Confirm portable zip exists and is larger than 1 MB.
- [ ] Confirm portable zip contains `PicoPet/picopet.exe`.
- [ ] Confirm portable zip contains `PicoPet/data/`.
```

Add these items under `## Runtime Behavior`:

```markdown
- [ ] Confirm `data/config.json` appears beside `picopet.exe` after first launch.
- [ ] Confirm `data/picopet.log` appears after startup.
- [ ] Confirm `data/EBWebView/` appears after WebView startup.
- [ ] Confirm no new `%APPDATA%/com.picopet.*` or `%LOCALAPPDATA%/com.picopet.*` directory is created.
```

Update the operational feature item:

```markdown
- [ ] Confirm `打开配置目录` opens `PicoPet/data/`.
```

Add this section before `## Result`:

```markdown
## Portable Zip

- [ ] Extract `PicoPet_0.1.0_x64-portable.zip` into a clean user-writable directory.
- [ ] Launch `PicoPet/picopet.exe`.
- [ ] Confirm `PicoPet/data/config.json` is created.
- [ ] Confirm `PicoPet/data/picopet.log` is created.
- [ ] Confirm `PicoPet/data/EBWebView/` is created.
- [ ] Move the pet, exit from tray, relaunch, and confirm the position is restored.
```

- [ ] **Step 6: Update installer QA checklist**

In `docs/qa/windows-installer-checklist.md`, add this environment item:

```markdown
- Install into a user-writable directory for Beta portable-data testing.
```

In `## Clean Install`, add:

```markdown
- [ ] Confirm `data/config.json` is created under the installed PicoPet directory after first launch.
- [ ] Confirm `data/picopet.log` is created under the installed PicoPet directory.
- [ ] Confirm `data/EBWebView/` is created under the installed PicoPet directory.
```

In `## Overwrite Install`, replace the config preservation item with:

```markdown
- [ ] Confirm `data/config.json` is preserved under the installed PicoPet directory.
```

In `## Uninstall`, replace the old config item with:

```markdown
- [ ] Confirm `data/` remains under the installed PicoPet directory for now.
```

- [ ] **Step 7: Run docs-facing checks**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm test -- --run
pnpm build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add README.md docs/release/windows-release-process.md docs/qa/windows-beta-checklist.md docs/qa/windows-installer-checklist.md
git commit -m "docs: document portable Windows data layout"
```

## Task 6: Final Release Gate And Manual Acceptance

**Files:**
- Modify if manual QA is performed: `docs/qa/memory-baseline.md`
- Modify if a dated acceptance note is created: `docs/qa/windows-beta-acceptance-2026-06-23.md`

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified release artifacts and acceptance evidence

- [ ] **Step 1: Run the full automated project check**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm check
```

Expected: PASS for Vitest, TypeScript build, Vite build, and Rust tests.

- [ ] **Step 2: Run the Windows release gate**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm release:windows:gate
```

Expected: PASS for release smoke, portable artifact packaging, artifact validation, and GUI subsystem validation.

- [ ] **Step 3: Verify portable runtime behavior from release exe**

Run:

```powershell
$releaseDir = Resolve-Path "src-tauri\target\release"
& (Join-Path $releaseDir "picopet.exe")
```

Manual expected results:

```text
src-tauri/target/release/data/config.json exists
src-tauri/target/release/data/picopet.log exists
src-tauri/target/release/data/EBWebView/ exists
tray item 打开配置目录 opens src-tauri/target/release/data/
moving the pet, exiting, and relaunching restores the saved position
```

- [ ] **Step 4: Verify portable zip behavior**

Run:

```powershell
$zip = Resolve-Path "src-tauri\target\release\bundle\portable\PicoPet_0.1.0_x64-portable.zip"
$extract = Join-Path $env:TEMP "PicoPetPortableQA"
if (Test-Path -LiteralPath $extract) {
  Remove-Item -LiteralPath $extract -Recurse -Force
}
Expand-Archive -LiteralPath $zip -DestinationPath $extract
& (Join-Path $extract "PicoPet\picopet.exe")
```

Manual expected results:

```text
%TEMP%/PicoPetPortableQA/PicoPet/data/config.json exists
%TEMP%/PicoPetPortableQA/PicoPet/data/picopet.log exists
%TEMP%/PicoPetPortableQA/PicoPet/data/EBWebView/ exists
no new %APPDATA%/com.picopet.* directory is created by this launch
no new %LOCALAPPDATA%/com.picopet.* directory is created by this launch
```

- [ ] **Step 5: Verify installer behavior**

Run `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe` and complete `docs/qa/windows-installer-checklist.md`.

Expected:

```text
clean install launches without cmd/conhost window
installed app creates data/ under the installed PicoPet directory
overwrite install preserves data/config.json
uninstall leaves data/ in place for Beta
```

- [ ] **Step 6: Record memory baseline if artifacts changed materially**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

Expected: host + WebView2 child Private Working Set remains inside the 50-100 MB Beta target. Append a dated row to `docs/qa/memory-baseline.md` only after checking the generated JSON.

- [ ] **Step 7: Final status check**

Run:

```powershell
git status --short --branch
```

Expected: only intentional files from this plan are modified. Existing unrelated local files such as `.codex/`, `AGENTS.md`, and prior QA scratch JSON remain untouched unless the user explicitly asks to include them.

- [ ] **Step 8: Commit acceptance records if created**

```powershell
git add docs/qa/memory-baseline.md docs/qa/windows-beta-acceptance-2026-06-23.md
git commit -m "docs: record portable data QA"
```

Only run this commit if those QA files were intentionally updated.

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement `data/config.json`, `data/picopet.log`, `data/EBWebView/`, tray directory opening, and diagnostics. Task 4 implements the portable zip artifact. Task 5 updates README, release, Beta QA, and installer QA docs. Task 6 verifies automated gates and manual acceptance.
- Placeholder scan: The plan contains concrete file paths, code snippets, commands, expected failures, expected passes, and commit messages. It does not rely on deferred implementation details.
- Type consistency: `DiagnosticsInfo.config_file` is added in Rust and TypeScript. `AppState::new` changes to accept `data_dir: PathBuf`, and `lib.rs` uses that exact signature. `main_window::create_main_window` receives `data_dir` and calls `portable_data::webview_data_dir`.
- Tauri lifecycle check: `tauri.conf.json` sets `create: false` because Tauri creates configured windows before user `setup()`. The plan manually creates `main` after state initialization and before tray setup.
