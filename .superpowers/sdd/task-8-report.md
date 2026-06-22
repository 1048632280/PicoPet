# Task 8 Report: Add System Tray Menu and Runtime Events

## Status

DONE_WITH_CONCERNS

## What Changed

- Added `src-tauri/src/tray.rs` with a Tauri system tray menu:
  - `暂停动画` / `继续动画`
  - `开启点击穿透` / `关闭点击穿透`
  - `重置位置`
  - `退出`
- Registered tray setup during Tauri app initialization after `AppState` is managed.
- Tray menu handlers reuse existing command bridge behavior:
  - `set_animation_paused`
  - `set_click_through`
  - `reset_window_position`
- Tray-driven config changes emit `picopet://config` to the frontend.
- Frontend now listens for `picopet://config` and forwards payloads through the existing `picopet:config` runtime update path.
- Enabled Tauri's `tray-icon` feature, required by the installed Tauri 2 dependency for tray APIs.
- Updated Tauri dev/build hooks to use `corepack pnpm`, because `pnpm tauri dev` failed in this environment when Tauri invoked plain `pnpm`.
- Excluded `src-tauri/target` from Vite file watching after `tauri dev` failed with an `EBUSY` watch error on a locked Cargo build executable.

## TDD Evidence

- Frontend RED:
  - Added `app.test.ts` coverage for applying a tray `picopet://config` event to runtime interactions.
  - First run failed as expected: listener for `picopet://config` was `undefined`.
- Rust RED:
  - Added tray label tests before implementing label helpers.
  - First `cargo test` failed as expected with missing `pause_label` and `click_through_label`.
- GREEN:
  - Implemented frontend listener bridge and tray label helpers/service.
  - Targeted frontend and Rust tests passed afterward.

## Verification

- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
  - Passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`
  - Passed: 9 tests.
- `corepack pnpm exec vitest run`
  - Passed: 6 test files, 12 tests.
- `corepack pnpm build`
  - Passed: TypeScript check and Vite build completed.
- `corepack pnpm tauri dev`
  - Initial failure: Tauri `beforeDevCommand` used plain `pnpm`, unavailable in this environment.
  - Second failure: Vite watched `src-tauri/target` and hit `EBUSY` on a locked build executable.
  - After fixes, command stayed running until the 60 second tool timeout, and the spawned `picopet.exe` process was observed. The process and related dev processes were cleaned up.

## Files Changed

- `src-tauri/src/tray.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src/app.ts`
- `src/app.test.ts`
- `vite.config.ts`

`src/tauri/commands.ts` was reviewed and did not require changes because the existing command wrappers already matched the tray integration needs.

## Self-Review

- Checked tray menu labels against the task brief's exact Chinese strings.
- Checked tray handlers reuse existing persistence/config commands instead of duplicating config writes.
- Checked frontend event flow updates the same runtime config state used by drag and animation pause behavior.
- Checked extra environment fixes are limited to failures encountered during the required smoke command.
- Removed unnecessary Cargo.toml churn before final verification.

## Concerns

- Full manual tray interaction could not be completed through the terminal-only tool session. The final `tauri dev` attempt progressed to a running native process and did not fail before timeout, but I could not visually inspect the Windows tray menu or click `退出` from the system tray.

## Task 8 Fix

### Finding Fixed

- Moved `EXIT_ID` handling before the main-window lookup in `src-tauri/src/tray.rs`, so the tray `退出` command exits even if `get_webview_window("main")` returns `None`.
- Added a focused Rust regression test, `exit_menu_event_does_not_require_main_window`, that locks the dispatch rule: `EXIT_ID` does not require the main window, while pause, click-through, and reset still do.

### TDD Evidence

- RED:
  - `cargo test --manifest-path src-tauri/Cargo.toml tray::tests::exit_menu_event_does_not_require_main_window`
  - Failed as expected with missing `menu_event_requires_main_window`.
- GREEN:
  - Implemented `menu_event_requires_main_window` and routed the tray handler through it.
  - `EXIT_ID` now calls `app_handle.exit(0)` before attempting to fetch the main webview window.

### Verification

- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
  - Passed.
- `cargo test --manifest-path src-tauri/Cargo.toml tray::tests`
  - Passed: 3 tray tests, 7 filtered out.
