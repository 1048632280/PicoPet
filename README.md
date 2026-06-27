# PicoPet

PicoPet is a lightweight Windows desktop pet built with Tauri 2, Rust, WebView2, and vanilla TypeScript. The current focus is a small Windows-first Beta: transparent always-on-top pet window, built-in animation, tray controls, click-through, drag persistence, portable local data, installer QA, and repeatable release checks.

> [!NOTE]
> PicoPet is Windows-only right now. macOS and Linux are planned as separate platform-layer work, not part of this Beta phase.

## Features

- Transparent borderless desktop pet window.
- Always-on-top behavior.
- Built-in spritesheet animation.
- Drag-to-move with saved position.
- Chinese tray menu for pause/resume, click-through, reset position, scale controls, and exit.
- JSON config repair when local config is missing or damaged.
- Launch-on-login toggle from the tray menu.
- About/version entry in the tray menu.
- Config directory shortcut from the tray menu.
- Simple local log file for startup and tray operations.
- Portable local data under `PicoPet/data/`.
- Green portable zip artifact for unzip-and-run testing.
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
pnpm portable:windows
```

Debug bundles are written under `src-tauri/target/debug/bundle/`. Release bundles are written under `src-tauri/target/release/bundle/`.
The Windows portable zip is written to `src-tauri/target/release/bundle/portable/PicoPet_0.3.0_x64-portable.zip`.

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

Behavior parameters are currently configured through `data/config.json`:

```json
{
  "behavior": {
    "enabled": true,
    "preset": "quiet",
    "walk_mode": "short_range",
    "sleep_after_idle_seconds": 900
  }
}
```

Supported behavior values:

- `preset`: `quiet`, `normal`, `lively`
- `walk_mode`: `stationary`, `short_range`
- `sleep_after_idle_seconds`: `60` to `86400`

## Settings Window

PicoPet v0.3 adds a lightweight settings window from the tray menu item `设置`.

The settings window writes to the same portable config file used by manual editing:

```text
PicoPet/data/config.json
```

Available settings:

- Behavior preset: `quiet`, `normal`, `lively`
- Walk mode: `stationary`, `short_range`
- Sleep wait time: `60` to `86400` seconds
- Click-through
- Pause animation
- Window scale: `50%` to `200%`
- Reset position
- Launch on login
- Open config directory

Manual editing of `PicoPet/data/config.json` remains available for advanced users. `roaming` is not exposed in v0.3.

`v0.2.1` supports `quiet`, `normal`, and `lively` behavior presets, plus `stationary` and `short_range` walk modes. `roaming` remains planned for a later behavior release.

## QA

```powershell
pnpm check:windows
pnpm portable:windows
pnpm memory:windows
```

Use `docs/qa/windows-v0.3-settings-checklist.md` for v0.3 settings window QA, `docs/qa/windows-installer-checklist.md` for installer-specific QA, and `docs/qa/memory-baseline.md` for memory records. `docs/qa/windows-v0.2.1-checklist.md` is retained as the previous behavior-config QA record.
`docs/qa/windows-alpha-checklist.md` is historical Alpha documentation only and is not part of active Beta release QA.

## Scope

PicoPet does not include AI chat, external skin packages, plugins, physics simulation, or cross-platform support in the current Beta phase.
