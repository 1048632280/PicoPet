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
- Launch-on-login toggle from the tray menu.
- About/version entry in the tray menu.
- Config directory shortcut from the tray menu.
- Simple local log file for startup and tray operations.
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
Use `docs/qa/windows-beta-checklist.md` before tagging a Beta build.

## Scope

PicoPet does not include AI chat, external skin packages, plugins, physics simulation, or cross-platform support in the current Alpha.
