# PicoPet Windows Alpha Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Windows MVP into a Windows Alpha baseline with lower idle work, tray scale controls, reproducible QA scripts, and user-facing project documentation.

**Architecture:** Keep the current Tauri 2 split: Rust owns tray, commands, config persistence, and native window geometry; TypeScript owns canvas rendering and animation scheduling. QA automation stays in PowerShell scripts outside the runtime path.

**Tech Stack:** Tauri 2, Rust stable MSVC toolchain, WebView2, Vite, Vanilla TypeScript, Vitest, Canvas 2D, PowerShell 5+.

## Global Constraints

- First release remains Windows-only.
- Keep Tauri 2 + Rust + WebView2.
- Do not add Electron, React, Vue, Svelte, Tailwind, or large UI frameworks.
- Do not add AI chat, plugins, external skin packages, or cross-platform platform layers in this phase.
- `window.scale` allowed range is exactly 0.5-2.0.
- Tray menu labels are Chinese.
- Source comments must be Chinese when comments are necessary.
- All text files are UTF-8.
- Release-build host + WebView2 child Private Working Set target remains 50-100 MB.
- PowerShell commands and scripts must set UTF-8 output before reading or writing Chinese text.

---

## Reference Documents

- Approved Alpha design: `docs/superpowers/specs/2026-06-23-windows-alpha-hardening-design.md`
- Existing MVP design: `docs/superpowers/specs/2026-06-22-picopet-windows-mvp-design.md`
- Existing MVP plan: `docs/superpowers/plans/2026-06-22-picopet-windows-mvp.md`
- Existing QA checklist: `docs/qa/windows-mvp-checklist.md`
- Existing memory baseline: `docs/qa/memory-baseline.md`

## Planned File Structure

```text
E:/GithubRepo/PicoPet/
  README.md
  package.json
  docs/
    qa/
      memory-baseline.md
      windows-alpha-checklist.md
    release/
      windows-release-process.md
    superpowers/
      specs/
        2026-06-23-windows-alpha-hardening-design.md
      plans/
        2026-06-23-windows-alpha-hardening.md
  scripts/
    windows-memory-baseline.ps1
    windows-release-smoke.ps1
  src/
    app.ts
    app.test.ts
    pet/
      animationLoop.ts
      animationLoop.test.ts
    tauri/
      commands.ts
      commands.test.ts
  src-tauri/
    src/
      commands.rs
      config.rs
      lib.rs
      tray.rs
      window_state.rs
```

## Public Interfaces

TypeScript interfaces added by this plan:

```ts
export type AnimationLoopOptions = {
  isActive: () => boolean;
  tick: (now: number) => void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
};

export type AnimationLoopController = {
  sync(): void;
  stop(): void;
  isRunning(): boolean;
};

export function createAnimationLoop(options: AnimationLoopOptions): AnimationLoopController;
export function setWindowScale(scale: number): Promise<AppConfig>;
```

Rust interfaces added by this plan:

```rust
pub const SCALE_STEP: f64;

impl AppConfig {
    pub fn with_scale(self, scale: f64) -> Self;
    pub fn with_scale_delta(self, delta: f64) -> Self;
}

pub fn scale_up_value(current: f64) -> f64;
pub fn scale_down_value(current: f64) -> f64;

#[tauri::command]
pub fn set_window_scale(scale: f64, window: tauri::WebviewWindow, state: tauri::State<AppState>) -> Result<AppConfig, String>;
```

PowerShell scripts added by this plan:

```powershell
scripts/windows-release-smoke.ps1 [-Release]
scripts/windows-memory-baseline.ps1 [-ProcessName <string[]>] [-OutputJson <path>]
```

---

### Task 1: Stop Animation Work While Paused Or Hidden

**Files:**
- Create: `src/pet/animationLoop.ts`
- Create: `src/pet/animationLoop.test.ts`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`

**Interfaces:**
- Consumes: existing `frameIndexAt`, `shouldRenderFrame`, `PetRenderer`, `picopet://config` event, and `AppConfig.animation.paused`.
- Produces: `createAnimationLoop(options: AnimationLoopOptions): AnimationLoopController`.

- [ ] **Step 1: Write failing animation loop tests**

Create `src/pet/animationLoop.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createAnimationLoop } from "./animationLoop";

describe("createAnimationLoop", () => {
  it("does not request a frame while inactive", () => {
    const requestFrame = vi.fn();
    const loop = createAnimationLoop({
      isActive: () => false,
      tick: vi.fn(),
      requestFrame
    });

    loop.sync();

    expect(requestFrame).not.toHaveBeenCalled();
    expect(loop.isRunning()).toBe(false);
  });

  it("requests one frame while active and keeps only one pending frame", () => {
    const requestFrame = vi.fn(() => 7);
    const loop = createAnimationLoop({
      isActive: () => true,
      tick: vi.fn(),
      requestFrame
    });

    loop.sync();
    loop.sync();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(loop.isRunning()).toBe(true);
  });

  it("cancels a pending frame when it becomes inactive", () => {
    let active = true;
    const requestFrame = vi.fn(() => 11);
    const cancelFrame = vi.fn();
    const loop = createAnimationLoop({
      isActive: () => active,
      tick: vi.fn(),
      requestFrame,
      cancelFrame
    });

    loop.sync();
    active = false;
    loop.sync();

    expect(cancelFrame).toHaveBeenCalledWith(11);
    expect(loop.isRunning()).toBe(false);
  });

  it("runs tick and schedules the next frame only when still active", () => {
    const callbacks: FrameRequestCallback[] = [];
    let active = true;
    const tick = vi.fn(() => {
      active = false;
    });
    const loop = createAnimationLoop({
      isActive: () => active,
      tick,
      requestFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      }
    });

    loop.sync();
    callbacks[0](100);

    expect(tick).toHaveBeenCalledWith(100);
    expect(callbacks).toHaveLength(1);
    expect(loop.isRunning()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
$shimDir = Join-Path $env:LOCALAPPDATA 'CorepackShims'
$env:PATH = "$shimDir;$env:PATH"
pnpm test -- --run src/pet/animationLoop.test.ts
```

Expected: FAIL because `src/pet/animationLoop.ts` does not exist.

- [ ] **Step 3: Implement the animation loop controller**

Create `src/pet/animationLoop.ts`:

```ts
export type AnimationLoopOptions = {
  isActive: () => boolean;
  tick: (now: number) => void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
};

export type AnimationLoopController = {
  sync(): void;
  stop(): void;
  isRunning(): boolean;
};

export function createAnimationLoop(options: AnimationLoopOptions): AnimationLoopController {
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
  let frameHandle: number | null = null;

  function run(now: number) {
    frameHandle = null;
    if (!options.isActive()) {
      return;
    }

    options.tick(now);

    if (options.isActive()) {
      frameHandle = requestFrame(run);
    }
  }

  return {
    sync() {
      if (!options.isActive()) {
        this.stop();
        return;
      }

      if (frameHandle === null) {
        frameHandle = requestFrame(run);
      }
    },
    stop() {
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
    },
    isRunning() {
      return frameHandle !== null;
    }
  };
}
```

- [ ] **Step 4: Integrate the controller into `src/app.ts`**

Modify `src/app.ts`:

```ts
import { createAnimationLoop } from "./pet/animationLoop";
```

Inside `boot()`, replace the direct `requestAnimationFrame(tick)` scheduling with state-driven control:

```ts
  let imageReady = false;
  const applyCanvasScale = () => {
    canvas.style.width = `${atlas.frame_width * config.window.scale}px`;
    canvas.style.height = `${atlas.frame_height * config.window.scale}px`;
  };
  const isAnimationActive = () => imageReady && !paused && !document.hidden;
  const loop = createAnimationLoop({
    isActive: isAnimationActive,
    tick
  });
```

Use `applyCanvasScale()` instead of the two initial canvas style assignments. In `image.onload`, set `imageReady = true`, render frame 0, and call `loop.sync()` instead of `requestAnimationFrame(tick)`. In `image.onerror`, call `loop.stop()` after `renderer.renderFallback()`.

At the end of `tick(now)`, remove the unconditional `requestAnimationFrame(tick)` call. The controller schedules the next frame.

In the `picopet:config` listener, update `paused`, call `applyCanvasScale()`, then call `loop.sync()`. In `visibilitychange`, keep resetting `startedAt` and `previousFrameAt` when visible, then call `loop.sync()` for both visible and hidden transitions.

- [ ] **Step 5: Extend app tests for paused scheduling and scale sync**

Modify `src/app.test.ts` so the request/cancel frame globals are observable:

```ts
const frameMocks = vi.hoisted(() => ({
  requestAnimationFrame: vi.fn(() => 1),
  cancelAnimationFrame: vi.fn()
}));
```

In `beforeEach()`, replace the current `requestAnimationFrame` stub:

```ts
vi.stubGlobal("requestAnimationFrame", frameMocks.requestAnimationFrame);
vi.stubGlobal("cancelAnimationFrame", frameMocks.cancelAnimationFrame);
frameMocks.requestAnimationFrame.mockClear();
frameMocks.cancelAnimationFrame.mockClear();
```

Add a test that paused startup renders the first frame but does not schedule animation:

```ts
expect(frameMocks.requestAnimationFrame).not.toHaveBeenCalled();
```

Add a test that a tray config event with `window.scale: 1.5` changes the canvas CSS size to `192px`.

- [ ] **Step 6: Run focused and full verification**

Run:

```powershell
pnpm test -- --run src/pet/animationLoop.test.ts src/app.test.ts
pnpm check
```

Expected:

```text
animationLoop.test.ts passed
app.test.ts passed
Test Files 7 passed
Rust tests 14 passed
```

- [ ] **Step 7: Commit**

```powershell
git add src/app.ts src/app.test.ts src/pet/animationLoop.ts src/pet/animationLoop.test.ts
git commit -m "perf: stop animation loop while inactive"
```

---

### Task 2: Add Tray Scale Controls

**Files:**
- Modify: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/window_state.rs`
- Modify: `src/tauri/commands.ts`
- Modify: `src/tauri/commands.test.ts`

**Interfaces:**
- Consumes: existing `AppConfig::scaled_window_side`, `ConfigStore`, `AppState`, `picopet://config` event, and tray service.
- Produces: `set_window_scale`, `setWindowScale`, tray menu items `放大`, `缩小`, `重置大小`.

- [ ] **Step 1: Write failing Rust tests for scale helpers**

Add tests to `src-tauri/src/config.rs`:

```rust
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
```

Add tests to `src-tauri/src/tray.rs`:

```rust
#[test]
fn scale_menu_event_requires_main_window() {
    assert!(menu_event_requires_main_window(SCALE_UP_ID));
    assert!(menu_event_requires_main_window(SCALE_DOWN_ID));
    assert!(menu_event_requires_main_window(SCALE_RESET_ID));
}

#[test]
fn scale_step_helpers_clamp_at_bounds() {
    assert_eq!(scale_up_value(1.0), 1.25);
    assert_eq!(scale_up_value(2.0), 2.0);
    assert_eq!(scale_down_value(1.0), 0.75);
    assert_eq!(scale_down_value(0.5), 0.5);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml scale
```

Expected: FAIL because the scale helper methods and tray constants do not exist.

- [ ] **Step 3: Implement scale config helpers**

Modify `src-tauri/src/config.rs`:

```rust
pub const SCALE_STEP: f64 = 0.25;
```

Add methods in `impl AppConfig`:

```rust
pub fn with_scale(mut self, scale: f64) -> Self {
    self.window.scale = scale;
    self.sanitized()
}

pub fn with_scale_delta(self, delta: f64) -> Self {
    let next = ((self.window.scale + delta) * 100.0).round() / 100.0;
    self.with_scale(next)
}
```

- [ ] **Step 4: Add the Tauri scale command**

Modify `src-tauri/src/commands.rs` by adding a private geometry helper:

```rust
fn apply_window_geometry(window: &WebviewWindow, config: &AppConfig) -> Result<(), String> {
    let monitor = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let size = monitor.map(|monitor| *monitor.size());
    let width = size.as_ref().map(|size| size.width as i32).unwrap_or(1920);
    let height = size.as_ref().map(|size| size.height as i32).unwrap_or(1080);
    let side = config.scaled_window_side();
    let visible = config
        .clone()
        .with_window_bounds(width, height, side, side);

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: side as u32,
            height: side as u32,
        }))
        .map_err(|error| error.to_string())?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: visible.window.x,
            y: visible.window.y,
        }))
        .map_err(|error| error.to_string())?;

    Ok(())
}
```

Add the command:

```rust
#[tauri::command]
pub fn set_window_scale(
    scale: f64,
    window: WebviewWindow,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let next_config = state
        .config
        .lock()
        .map_err(|_| "config lock is poisoned".to_string())?
        .clone()
        .with_scale(scale);

    apply_window_geometry(&window, &next_config)?;

    save_updated_config(&state, |config| {
        config.window.scale = next_config.window.scale;
        config.window.x = next_config.window.x;
        config.window.y = next_config.window.y;
    })
}
```

If `reset_window_position` duplicates geometry code after this change, route it through `apply_window_geometry` without changing its public behavior.

- [ ] **Step 5: Register command and frontend wrapper**

Modify `src-tauri/src/lib.rs` imports and `generate_handler!` to include `set_window_scale`.

Modify `src/tauri/commands.ts`:

```ts
export function setWindowScale(scale: number): Promise<AppConfig> {
  return invoke<AppConfig>("set_window_scale", { scale });
}
```

Modify `src/tauri/commands.test.ts` to assert `setWindowScale(1.25)` invokes `set_window_scale` with `{ scale: 1.25 }`.

- [ ] **Step 6: Add tray scale menu items**

Modify `src-tauri/src/tray.rs`:

```rust
const SCALE_UP_ID: &str = "scale_up";
const SCALE_DOWN_ID: &str = "scale_down";
const SCALE_RESET_ID: &str = "scale_reset";
```

Add menu items after reset position and before exit:

```rust
let scale_up = MenuItem::with_id(app, SCALE_UP_ID, "放大", true, None::<&str>)?;
let scale_down = MenuItem::with_id(app, SCALE_DOWN_ID, "缩小", true, None::<&str>)?;
let scale_reset = MenuItem::with_id(app, SCALE_RESET_ID, "重置大小", true, None::<&str>)?;
let menu = Menu::with_items(
    app,
    &[&pause, &click_through, &reset, &scale_up, &scale_down, &scale_reset, &exit],
)?;
```

Add helpers:

```rust
fn scale_up_value(current: f64) -> f64 {
    crate::config::AppConfig::default()
        .with_scale(current)
        .with_scale_delta(crate::config::SCALE_STEP)
        .window
        .scale
}

fn scale_down_value(current: f64) -> f64 {
    crate::config::AppConfig::default()
        .with_scale(current)
        .with_scale_delta(-crate::config::SCALE_STEP)
        .window
        .scale
}
```

Handle events by reading the current config scale, calling `commands::set_window_scale(next_scale, window.clone(), state)`, and emitting the returned config through `emit_config(app, config)`.

- [ ] **Step 7: Run verification**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml scale
cargo test --manifest-path src-tauri/Cargo.toml
pnpm test -- --run src/tauri/commands.test.ts
pnpm check
```

Expected:

```text
scale helper tests passed
Rust tests passed
commands.test.ts passed
pnpm check passed
```

- [ ] **Step 8: Commit**

```powershell
git add src-tauri/src/config.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/src/tray.rs src-tauri/src/window_state.rs src/tauri/commands.ts src/tauri/commands.test.ts
git commit -m "feat: add tray scale controls"
```

---

### Task 3: Add Windows QA Automation Scripts

**Files:**
- Create: `scripts/windows-release-smoke.ps1`
- Create: `scripts/windows-memory-baseline.ps1`
- Modify: `package.json`
- Modify: `docs/qa/memory-baseline.md`

**Interfaces:**
- Consumes: existing `pnpm check`, `pnpm tauri build --debug`, and memory baseline process-tree procedure.
- Produces: repeatable Windows QA entry points `pnpm check:windows` and `pnpm memory:windows`.

- [ ] **Step 1: Create release smoke script**

Create `scripts/windows-release-smoke.ps1`:

```powershell
param(
  [switch]$Release
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$shimDir = Join-Path $env:LOCALAPPDATA "CorepackShims"
if (Test-Path $shimDir) {
  $env:PATH = "$shimDir;$env:PATH"
}

Write-Host "== PicoPet Windows smoke check =="
pnpm check
pnpm tauri build --debug

if ($Release) {
  pnpm tauri build
}

Write-Host "== Smoke check completed =="
```

- [ ] **Step 2: Create memory baseline script**

Create `scripts/windows-memory-baseline.ps1`:

```powershell
param(
  [string[]]$ProcessName = @("PicoPet", "picopet"),
  [string]$OutputJson = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Convert-ToMB($bytes) {
  if ($null -eq $bytes) { return $null }
  [math]::Round([double]$bytes / 1MB, 1)
}

function Sum-MB($rows, $propertyName) {
  $values = @($rows | Where-Object { $null -ne $_.$propertyName } | ForEach-Object { [double]$_.$propertyName })
  if ($values.Count -eq 0) { return $null }
  [math]::Round(($values | Measure-Object -Sum).Sum, 1)
}

$roots = @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)
if ($roots.Count -eq 0) {
  throw "No PicoPet process found. Launch PicoPet, wait 60 seconds, then rerun this script."
}

$processes = @(Get-CimInstance Win32_Process)
$perfById = @{}
foreach ($perf in @(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop)) {
  if ($perf.IDProcess -gt 0 -and -not $perfById.ContainsKey([int]$perf.IDProcess)) {
    $perfById[[int]$perf.IDProcess] = $perf
  }
}

$ids = New-Object "System.Collections.Generic.HashSet[int]"
$queue = New-Object "System.Collections.Generic.Queue[int]"
foreach ($root in $roots) {
  [void]$ids.Add([int]$root.Id)
  $queue.Enqueue([int]$root.Id)
}

while ($queue.Count -gt 0) {
  $parent = $queue.Dequeue()
  foreach ($child in @($processes | Where-Object { $_.ParentProcessId -eq $parent })) {
    if ($ids.Add([int]$child.ProcessId)) {
      $queue.Enqueue([int]$child.ProcessId)
    }
  }
}

$treeRows = @(
  foreach ($process in @(Get-Process -Id ([int[]]$ids) -ErrorAction SilentlyContinue | Sort-Object Id)) {
    $perf = $perfById[[int]$process.Id]
    $processInfo = $processes | Where-Object { $_.ProcessId -eq $process.Id } | Select-Object -First 1
    $role = switch ($process.ProcessName) {
      { $_ -in @("PicoPet", "picopet") } { "Host"; break }
      "msedgewebview2" { "WebView2"; break }
      "conhost" { "LaunchShell"; break }
      default { "Other" }
    }
    [pscustomobject]@{
      Role = $role
      ProcessName = $process.ProcessName
      Id = $process.Id
      ParentProcessId = $processInfo.ParentProcessId
      WorkingSetMB = Convert-ToMB $process.WorkingSet64
      PrivateBytesMB = Convert-ToMB $process.PrivateMemorySize64
      WorkingSetPrivateMB = if ($perf) { Convert-ToMB $perf.WorkingSetPrivate } else { $null }
    }
  }
)

$targetRows = @($treeRows | Where-Object { $_.Role -in @("Host", "WebView2") })
$summary = [pscustomobject]@{
  CapturedAt = (Get-Date).ToString("s")
  AppTargetWorkingSetPrivateMB = Sum-MB $targetRows "WorkingSetPrivateMB"
  DiagnosticTotalWorkingSetMB = Sum-MB $targetRows "WorkingSetMB"
  DiagnosticTotalPrivateBytesMB = Sum-MB $targetRows "PrivateBytesMB"
  ProcessCount = $targetRows.Count
  ExcludedLaunchShellCount = @($treeRows | Where-Object { $_.Role -eq "LaunchShell" }).Count
  Processes = $treeRows
}

$treeRows | Format-Table -AutoSize
$summary | Select-Object CapturedAt, AppTargetWorkingSetPrivateMB, DiagnosticTotalWorkingSetMB, DiagnosticTotalPrivateBytesMB, ProcessCount, ExcludedLaunchShellCount | Format-List

if ($OutputJson -ne "") {
  $summary | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $OutputJson
  Write-Host "Wrote memory baseline JSON to $OutputJson"
}
```

- [ ] **Step 3: Add package script aliases**

Modify `package.json` scripts:

```json
"check:windows": "powershell -ExecutionPolicy Bypass -File scripts/windows-release-smoke.ps1",
"check:windows:release": "powershell -ExecutionPolicy Bypass -File scripts/windows-release-smoke.ps1 -Release",
"memory:windows": "powershell -ExecutionPolicy Bypass -File scripts/windows-memory-baseline.ps1"
```

Keep the existing `dev`, `build`, `test`, `check`, and `tauri` scripts unchanged.

- [ ] **Step 4: Update memory baseline docs**

Modify `docs/qa/memory-baseline.md` command section to lead with:

```markdown
## Scripted Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

The script excludes `LaunchShell` rows from `AppTargetWorkingSetPrivateMB` and keeps total Working Set as diagnostic context.
```

Keep the existing inline PowerShell command below as a manual fallback section named `Manual Fallback Command`.

- [ ] **Step 5: Run verification**

Run:

```powershell
pnpm check:windows
powershell -ExecutionPolicy Bypass -File scripts/windows-memory-baseline.ps1
```

Expected:

```text
pnpm check passed
pnpm tauri build --debug passed
memory script throws "No PicoPet process found" if the app is not running
```

The memory script throwing when no app is running is acceptable for this focused verification because it proves the script runs and gives a clear precondition error.

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts/windows-release-smoke.ps1 scripts/windows-memory-baseline.ps1 docs/qa/memory-baseline.md
git commit -m "chore: add windows qa scripts"
```

---

### Task 4: Add README, Alpha QA Checklist, And Release Process

**Files:**
- Create: `README.md`
- Create: `docs/qa/windows-alpha-checklist.md`
- Create: `docs/release/windows-release-process.md`

**Interfaces:**
- Consumes: existing MVP docs, Alpha design, QA scripts from Task 3, and package scripts.
- Produces: user-facing project entrypoint and release checklist.

- [ ] **Step 1: Create README**

Create `README.md` with these sections in this order:

```markdown
# PicoPet

PicoPet is a lightweight Windows desktop pet built with Tauri 2, Rust, WebView2, and vanilla TypeScript. The current focus is a small Windows-first Alpha: transparent always-on-top pet window, built-in animation, tray controls, click-through, drag persistence, and repeatable QA.

> [!NOTE]
> PicoPet is Windows-only right now. macOS and Linux are planned as separate platform-layer work, not part of this Alpha.

## Features

- Transparent borderless desktop pet window.
- Always-on-top behavior.
- Built-in spritesheet animation.
- Drag-to-move with saved position.
- Chinese tray menu for pause/resume, click-through, reset position, scale controls, and exit.
- JSON config repair when local config is missing or damaged.
- Windows memory baseline target of 50-100 MB Private Working Set for the app host plus WebView2 children in release builds.

## Requirements

- Windows 10 or Windows 11.
- WebView2 Runtime installed, or installer bootstrap support available.
- Node.js with Corepack.
- pnpm 10 through `packageManager`.
- Rust stable MSVC toolchain.

## Development

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
$shimDir = Join-Path $env:LOCALAPPDATA 'CorepackShims'
corepack enable --install-directory $shimDir
$env:PATH = "$shimDir;$env:PATH"
pnpm install
pnpm check
pnpm tauri dev
```

## Build

```powershell
pnpm tauri build --debug
pnpm tauri build
```

Debug bundles are written under `src-tauri/target/debug/bundle/`. Release bundles are written under `src-tauri/target/release/bundle/`.

## QA

```powershell
pnpm check:windows
pnpm memory:windows
```

Use `docs/qa/windows-alpha-checklist.md` for manual Alpha verification and `docs/qa/memory-baseline.md` for memory records.

## Scope

PicoPet does not include AI chat, external skin packages, plugins, physics simulation, or cross-platform support in the current Alpha.
```

- [ ] **Step 2: Create Windows Alpha checklist**

Create `docs/qa/windows-alpha-checklist.md`:

```markdown
# PicoPet Windows Alpha QA Checklist

## Environment

- Windows 10 or Windows 11.
- WebView2 Runtime installed or installer can bootstrap it.
- Built from branch `codex/windows-alpha-hardening`.
- `pnpm check:windows` completed before manual QA.

## Manual Checks

- [ ] Launch app with `pnpm tauri dev`.
- [ ] Confirm the pet window is transparent and borderless.
- [ ] Confirm the pet stays above Notepad.
- [ ] Drag the pet to a new position.
- [ ] Exit from tray menu.
- [ ] Launch again and confirm the previous position is restored.
- [ ] Use tray menu `暂停动画`; confirm animation stops.
- [ ] Confirm paused state does not cause visible CPU activity in Task Manager.
- [ ] Use tray menu `继续动画`; confirm animation resumes.
- [ ] Use tray menu `放大`; confirm pet size increases and remains visible.
- [ ] Use tray menu `缩小`; confirm pet size decreases and remains draggable.
- [ ] Use tray menu `重置大小`; confirm size returns to default.
- [ ] Use tray menu `开启点击穿透`; confirm clicks pass through to a window underneath.
- [ ] Disable click-through from tray and confirm dragging works again.
- [ ] Use tray menu `重置位置`; confirm pet returns near primary screen bottom-right.
- [ ] Use tray menu `退出`; confirm no PicoPet process remains in Task Manager.
- [ ] Launch release executable, wait 60 seconds, and run `pnpm memory:windows`.
- [ ] Record `AppTargetWorkingSetPrivateMB` in `docs/qa/memory-baseline.md`.
```

- [ ] **Step 3: Create Windows release process**

Create `docs/release/windows-release-process.md`:

```markdown
# PicoPet Windows Release Process

## Preconditions

- Work is on a release candidate branch.
- `git status --short --branch` shows no unrelated tracked changes.
- `pnpm install` has completed.
- WebView2 Runtime is installed on the test machine.

## Verification

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm check:windows
pnpm check:windows:release
```

## Manual QA

Run every item in `docs/qa/windows-alpha-checklist.md`.

## Memory Baseline

1. Launch the release executable from `src-tauri/target/release/picopet.exe`.
2. Wait 60 seconds.
3. Run:

```powershell
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

4. Copy the summary values into the record table in `docs/qa/memory-baseline.md`.

## Artifacts

- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/`

## Release Notes

For Alpha builds, include:

- Commit SHA.
- Windows version.
- WebView2 version.
- `AppTargetWorkingSetPrivateMB`.
- Known limitations from the README scope section.
```

- [ ] **Step 4: Run documentation checks**

Run:

```powershell
$badMarkers = @("TB" + "D", "TO" + "DO", "待" + "定", "以后" + "补", "place" + "holder", "占" + "位") -join "|"
rg -n $badMarkers README.md docs/qa/windows-alpha-checklist.md docs/release/windows-release-process.md
pnpm check
```

Expected:

```text
rg returns no matches
pnpm check passes
```

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/qa/windows-alpha-checklist.md docs/release/windows-release-process.md
git commit -m "docs: add windows alpha release docs"
```

---

## Final Verification

After Tasks 1-4, run from `E:/GithubRepo/PicoPet/.worktrees/windows-alpha-hardening`:

```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF8
$shimDir = Join-Path $env:LOCALAPPDATA 'CorepackShims'
$env:PATH = "$shimDir;$env:PATH"
pnpm check
pnpm tauri build --debug
pnpm check:windows
```

Expected:

```text
Vitest passes
TypeScript/Vite build passes
Rust tests pass
Tauri debug bundle builds
Windows smoke script completes
```

Then run manual QA from `docs/qa/windows-alpha-checklist.md` and record release memory using `scripts/windows-memory-baseline.ps1`.

## Self-Review Result

- Spec coverage: each Alpha design goal maps to one task.
- Marker scan: plan contains no unresolved marker strings or incomplete sections.
- Type consistency: `set_window_scale`, `setWindowScale`, and `createAnimationLoop` names match across task interfaces and steps.
- Scope check: plan stays Windows-only and does not add AI, plugins, external skins, or cross-platform work.
