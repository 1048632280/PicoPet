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
