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

## Acceptance Records

- Windows Alpha: `docs/qa/windows-alpha-acceptance-2026-06-23.md`

For Alpha builds, include:

- Commit SHA.
- Windows version.
- WebView2 version.
- `AppTargetWorkingSetPrivateMB`.
- Known limitations from the README scope section.
