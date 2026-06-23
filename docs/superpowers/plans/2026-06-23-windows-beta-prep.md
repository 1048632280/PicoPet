# PicoPet Windows Beta Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare PicoPet for a Windows Beta by closing Alpha acceptance, validating the installer path, hardening the release gate, improving position persistence, and adding the smallest Beta-ready operational features.

**Architecture:** Keep the current Windows-only Tauri 2 architecture. Rust owns native window lifecycle, tray commands, config persistence, startup integration, logging, and release-facing diagnostics; TypeScript remains focused on canvas rendering and command wrappers. QA and release checks stay in PowerShell scripts so the runtime path remains small.

**Tech Stack:** Tauri 2, Rust stable MSVC toolchain, WebView2, Vite, Vanilla TypeScript, Vitest, Canvas 2D, PowerShell 5+, NSIS.

## Global Constraints

- First Beta remains Windows-only.
- Keep Tauri 2 + Rust + WebView2.
- Do not add Electron, React, Vue, Svelte, Tailwind, or large UI frameworks.
- Do not add AI chat, plugins, external skin packages, physics simulation, or cross-platform platform layers in this phase.
- Keep startup and tray behavior lightweight; no background service.
- Keep runtime dependencies minimal; one small Windows registry crate is acceptable only for launch-on-login support.
- `window.scale` allowed range remains exactly 0.5-2.0.
- Tray menu labels are Chinese.
- Source comments must be Chinese when comments are necessary.
- All text files are UTF-8.
- Release-build host + WebView2 child Private Working Set target remains 50-100 MB.
- PowerShell commands and scripts must set UTF-8 output before reading or writing Chinese text.
- Existing user QA records in `docs/qa/` must not be overwritten; append or create dated records.

---

## Reference Documents

- Windows MVP plan: `docs/superpowers/plans/2026-06-22-picopet-windows-mvp.md`
- Windows Alpha hardening plan: `docs/superpowers/plans/2026-06-23-windows-alpha-hardening.md`
- Windows Alpha checklist: `docs/qa/windows-alpha-checklist.md`
- Memory baseline: `docs/qa/memory-baseline.md`
- Windows release process: `docs/release/windows-release-process.md`
- Current release smoke script: `scripts/windows-release-smoke.ps1`
- Current memory script: `scripts/windows-memory-baseline.ps1`
- Current GUI subsystem check: `scripts/assert-windows-gui-subsystem.ps1`

## Planned File Structure

```text
E:/GithubRepo/PicoPet/
  package.json
  README.md
  docs/
    qa/
      memory-baseline.md
      memory-baseline.latest.json
      windows-alpha-acceptance-2026-06-23.md
      windows-alpha-checklist.md
      windows-beta-checklist.md
      windows-installer-checklist.md
    release/
      windows-release-process.md
    superpowers/
      plans/
        2026-06-23-windows-beta-prep.md
  scripts/
    assert-windows-artifacts.ps1
    assert-windows-gui-subsystem.ps1
    windows-release-gate.ps1
    windows-release-smoke.ps1
  src/
    tauri/
      commands.ts
      commands.test.ts
  src-tauri/
    Cargo.toml
    src/
      commands.rs
      config.rs
      diagnostics.rs
      lib.rs
      logging.rs
      platform/
        windows_autostart.rs
      state.rs
      tray.rs
      window_position.rs
      window_state.rs
```

## Public Interfaces

Rust interfaces added by this plan:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

pub fn normalize_position_for_screens(
    x: i32,
    y: i32,
    window_width: i32,
    window_height: i32,
    screens: &[ScreenRect],
) -> (i32, i32);

pub fn persist_main_window_position(window: tauri::WebviewWindow) -> Result<crate::config::AppConfig, String>;

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub log_file: String,
}

#[tauri::command]
pub fn get_diagnostics_info(app: tauri::AppHandle) -> Result<DiagnosticsInfo, String>;

#[tauri::command]
pub fn set_launch_on_login(enabled: bool, app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<AppConfig, String>;
```

TypeScript interfaces added by this plan:

```ts
export type DiagnosticsInfo = {
  version: string;
  config_dir: string;
  log_file: string;
};

export function getDiagnosticsInfo(): Promise<DiagnosticsInfo>;
export function setLaunchOnLogin(enabled: boolean): Promise<AppConfig>;
```

PowerShell entry points added by this plan:

```powershell
scripts/assert-windows-artifacts.ps1
scripts/windows-release-gate.ps1 [-SkipManualReminder]
```

---

### Task 1: Record Alpha Acceptance And Close The Phase

**Files:**
- Create: `docs/qa/windows-alpha-acceptance-2026-06-23.md`
- Modify: `docs/qa/windows-alpha-checklist.md`
- Modify: `docs/release/windows-release-process.md`

**Interfaces:**
- Consumes: current merged `main` commit, PR #4 outcome, `pnpm check`, `pnpm check:windows:release`, and current release artifact paths.
- Produces: a dated Alpha acceptance record and release docs that point to Beta preparation as the next phase.

- [ ] **Step 1: Write the acceptance record**

Create `docs/qa/windows-alpha-acceptance-2026-06-23.md`:

```markdown
# PicoPet Windows Alpha Acceptance - 2026-06-23

## Scope

This record closes the Windows Alpha phase after PR #4 merged the launch-console and exit-position fixes into `main`.

## Accepted Build

- Branch: `main`
- Merge commit: `eb25abf`
- Fix commit: `9c04960`
- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm check` | Passed | Vitest, Vite build, Rust tests passed |
| `pnpm check:windows:release` | Passed | Debug build, release build, NSIS bundle, GUI subsystem check passed |
| Windows GUI subsystem | Passed | `scripts/assert-windows-gui-subsystem.ps1` verified subsystem 2 |

## Manual Acceptance

| Area | Result | Notes |
| --- | --- | --- |
| Transparent borderless window | Passed | Manual QA reported normal |
| Tray controls | Passed | Pause, scale, click-through, reset, exit reported normal |
| Memory baseline | Passed | Latest baseline remains within 50-100 MB target |
| Launch console | Passed after fix | Release app no longer opens a cmd/conhost window |
| Exit position restore | Passed after fix | Tray exit saves current position before shutdown |

## Known Remaining Risks

- Force-kill, crash, and OS shutdown paths are not guaranteed to save the final position.
- Multi-monitor and mixed-DPI position restoration need a dedicated Beta hardening task.
- Installer install, uninstall, and overwrite-install behavior needs a Beta checklist run.

## Next Phase

Proceed to Windows Beta preparation using `docs/superpowers/plans/2026-06-23-windows-beta-prep.md`.
```

- [ ] **Step 2: Update the Alpha checklist with acceptance status**

Append this section to `docs/qa/windows-alpha-checklist.md`:

```markdown
## Acceptance Result

- Accepted on: 2026-06-23
- Accepted commit: `eb25abf`
- Acceptance record: `docs/qa/windows-alpha-acceptance-2026-06-23.md`
- Follow-up phase: Windows Beta preparation
```

- [ ] **Step 3: Update release process with the acceptance record**

In `docs/release/windows-release-process.md`, add this section after `## Release Notes`:

```markdown
## Acceptance Records

- Windows Alpha: `docs/qa/windows-alpha-acceptance-2026-06-23.md`
```

- [ ] **Step 4: Run documentation marker scan**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
$badMarkers = @("TB" + "D", "TO" + "DO", "待" + "定", "以后" + "补", "占" + "位") -join "|"
$matches = rg -n $badMarkers docs/qa/windows-alpha-acceptance-2026-06-23.md docs/qa/windows-alpha-checklist.md docs/release/windows-release-process.md
if ($LASTEXITCODE -eq 0) {
  $matches
  throw "documentation contains unresolved marker strings"
}
```

Expected: no matches.

- [ ] **Step 5: Commit**

```powershell
git add docs/qa/windows-alpha-acceptance-2026-06-23.md docs/qa/windows-alpha-checklist.md docs/release/windows-release-process.md
git commit -m "docs: record windows alpha acceptance"
```

---

### Task 2: Add Installer Experience Checklist And Artifact Validation

**Files:**
- Create: `docs/qa/windows-installer-checklist.md`
- Create: `scripts/assert-windows-artifacts.ps1`
- Modify: `docs/release/windows-release-process.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src-tauri/target/release/picopet.exe`, `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`, and `scripts/assert-windows-gui-subsystem.ps1`.
- Produces: `pnpm artifact:windows` and a manual installer QA checklist.

- [ ] **Step 1: Create installer checklist**

Create `docs/qa/windows-installer-checklist.md`:

```markdown
# PicoPet Windows Installer QA Checklist

## Environment

- Windows 10 or Windows 11.
- Test account is a normal user account.
- Existing PicoPet processes are stopped before installation.
- Release installer exists at `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`.

## Clean Install

- [ ] Run `PicoPet_0.1.0_x64-setup.exe`.
- [ ] Confirm the installer completes without an error dialog.
- [ ] Launch PicoPet from the installed shortcut or Start menu entry.
- [ ] Confirm no cmd/conhost window appears.
- [ ] Confirm the pet window appears and tray icon is available.
- [ ] Exit from tray menu.
- [ ] Relaunch from the installed shortcut or Start menu entry.
- [ ] Confirm the last position is restored.

## Overwrite Install

- [ ] Run the same installer again without uninstalling first.
- [ ] Confirm the installer completes without an error dialog.
- [ ] Launch PicoPet.
- [ ] Confirm config is preserved.
- [ ] Confirm tray exit still closes the app.

## Uninstall

- [ ] Uninstall PicoPet from Windows Apps or the NSIS uninstaller.
- [ ] Confirm installed application files are removed.
- [ ] Confirm no PicoPet process remains.
- [ ] Confirm user config remains under the app config directory for now.

## Result

- Tester:
- Windows version:
- Commit:
- Installer path:
- Result:
- Notes:
```

- [ ] **Step 2: Write artifact validation script**

Create `scripts/assert-windows-artifacts.ps1`:

```powershell
param(
  [string]$ReleaseExe = "",
  [string]$Installer = ""
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

function Assert-File {
  param(
    [string]$Path,
    [int64]$MinimumBytes
  )

  if (-not (Test-Path $Path)) {
    throw "Expected artifact is missing: $Path"
  }

  $item = Get-Item $Path
  if ($item.Length -lt $MinimumBytes) {
    throw "Artifact is unexpectedly small: $Path ($($item.Length) bytes)"
  }

  Write-Host "Artifact verified: $Path ($($item.Length) bytes)"
}

Assert-File -Path $ReleaseExe -MinimumBytes 1000000
Assert-File -Path $Installer -MinimumBytes 500000

& (Join-Path $PSScriptRoot "assert-windows-gui-subsystem.ps1") -ExePath $ReleaseExe
```

- [ ] **Step 3: Add package script**

Modify `package.json` scripts by adding:

```json
"artifact:windows": "powershell -ExecutionPolicy Bypass -File scripts/assert-windows-artifacts.ps1"
```

Keep existing script names unchanged.

- [ ] **Step 4: Reference installer QA from release process**

In `docs/release/windows-release-process.md`, replace the manual QA line with:

```markdown
Run every item in:

- `docs/qa/windows-alpha-checklist.md`
- `docs/qa/windows-installer-checklist.md`
```

Add artifact validation under `## Verification`:

```powershell
pnpm artifact:windows
```

- [ ] **Step 5: Run focused verification**

Run:

```powershell
pnpm check:windows:release
pnpm artifact:windows
```

Expected:

```text
Windows GUI subsystem verified
Artifact verified: ...picopet.exe
Artifact verified: ...PicoPet_0.1.0_x64-setup.exe
```

- [ ] **Step 6: Commit**

```powershell
git add package.json docs/qa/windows-installer-checklist.md docs/release/windows-release-process.md scripts/assert-windows-artifacts.ps1
git commit -m "chore: add windows installer artifact checks"
```

---

### Task 3: Consolidate The Windows Release Gate

**Files:**
- Create: `scripts/windows-release-gate.ps1`
- Create: `docs/qa/windows-beta-checklist.md`
- Modify: `package.json`
- Modify: `docs/release/windows-release-process.md`

**Interfaces:**
- Consumes: `pnpm check:windows:release`, `pnpm artifact:windows`, `pnpm memory:windows`, Alpha checklist, and installer checklist.
- Produces: `pnpm release:windows:gate`.

- [ ] **Step 1: Write release gate script**

Create `scripts/windows-release-gate.ps1`:

```powershell
param(
  [switch]$SkipManualReminder
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host "== $Label =="
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$shimDir = Join-Path $env:LOCALAPPDATA "CorepackShims"
if (Test-Path $shimDir) {
  $env:PATH = "$shimDir;$env:PATH"
}

Invoke-Step "windows release smoke" { pnpm check:windows:release }
Invoke-Step "windows artifact validation" { pnpm artifact:windows }

if (-not $SkipManualReminder) {
  Write-Host "Manual QA still required:"
  Write-Host "- docs/qa/windows-beta-checklist.md"
  Write-Host "- docs/qa/windows-installer-checklist.md"
  Write-Host "- docs/qa/memory-baseline.md"
}

Write-Host "== Windows release gate automated checks completed =="
```

- [ ] **Step 2: Add Windows Beta checklist**

Create `docs/qa/windows-beta-checklist.md`:

```markdown
# PicoPet Windows Beta QA Checklist

## Automated Gate

- [ ] Run `pnpm release:windows:gate`.
- [ ] Confirm release executable uses Windows GUI subsystem.
- [ ] Confirm release installer exists and is larger than 500 KB.
- [ ] Confirm release executable exists and is larger than 1 MB.

## Runtime Behavior

- [ ] Launch release executable directly.
- [ ] Confirm no cmd/conhost window appears.
- [ ] Move the pet to a custom position.
- [ ] Exit through tray menu.
- [ ] Relaunch and confirm the position is restored.
- [ ] Close the window through OS close handling if available and confirm position is restored.
- [ ] Test on primary monitor.
- [ ] Test on secondary monitor when available.
- [ ] Test with Windows display scaling at 100%.
- [ ] Test with Windows display scaling above 100% when available.

## Operational Features

- [ ] Toggle `开机自启动`.
- [ ] Confirm launch-on-login setting is reflected in the tray label after restart.
- [ ] Confirm `关于 PicoPet` shows version information in tray.
- [ ] Confirm `打开配置目录` opens the config directory.
- [ ] Confirm log file exists after startup and exit.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Result:
- Notes:
```

- [ ] **Step 3: Add package script**

Modify `package.json` scripts by adding:

```json
"release:windows:gate": "powershell -ExecutionPolicy Bypass -File scripts/windows-release-gate.ps1"
```

- [ ] **Step 4: Update release process**

In `docs/release/windows-release-process.md`, make `pnpm release:windows:gate` the first verification command:

```powershell
pnpm release:windows:gate
```

Keep the lower-level commands listed below it as diagnostic fallback commands:

```powershell
pnpm check:windows:release
pnpm artifact:windows
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

- [ ] **Step 5: Run focused verification**

Run:

```powershell
pnpm release:windows:gate
pnpm release:windows:gate -- -SkipManualReminder
```

Expected:

```text
Windows release gate automated checks completed
```

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts/windows-release-gate.ps1 docs/qa/windows-beta-checklist.md docs/release/windows-release-process.md
git commit -m "chore: consolidate windows release gate"
```

---

### Task 4: Harden Position Persistence And Multi-Monitor Restore

**Files:**
- Create: `src-tauri/src/window_position.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/window_state.rs`
- Modify: `src-tauri/src/tray.rs`

**Interfaces:**
- Consumes: existing `commands::save_current_window_position`, `ConfigStore`, `AppState`, Tauri window `outer_position()`, and Tauri monitor APIs.
- Produces: reusable position normalization helpers, lifecycle save on close, and multi-monitor-aware startup restore.

- [ ] **Step 1: Write failing pure position tests**

Create `src-tauri/src/window_position.rs`:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_position_visible_on_secondary_monitor() {
        let screens = [
            ScreenRect { x: 0, y: 0, width: 1920, height: 1080 },
            ScreenRect { x: 1920, y: 0, width: 1920, height: 1080 },
        ];

        let position = normalize_position_for_screens(2200, 200, 160, 160, &screens);

        assert_eq!(position, (2200, 200));
    }

    #[test]
    fn keeps_position_visible_on_left_monitor_with_negative_x() {
        let screens = [
            ScreenRect { x: -1920, y: 0, width: 1920, height: 1080 },
            ScreenRect { x: 0, y: 0, width: 1920, height: 1080 },
        ];

        let position = normalize_position_for_screens(-900, 300, 160, 160, &screens);

        assert_eq!(position, (-900, 300));
    }

    #[test]
    fn moves_fully_offscreen_position_to_primary_bottom_right() {
        let screens = [ScreenRect { x: 0, y: 0, width: 1920, height: 1080 }];

        let position = normalize_position_for_screens(9000, 9000, 160, 160, &screens);

        assert_eq!(position, (1680, 840));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml window_position
```

Expected: FAIL because `normalize_position_for_screens` is missing.

- [ ] **Step 3: Implement position normalization**

Replace the body of `src-tauri/src/window_position.rs` with:

```rust
const SCREEN_MARGIN: i32 = 80;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl ScreenRect {
    fn max_x(self, window_width: i32) -> i32 {
        self.x + self.width - window_width
    }

    fn max_y(self, window_height: i32) -> i32 {
        self.y + self.height - window_height
    }

    fn contains_with_margin(self, x: i32, y: i32, window_width: i32, window_height: i32) -> bool {
        x >= self.x - SCREEN_MARGIN
            && y >= self.y - SCREEN_MARGIN
            && x <= self.max_x(window_width) + SCREEN_MARGIN
            && y <= self.max_y(window_height) + SCREEN_MARGIN
    }
}

pub fn normalize_position_for_screens(
    x: i32,
    y: i32,
    window_width: i32,
    window_height: i32,
    screens: &[ScreenRect],
) -> (i32, i32) {
    let primary = screens.first().copied().unwrap_or(ScreenRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    });

    if screens
        .iter()
        .any(|screen| screen.contains_with_margin(x, y, window_width, window_height))
    {
        return (x, y);
    }

    (
        (primary.x + primary.width - window_width - SCREEN_MARGIN).max(primary.x),
        (primary.y + primary.height - window_height - SCREEN_MARGIN).max(primary.y),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_position_visible_on_secondary_monitor() {
        let screens = [
            ScreenRect { x: 0, y: 0, width: 1920, height: 1080 },
            ScreenRect { x: 1920, y: 0, width: 1920, height: 1080 },
        ];

        let position = normalize_position_for_screens(2200, 200, 160, 160, &screens);

        assert_eq!(position, (2200, 200));
    }

    #[test]
    fn keeps_position_visible_on_left_monitor_with_negative_x() {
        let screens = [
            ScreenRect { x: -1920, y: 0, width: 1920, height: 1080 },
            ScreenRect { x: 0, y: 0, width: 1920, height: 1080 },
        ];

        let position = normalize_position_for_screens(-900, 300, 160, 160, &screens);

        assert_eq!(position, (-900, 300));
    }

    #[test]
    fn moves_fully_offscreen_position_to_primary_bottom_right() {
        let screens = [ScreenRect { x: 0, y: 0, width: 1920, height: 1080 }];

        let position = normalize_position_for_screens(9000, 9000, 160, 160, &screens);

        assert_eq!(position, (1680, 840));
    }
}
```

- [ ] **Step 4: Register module and use monitors on startup**

Modify `src-tauri/src/lib.rs` module declarations:

```rust
mod window_position;
```

Modify `src-tauri/src/window_state.rs` so `derive_startup_window_state` accepts `screens: &[crate::window_position::ScreenRect]`, calls `normalize_position_for_screens`, and no longer assumes only the primary monitor:

```rust
let (x, y) = crate::window_position::normalize_position_for_screens(
    config.window.x,
    config.window.y,
    side as i32,
    side as i32,
    screens,
);
```

In `apply_startup_window_state`, collect monitor positions and sizes:

```rust
let monitors = window.available_monitors().map_err(|error| error.to_string())?;
let screens: Vec<crate::window_position::ScreenRect> = monitors
    .iter()
    .map(|monitor| {
        let position = monitor.position();
        let size = monitor.size();
        crate::window_position::ScreenRect {
            x: position.x,
            y: position.y,
            width: size.width as i32,
            height: size.height as i32,
        }
    })
    .collect();
```

Keep the existing fallback behavior when no monitor is returned.

- [ ] **Step 5: Save position on OS close request**

Modify `src-tauri/src/commands.rs` by adding:

```rust
pub fn persist_main_window_position(window: WebviewWindow) -> Result<AppConfig, String> {
    let state = window.state::<AppState>();
    save_current_window_position(window, state)
}
```

Modify `src-tauri/src/lib.rs` by importing `tauri::WindowEvent` and adding this builder hook before `.setup(...)`:

```rust
.on_window_event(|window, event| {
    if window.label() != "main" {
        return;
    }

    if matches!(event, WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed) {
        if let Err(error) = commands::persist_main_window_position(window.clone()) {
            eprintln!("窗口关闭前保存位置失败: {error}");
        }
    }
})
```

- [ ] **Step 6: Route tray exit through the shared helper**

Modify `src-tauri/src/tray.rs`:

```rust
fn save_window_position_before_exit(_app: &AppHandle, window: WebviewWindow) {
    if let Err(error) = commands::persist_main_window_position(window) {
        eprintln!("退出前保存窗口位置失败: {error}");
    }
}
```

Keep `app_handle.exit(0)` after this call.

- [ ] **Step 7: Run focused verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml window_position
cargo test --manifest-path src-tauri/Cargo.toml
pnpm check
```

Expected:

```text
window_position tests passed
Rust tests passed
pnpm check passed
```

- [ ] **Step 8: Commit**

```powershell
git add src-tauri/src/window_position.rs src-tauri/src/commands.rs src-tauri/src/config.rs src-tauri/src/lib.rs src-tauri/src/window_state.rs src-tauri/src/tray.rs
git commit -m "fix: harden window position persistence"
```

---

### Task 5: Add Beta Minimal Operational Features

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/config.rs`
- Create: `src-tauri/src/diagnostics.rs`
- Create: `src-tauri/src/logging.rs`
- Create: `src-tauri/src/platform/windows_autostart.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/tray.rs`
- Modify: `src/tauri/commands.ts`
- Modify: `src/tauri/commands.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing tray setup, config persistence, package version, app config directory, and current command wrapper pattern.
- Produces: launch-on-login toggle, version/about tray entry, config directory opener, simple log file, and diagnostics command.

- [ ] **Step 1: Add config fields and failing tests**

Modify `src-tauri/src/config.rs` by adding `startup: StartupConfig` to `AppConfig` and this struct:

```rust
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
```

Add tests:

```rust
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml launch_on_login
```

Expected: FAIL until `AppConfig::default()` initializes `startup`.

- [ ] **Step 3: Implement config defaults**

Modify `impl Default for AppConfig`:

```rust
Self {
    window: WindowConfig::default(),
    animation: AnimationConfig::default(),
    startup: StartupConfig::default(),
}
```

Keep `#[serde(default)]` on `AppConfig` so older config files load safely.

- [ ] **Step 4: Add Windows autostart implementation**

Modify `src-tauri/Cargo.toml`:

```toml
winreg = "0.55"
```

Create `src-tauri/src/platform/windows_autostart.rs`:

```rust
#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(target_os = "windows")]
use winreg::{enums::HKEY_CURRENT_USER, RegKey};

#[cfg(target_os = "windows")]
const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

#[cfg(target_os = "windows")]
pub fn set_launch_on_login(app_name: &str, exe_path: &Path, enabled: bool) -> std::io::Result<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu.create_subkey(RUN_KEY)?;

    if enabled {
        run_key.set_value(app_name, &format!("\"{}\"", exe_path.display()))?;
    } else {
        let _ = run_key.delete_value(app_name);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    #[test]
    fn quoted_exe_path_format_is_stable() {
        let path = PathBuf::from(r"C:\Program Files\PicoPet\picopet.exe");

        let value = format!("\"{}\"", path.display());

        assert_eq!(value, r#""C:\Program Files\PicoPet\picopet.exe""#);
    }
}
```

Modify `src-tauri/src/platform/mod.rs`:

```rust
pub mod windows_autostart;
```

- [ ] **Step 5: Add launch-on-login command**

Modify `src-tauri/src/commands.rs`:

```rust
#[tauri::command]
pub fn set_launch_on_login(
    enabled: bool,
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
        crate::platform::windows_autostart::set_launch_on_login("PicoPet", &exe_path, enabled)
            .map_err(|error| error.to_string())?;
    }

    crate::logging::append_log(&app, &format!("开机自启动设置为: {enabled}"));

    save_updated_config(&state, |config| {
        config.startup.launch_on_login = enabled;
    })
}
```

Modify `src-tauri/src/lib.rs` imports and `generate_handler!` to include `set_launch_on_login`.

- [ ] **Step 6: Add diagnostics and logging**

Create `src-tauri/src/logging.rs`:

```rust
use std::{fs::OpenOptions, io::Write, path::PathBuf};
use tauri::Manager;

pub fn log_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    Ok(dir.join("picopet.log"))
}

pub fn append_log(app: &tauri::AppHandle, message: &str) {
    let Ok(path) = log_file_path(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{message}");
    }
}
```

Create `src-tauri/src/diagnostics.rs`:

```rust
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticsInfo {
    pub version: String,
    pub config_dir: String,
    pub log_file: String,
}

#[tauri::command]
pub fn get_diagnostics_info(app: tauri::AppHandle) -> Result<DiagnosticsInfo, String> {
    let config_dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    let log_file = crate::logging::log_file_path(&app)?;

    Ok(DiagnosticsInfo {
        version: app.package_info().version.to_string(),
        config_dir: config_dir.display().to_string(),
        log_file: log_file.display().to_string(),
    })
}
```

Modify `src-tauri/src/lib.rs`:

```rust
mod diagnostics;
mod logging;
```

Call `logging::append_log(app.handle(), "PicoPet 启动");` during setup after config is loaded.

- [ ] **Step 7: Add tray entries**

Modify `src-tauri/src/tray.rs`:

```rust
const LAUNCH_ON_LOGIN_ID: &str = "toggle_launch_on_login";
const OPEN_CONFIG_ID: &str = "open_config_dir";
const ABOUT_ID: &str = "about";
```

Create menu items:

```rust
let launch_on_login = MenuItem::with_id(
    app,
    LAUNCH_ON_LOGIN_ID,
    launch_on_login_label(initial_config.startup.launch_on_login),
    true,
    None::<&str>,
)?;
let open_config = MenuItem::with_id(app, OPEN_CONFIG_ID, "打开配置目录", true, None::<&str>)?;
let about = MenuItem::with_id(
    app,
    ABOUT_ID,
    format!("关于 PicoPet {}", app.package_info().version),
    false,
    None::<&str>,
)?;
```

Add them before `退出`. Add helper:

```rust
fn launch_on_login_label(enabled: bool) -> &'static str {
    if enabled {
        "关闭开机自启动"
    } else {
        "开启开机自启动"
    }
}
```

For `OPEN_CONFIG_ID`, use:

```rust
fn open_config_dir(app: &AppHandle) {
    if let Ok(path) = app.path().app_config_dir() {
        let _ = std::process::Command::new("explorer").arg(path).spawn();
    }
}
```

For `LAUNCH_ON_LOGIN_ID`, toggle `config.startup.launch_on_login`, call `commands::set_launch_on_login`, update the menu label, emit config, and append a log entry.

Add tests for `launch_on_login_label(true)` and `launch_on_login_label(false)`.

- [ ] **Step 8: Add TypeScript command wrappers**

Modify `src/tauri/commands.ts`:

```ts
export type DiagnosticsInfo = {
  version: string;
  config_dir: string;
  log_file: string;
};

export function getDiagnosticsInfo(): Promise<DiagnosticsInfo> {
  return invoke<DiagnosticsInfo>("get_diagnostics_info");
}

export function setLaunchOnLogin(enabled: boolean): Promise<AppConfig> {
  return invoke<AppConfig>("set_launch_on_login", { enabled });
}
```

Extend `AppConfig`:

```ts
startup: {
  launch_on_login: boolean;
};
```

Modify `src/tauri/commands.test.ts`:

```ts
it("calls set_launch_on_login with the expected payload", async () => {
  const { invoke } = await import("@tauri-apps/api/core");
  const { setLaunchOnLogin } = await import("./commands");

  await setLaunchOnLogin(true);

  expect(invoke).toHaveBeenCalledWith("set_launch_on_login", { enabled: true });
});

it("calls get_diagnostics_info without payload", async () => {
  const { invoke } = await import("@tauri-apps/api/core");
  const { getDiagnosticsInfo } = await import("./commands");

  await getDiagnosticsInfo();

  expect(invoke).toHaveBeenCalledWith("get_diagnostics_info");
});
```

- [ ] **Step 9: Update README**

Add to `README.md` feature list:

```markdown
- Launch-on-login toggle from the tray menu.
- About/version entry in the tray menu.
- Config directory shortcut from the tray menu.
- Simple local log file for startup and tray operations.
```

Add to QA section:

```markdown
Use `docs/qa/windows-beta-checklist.md` before tagging a Beta build.
```

- [ ] **Step 10: Run verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml launch_on_login
cargo test --manifest-path src-tauri/Cargo.toml
pnpm test -- --run src/tauri/commands.test.ts
pnpm check
```

Expected:

```text
launch-on-login tests passed
Rust tests passed
commands.test.ts passed
pnpm check passed
```

- [ ] **Step 11: Commit**

```powershell
git add src-tauri/Cargo.toml src-tauri/src/config.rs src-tauri/src/diagnostics.rs src-tauri/src/logging.rs src-tauri/src/platform/windows_autostart.rs src-tauri/src/lib.rs src-tauri/src/tray.rs src/tauri/commands.ts src/tauri/commands.test.ts README.md
git commit -m "feat: add beta operational tray features"
```

---

## Final Verification

After Tasks 1-5, run from a fresh isolated worktree:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
$shimDir = Join-Path $env:LOCALAPPDATA 'CorepackShims'
if (Test-Path $shimDir) {
  $env:PATH = "$shimDir;$env:PATH"
}
pnpm install --frozen-lockfile
pnpm check
pnpm release:windows:gate
```

Expected:

```text
Vitest passes
TypeScript/Vite build passes
Rust tests pass
Tauri debug bundle builds
Tauri release bundle builds
Windows GUI subsystem check passes
Artifact validation passes
```

Then run manual QA:

```text
docs/qa/windows-beta-checklist.md
docs/qa/windows-installer-checklist.md
```

Record memory:

```powershell
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

Append the result to `docs/qa/memory-baseline.md`.

## Self-Review Result

- Spec coverage: the five Beta preparation areas map to Tasks 1-5.
- Marker scan: this plan contains no unresolved implementation markers.
- Type consistency: Rust and TypeScript command names match across interfaces and tasks.
- Scope check: the plan stays Windows-only and does not add AI, external skins, plugins, physics simulation, Electron, or frontend frameworks.
- Risk note: launch-on-login uses a small direct Windows registry dependency; this is scoped to Beta operational readiness and does not add a background service.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-windows-beta-prep.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
