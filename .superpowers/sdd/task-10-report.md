# Task 10 Report: Add QA Checklist and Memory Baseline Procedure

## Status

DONE_WITH_CONCERNS

## What Changed

- Added `docs/qa/windows-mvp-checklist.md` with the Windows MVP manual QA checklist from the task brief.
- Added `docs/qa/memory-baseline.md` with the idle memory target, PowerShell measurement command, expected result, and record template.
- Added a `check` script to `package.json` that runs Vitest, the frontend build, and Rust tests in one command using `corepack pnpm` for reliability in this environment.

## Files Changed

- `docs/qa/windows-mvp-checklist.md`
- `docs/qa/memory-baseline.md`
- `package.json`

## Tests and Verification

- `corepack pnpm check`
  - Vitest: 6 files passed, 12 tests passed.
  - Frontend build: TypeScript check and Vite build passed.
  - Rust tests: 12 passed, 0 failed.
- `corepack pnpm exec tauri build --debug`
  - Frontend build passed.
  - Rust debug build passed.
  - NSIS debug setup bundle was produced at `src-tauri/target/debug/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`.

## Self-Review

- Compared the new QA checklist against Step 1 in the task brief; required environment and manual checks are present.
- Compared the memory baseline procedure against Step 2 in the task brief; target, command, expected results, and record template are present.
- Confirmed `package.json` keeps the existing `dev`, `build`, `test`, and `tauri` scripts while adding the requested one-command `check` script.
- Reviewed `git diff` and `git status` before committing to keep the change scoped to Task 10 files.

## Concerns

- Manual Windows QA checklist execution was not performed in this non-interactive coding pass.
- Idle memory was not recorded because that requires launching the app, waiting 60 seconds, and observing the live process interactively.
- The Tauri build emitted the existing warning that bundle identifier `com.picopet.app` ends with `.app`; this task did not modify that config.

## Task 10 Fix

### Changes

- Changed `package.json` `check` script to the task-specified command exactly: `pnpm test -- --run && pnpm build && cargo test --manifest-path src-tauri/Cargo.toml`.
- Recorded a dated idle memory baseline row in `docs/qa/memory-baseline.md`.

### Verification

- `corepack pnpm check`
  - Initial result: failed before tests because nested `pnpm` in the exact package script was not resolvable in this PowerShell environment (`'pnpm' is not recognized as an internal or external command`).
  - Diagnosis: `corepack pnpm --version` returned `10.0.0`; `Get-Command pnpm` returned no command; `Get-Command corepack` resolved to `D:\nodejs\corepack.cmd`.
- `corepack pnpm check` with a temporary PATH shim at `%TEMP%\picopet-pnpm-shim\pnpm.cmd` delegating to `corepack pnpm %*`
  - Vitest: 6 files passed, 12 tests passed.
  - Frontend build: TypeScript check and Vite build passed.
  - Rust tests: 12 passed, 0 failed.
- Memory baseline
  - Command: launched `src-tauri/target/debug/picopet.exe`, waited 65 seconds, ran the documented `Get-Process PicoPet,picopet` command, then stopped the app process.
  - Result: `picopet` process `WorkingSetMB` was `38.1`.
  - WebView2 version captured from live `msedgewebview2` process: `149.0.4022.80`.
  - Cleanup result: `RemainingPicoPet=0`.

### Remaining Concern

- The measured app process working set, `38.1 MB`, is below the document's stated 50-100 MB idle target range. The actual value was recorded as measured.
