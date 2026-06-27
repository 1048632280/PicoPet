# PicoPet Windows v0.3 Settings Acceptance Record

## Build

- Date: 2026-06-27
- Version: 0.3.0
- Base commit before release-prep commit: `5612f89`
- Automated gate: `pnpm release:windows:gate`

## Artifacts

- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_0.3.0_x64-setup.exe`
- Portable zip: `src-tauri/target/release/bundle/portable/PicoPet_0.3.0_x64-portable.zip`

## Automated Verification

- Vitest: 12 files, 72 tests passed.
- Rust unit tests: 58 tests passed.
- Windows subsystem integration test: 1 test passed.
- Vite build emitted `dist/settings.html`.
- Tauri debug build completed.
- Tauri release build completed.
- Release executable uses the Windows GUI subsystem.
- Installer, release executable, and portable zip artifact checks passed.
- Portable zip contains `PicoPet/picopet.exe` and `PicoPet/data/`.

## Manual QA

- Checklist: `docs/qa/windows-v0.3-settings-checklist.md`
- Installer checklist: `docs/qa/windows-installer-checklist.md`
- Result: Pass
- Tester: User manual validation in Codex thread
- Notes: User confirmed the third-step manual validation passed after testing the generated v0.3.0 artifacts.
