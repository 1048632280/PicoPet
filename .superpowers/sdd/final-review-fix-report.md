# Final Review Fix Report

## Status

DONE_WITH_CONCERNS

## Root Cause Verification

1. Destroyed-window position persistence
   - Verified `src-tauri/src/lib.rs` matched `WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed`, then called `window.app_handle().get_webview_window("main")` before persisting.
   - Root cause: the destroyed event already supplies the window handle, but the implementation discarded it and performed a manager lookup after teardown may have started. If the lookup returns `None`, persistence is skipped silently.
   - Fix: added `should_persist_main_window_position(...)` for event gating and changed the hook to call `commands::persist_main_window_position_from_event_window(window)` using the event-provided `tauri::Window`.

2. Scale geometry clamps against primary monitor only
   - Verified `src-tauri/src/commands.rs` `apply_window_geometry` read only `primary_monitor()` and normalized with `with_strict_window_bounds(width, height, side, side)`.
   - Root cause: strict bounds use a single origin `(0, 0)` screen, so a valid saved position on a secondary monitor, including positive-x or left-side negative-x layouts, can be clamped back into the primary monitor during tray scale changes.
   - Fix: `apply_window_geometry` now gathers `available_monitors()`, orders them with `screens_with_primary_first(...)`, and derives visible geometry through `normalize_position_for_screens(...)`. Valid positions on any monitor are preserved; truly offscreen positions fall back to primary bottom-right through the shared helper.

## RED Test Evidence

- Command: `cargo test --manifest-path src-tauri\Cargo.toml commands::tests::scaled_geometry_preserves_position_on_secondary_monitor`
  - Expected failure: test referenced the intended pure helper boundary before implementation.
  - Actual RED: compile failed with `cannot find function derive_window_geometry_config in this scope`.

- Command: `cargo test --manifest-path src-tauri\Cargo.toml destroyed_main_window_event_requires_position_persistence`
  - Expected failure: test referenced the intended event-gating helper before implementation.
  - Actual RED: compile failed with `cannot find function should_persist_main_window_position in this scope`.

Note: a unit test cannot safely construct and tear down a real Tauri destroyed-window event with live runtime state. The closest meaningful coverage is the pure event gate plus compiler-verified production use of the event-provided `tauri::Window` handle.

## GREEN Verification

- Command: `cargo test --manifest-path src-tauri\Cargo.toml commands::tests::scaled_geometry_preserves_position_on_secondary_monitor`
  - Passed: 1 test, 0 failures.

- Command: `cargo test --manifest-path src-tauri\Cargo.toml destroyed_main_window_event_requires_position_persistence`
  - Passed: 1 test, 0 failures.

- Command: `cargo test --manifest-path src-tauri\Cargo.toml window_position`
  - Passed: 6 tests, 0 failures.

- Command: `cargo test --manifest-path src-tauri\Cargo.toml commands`
  - Passed: 2 tests, 0 failures.

- Command: `cargo test --manifest-path src-tauri\Cargo.toml`
  - Passed: 32 lib tests plus 1 integration test, 0 failures.

- Command: `pnpm check`
  - Passed: Vitest 7 files / 20 tests, TypeScript/Vite build, and Rust tests.

## Commit SHA

b44e22ac672f7c6635ba25abe55ece5ef1fe716e

## Files Changed

- `src-tauri/src/lib.rs`
- `src-tauri/src/commands.rs`
- `docs/release/windows-release-process.md`

## Concerns

- None for the code fix or verification.
- The report was written after the commit so it could include the final commit SHA; it is not part of the fix commit.
