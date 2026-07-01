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
pnpm release:windows:gate
```

If the gate fails, run the lower-level diagnostic commands:

```powershell
pnpm check:windows:release
pnpm portable:windows
pnpm artifact:windows
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

## Manual QA

Run every item in:

- `docs/qa/windows-v0.4-behavior-expression-checklist.md`
- `docs/qa/windows-v0.3.1-maintenance-checklist.md`
- `docs/qa/windows-v0.3-settings-checklist.md`
- `docs/qa/windows-installer-checklist.md` for installer-specific QA

Confirm the v0.4 checklist covers behavior expression, walk modes, runtime regressions, and portable data. Confirm the v0.3 checklist covers settings-window behavior and regression coverage. Confirm the installer checklist covers clean install, overwrite install, and uninstall behavior with `PicoPet/data/`.
`docs/qa/windows-alpha-checklist.md` is retained as historical Alpha documentation only and is not part of active Beta release QA.

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
- NSIS installer: `src-tauri/target/release/bundle/nsis/PicoPet_<package version>_x64-setup.exe`
- Portable zip: `src-tauri/target/release/bundle/portable/PicoPet_<package version>_x64-portable.zip`

## Release Notes

For Windows release builds, include:

- Commit SHA.
- Windows version.
- WebView2 version.
- `AppTargetWorkingSetPrivateMB`.
- Known limitations from the README scope section.

## Acceptance Records

- Windows Beta portable data acceptance: `docs/qa/windows-beta-portable-data-acceptance-2026-06-24.md`
- Windows v0.4 behavior expression acceptance: `docs/qa/windows-v0.4-behavior-expression-acceptance-2026-07-01.md`
- Windows v0.4 behavior expression QA: `docs/qa/windows-v0.4-behavior-expression-checklist.md`
- Windows v0.3 settings acceptance: `docs/qa/windows-v0.3-settings-acceptance-2026-06-27.md`
- Windows v0.3.1 maintenance QA: `docs/qa/windows-v0.3.1-maintenance-checklist.md`
- Windows v0.3 settings QA: `docs/qa/windows-v0.3-settings-checklist.md`
- Windows v0.2.1 behavior QA: `docs/qa/windows-v0.2.1-checklist.md`
- Windows installer QA: `docs/qa/windows-installer-checklist.md`
- Windows memory baseline: `docs/qa/memory-baseline.md`
- Latest memory JSON artifact: `docs/qa/memory-baseline.latest.json`
- Historical Windows Alpha record only: `docs/qa/windows-alpha-acceptance-2026-06-23.md`
