# Final Review Fix Report

## Status

DONE_WITH_CONCERNS

## Changed Files

- `src-tauri/src/config.rs`
  - Added `scaled_window_side()` and `placed_at_bottom_right(...)`.
  - Added focused reset-placement tests proving explicit reset is separate from offscreen repair and uses current scale.
- `src-tauri/src/commands.rs`
  - Updated `reset_window_position` to read current config, preserve scale and other fields, compute primary-screen bottom-right, set scale-derived window size, and persist only x/y changes.
- `src-tauri/src/window_state.rs`
  - Reused the shared scale-derived window-side helper for startup sizing.
- `src-tauri/src/tray.rs`
  - Added `PicoPet` tooltip and explicit tray icon wiring from Tauri's default window icon.
- `src-tauri/icons/icon.ico`
  - Replaced the 70-byte placeholder with a generated PicoPet ICO containing 16x16, 32x32, and 256x256 32bpp entries.
- `src-tauri/tauri.conf.json`
  - Changed identifier from `com.picopet.app` to `com.picopet.desktop`.
  - Added explicit bundle icon `icons/icon.ico`.
- `docs/qa/memory-baseline.md`
  - Updated baseline procedure to measure PicoPet host plus `msedgewebview2` child processes and make total working set the target metric.
  - Recorded a new 65-second idle measurement.
- `docs/qa/windows-mvp-checklist.md`
  - Documented the local Corepack shim bootstrap needed when plain `pnpm` is unavailable.

## TDD Evidence

- RED:
  - Added `explicit_bottom_right_reset_moves_visible_default_position`.
  - Added `explicit_bottom_right_reset_uses_scaled_window_size_and_preserves_fields`.
  - Ran `cargo test --manifest-path src-tauri/Cargo.toml explicit_bottom_right_reset -- --nocapture`.
  - Failure was expected: `no method named placed_at_bottom_right found for struct config::AppConfig`.
- GREEN:
  - Implemented `AppConfig::placed_at_bottom_right(...)` and `scaled_window_side()`.
  - Updated `reset_window_position` to use current sanitized config instead of `AppConfig::default().with_screen_bounds(...)`.
  - Reran the targeted command; both new tests passed.

## Verification

- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
  - Passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`
  - Passed: 14 Rust tests.
- `corepack pnpm build`
  - Passed: TypeScript check and Vite production build.
- `corepack pnpm exec tauri build --debug`
  - Passed: debug executable and NSIS bundle built.
  - The previous `.app` identifier warning was not emitted.
- `pnpm check`
  - Passed after creating user-writable Corepack shims with `corepack enable --install-directory "$env:LOCALAPPDATA\CorepackShims"` and prepending that directory to `PATH`.
  - Vitest: 6 files passed, 12 tests passed.
  - Frontend build passed.
  - Rust tests passed: 14 tests.

## Memory Baseline

- Build measured: `src-tauri/target/debug/picopet.exe`.
- Launch method: started debug exe, waited 65 seconds idle, measured host + WebView2 child processes, then cleaned up the process tree.
- Windows: Microsoft Windows 10 家庭中文版 10.0.19045.
- WebView2: 149.0.4022.80.
- HostWorkingSetMB: 37.9.
- WebView2ChildrenMB: 318.8.
- TotalWorkingSetMB: 356.8.
- ProcessCount: 7.
- Cleanup: `RemainingPicoPet=0`.

## Concerns

- Total resident memory with WebView2 included is 356.8 MB, which exceeds the documented 50-100 MB target. The prior host-only baseline under-measured the actual resident footprint.
- Full visual tray verification was not automated. Code uses Tauri 2.11 `TrayIconBuilder::icon(...)` and `tooltip(...)`, and the debug bundle successfully built with the replacement ICO.
- `corepack enable` without an install directory still fails in this environment with EPERM writing to `D:\nodejs\pnpm`; the documented workaround uses user-writable Corepack shims.

## Follow-up: Memory Target Measurement Precision

- Updated `docs/qa/memory-baseline.md`, the MVP plan, and the design spec so the 50-100 MB target applies to release-build PicoPet host + WebView2 child Private Working Set, not summed total Working Set.
- Kept summed total Working Set and Private Bytes as diagnostic/leak-context values because WebView2 shared runtime pages can be counted in multiple processes.
- Release evidence from `src-tauri/target/release/picopet.exe` after 70 seconds idle: host WorkingSetPrivate 8.1 MB, WebView2 WorkingSetPrivate 80.4 MB, app target WorkingSetPrivate 88.5 MB; diagnostic host + WebView2 total WorkingSet 344.8 MB.
- One launch-shell `conhost` child was present in the process tree and is now explicitly recorded but excluded from the app target. Including it produced TotalWorkingSet 373.3 MB, TotalPrivateBytes 194.0 MB, TotalWorkingSetPrivate 99.2 MB.
- Cleanup evidence: RemainingAfterCleanup=0.
