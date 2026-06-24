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
The Windows portable zip is written to `src-tauri/target/release/bundle/portable/PicoPet_0.2.0-beta.1_x64-portable.zip`.

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

`v0.2.0` implements the `quiet` preset and `short_range` walk mode. The future settings window is planned for `v0.3`.

## QA

```powershell
pnpm check:windows
pnpm portable:windows
pnpm memory:windows
```

Use `docs/qa/windows-beta-checklist.md` for manual Beta runtime and portable zip verification, `docs/qa/windows-installer-checklist.md` for installer QA, and `docs/qa/memory-baseline.md` for memory records before tagging a Beta build.
`docs/qa/windows-alpha-checklist.md` is historical Alpha documentation only and is not part of active Beta release QA.

## Scope

PicoPet does not include AI chat, external skin packages, plugins, physics simulation, or cross-platform support in the current Beta phase.
