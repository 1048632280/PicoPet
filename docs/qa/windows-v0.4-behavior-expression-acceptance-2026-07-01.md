# PicoPet Windows v0.4 Behavior Expression Acceptance Record

## Build

- Date: 2026-07-01
- Version: 0.4.0
- Branch: `codex/v0.4.0-rc-prep`
- Base commit before release-prep commit: `6407dd6`
- Automated gate: `pnpm release:windows:gate`
- Memory baseline: `pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json`

## Artifacts

- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_0.4.0_x64-setup.exe`
- Portable zip: `src-tauri/target/release/bundle/portable/PicoPet_0.4.0_x64-portable.zip`

## Automated Verification

- Vitest: 12 files, 91 tests passed.
- Rust unit tests: 69 tests passed.
- Windows subsystem integration test: 1 test passed.
- Vite build emitted `dist/index.html` and `dist/settings.html`.
- Tauri debug build completed.
- Tauri release build completed.
- Release executable uses the Windows GUI subsystem.
- Installer, release executable, and portable zip artifact checks passed.
- Portable zip contains `PicoPet/picopet.exe` and `PicoPet/data/`.

## Artifact Sizes

| Artifact | Size |
| --- | ---: |
| `src-tauri/target/release/picopet.exe` | 9,184,256 bytes |
| `src-tauri/target/release/bundle/nsis/PicoPet_0.4.0_x64-setup.exe` | 1,963,826 bytes |
| `src-tauri/target/release/bundle/portable/PicoPet_0.4.0_x64-portable.zip` | 2,680,251 bytes |

## GitHub Release Asset Verification

- Release: `v0.4.0-rc.1`
- Release URL: `https://github.com/1048632280/PicoPet/releases/tag/v0.4.0-rc.1`
- `PicoPet_0.4.0_x64-setup.exe`: 1,963,710 bytes, `sha256:d954d335e831a31772b0cd295668c754a8fd8c40c36d123fb7b45c6ef8578cbc`
- `PicoPet_0.4.0_x64-portable.zip`: 2,680,251 bytes, `sha256:749a9fff3cbaf26dfbef03d6c668a63bc254e4675877dd5dca43a002db8f6937`
- Downloaded release assets from GitHub and confirmed the portable zip contains `PicoPet/picopet.exe` and `PicoPet/data/`.

## Installer Smoke

- Installer source: GitHub Release asset `PicoPet_0.4.0_x64-setup.exe`.
- Install target: `%TEMP%/PicoPetInstallerQA-v0.4.0-rc.1/PicoPet`.
- Clean silent install exited `0` and installed `picopet.exe` plus `uninstall.exe`.
- First launch created `data/config.json`, `data/picopet.log`, and `data/EBWebView/` under the install directory.
- Overwrite silent install exited `0` and preserved the `config.json` SHA-256 hash.
- Silent uninstall exited `0`, removed installed app files, left `data/` in place, and left `0` PicoPet processes running.

## Stable Promotion Gate

- Final stable promotion gate: `pnpm release:windows:gate`
- Final promotion result: Pass
- `picopet.exe`: 9,184,256 bytes, `sha256:2cd91473cbc3e749c70ed3d8235d451a38d06234448f3d37e7012c25f84d96ac`
- `PicoPet_0.4.0_x64-setup.exe`: 1,963,826 bytes, `sha256:adaa2e50365f7a3dd1cb23be6f330f2a39c6f67f3e5b696f8324de1b0b5f249e`
- `PicoPet_0.4.0_x64-portable.zip`: 2,680,251 bytes, `sha256:bd6196736debfff5a727c925b8ea6e0723b4557adb84fdb2cabe12666becc657`

## Memory Baseline

| Metric | Value |
| --- | ---: |
| HostWorkingSetMB | 33.3 |
| HostPrivateBytesMB | 12.1 |
| HostWorkingSetPrivateMB | 8.1 |
| WebView2WorkingSetMB | 319.2 |
| WebView2PrivateBytesMB | 173.4 |
| WebView2WorkingSetPrivateMB | 83.7 |
| AppTargetWorkingSetPrivateMB | 91.8 |
| DiagnosticTotalWorkingSetMB | 352.5 |
| DiagnosticTotalPrivateBytesMB | 185.5 |
| ProcessCount | 7 |
| ExcludedLaunchShellCount | 0 |

## Manual QA

- Checklist: `docs/qa/windows-v0.4-behavior-expression-checklist.md`
- Maintenance regression checklist: `docs/qa/windows-v0.3.1-maintenance-checklist.md`
- Settings regression checklist: `docs/qa/windows-v0.3-settings-checklist.md`
- Installer checklist: `docs/qa/windows-installer-checklist.md`
- Result: Pass
- Tester: User manual validation in Codex thread
- Notes: User confirmed the v0.4.0 RC manual validation passed on 2026-07-01 after testing behavior expression, installer, and regression-critical flows.

## Result

The v0.4.0 release candidate automated checks, release asset smoke checks, installer smoke checks, memory baseline, and user manual QA passed. The build is accepted for stable `v0.4.0` promotion.
