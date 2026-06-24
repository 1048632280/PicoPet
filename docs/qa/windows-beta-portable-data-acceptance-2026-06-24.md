# PicoPet Windows Beta Portable Data Acceptance - 2026-06-24

## Scope

This record verifies the post-merge Windows Beta portable data directory work from PR #6.

## Accepted Build

- Branch: `main`
- Merge commit: `5664d72`
- Release executable: `src-tauri/target/release/picopet.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`
- Portable zip: `src-tauri/target/release/bundle/portable/PicoPet_0.1.0_x64-portable.zip`

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm release:windows:gate` | Passed | Vitest, Vite build, Rust tests, debug build, release build, NSIS bundle, GUI subsystem check, portable packaging, and artifact validation passed |
| Portable artifact validation | Passed | `PicoPet_0.1.0_x64-portable.zip` verified larger than 1 MB and contains `PicoPet/picopet.exe` plus `PicoPet/data/` |
| Windows GUI subsystem | Passed | `scripts/assert-windows-gui-subsystem.ps1` verified the release executable |

## Runtime Acceptance

| Area | Result | Notes |
| --- | --- | --- |
| Portable zip first launch | Passed | Extracted to `%TEMP%/PicoPetPortableQA-main`; launch created `PicoPet/data/config.json`, `PicoPet/data/picopet.log`, and `PicoPet/data/EBWebView/` |
| Release executable first launch | Passed | Removing `src-tauri/target/release/data` then launching `picopet.exe` recreated `data/config.json`, `data/picopet.log`, and `data/EBWebView/` beside the executable |
| Old AppData paths | Passed | No `%APPDATA%/com.picopet.*` or `%LOCALAPPDATA%/com.picopet.*` path changed during portable or release-exe launch checks |
| Memory baseline | Passed | `AppTargetWorkingSetPrivateMB` was 91.0 MB after 70 seconds idle, within the 50-100 MB target; raw JSON saved to `docs/qa/memory-baseline.2026-06-24-portable-main.json` |

## Installer Acceptance

Installer QA used a user-writable test directory:

```text
%TEMP%/PicoPetInstallerQA/PicoPet
```

| Area | Result | Notes |
| --- | --- | --- |
| Clean install | Passed | Silent NSIS install exited 0 and installed `picopet.exe` plus `uninstall.exe` |
| Installed first launch | Passed | Launch created `data/config.json`, `data/picopet.log`, and `data/EBWebView/` under the install directory |
| Overwrite install | Passed | Running the installer again exited 0 and preserved the existing `data/config.json` hash |
| Uninstall | Passed | Silent uninstall exited 0, removed installed program files, and left `data/` in place for Beta |

## Remaining Manual Checks

- Click tray `打开配置目录` and confirm it opens `PicoPet/data/`.
- Invoke diagnostics in a running app session and confirm `config_dir`, `config_file`, and `log_file` all point under `PicoPet/data/`.

## Result

Portable data directory acceptance passed for the automated and scriptable Windows Beta checks. The remaining items require manual UI interaction before final Beta release sign-off.
