# Task 6 Report: Integrate Behavior Into App Runtime

## Status

DONE

## Commit

- `ea00788 feat: wire behavior state machine into app`

## What Changed

- Added app integration coverage in `src/app.test.ts` for native drag classification:
  - unchanged native drag position is treated as a short press and does not save position.
  - native drag movement past the 6px threshold saves the new window position.
  - disabled behavior config still allows native dragging without behavior-side interaction effects.
- Replaced the app test Tauri window mock with shared hoisted `windowApiMocks` so tests can assert `startDragging`, `outerPosition`, and `setPosition`.
- Wired `src/app.ts` to create and update the behavior controller at runtime.
- Replaced `persistPositionAfterDrag` usage with `readPositionAfterNativeDrag`, explicit movement threshold handling, and `saveWindowPosition` only for real drag movement.
- Added behavior render effects into `PetRenderer.renderFrame(frameIndex, effect)`.
- Added short-range autonomous walk movement via `shortRangeWalkPosition` and `moveWindowTo`.
- Synced behavior config, pause state, hidden state, and anchor position from runtime config and visibility events.

## TDD RED/GREEN Evidence

### RED

Command:

```powershell
pnpm test -- --run src/app.test.ts
```

Output summary:

```text
Test Files  1 failed (1)
Tests       1 failed | 7 passed (8)
FAIL src/app.test.ts > boot > saves position when native drag changes the outer position past the drag threshold
AssertionError: expected "spy" to be called with arguments: [ 1230, 680 ]
Number of calls: 0
```

This failed before production wiring because `app.ts` had not yet been integrated with the new native-drag threshold path used by the shared app window mock.

### GREEN

Command:

```powershell
pnpm test -- --run src/app.test.ts
```

Output summary:

```text
Test Files  1 passed (1)
Tests       8 passed (8)
```

Note: after the first GREEN attempt, the focused test still failed because the test needed one additional microtask flush for `startDragging()` -> `outerPosition()` -> app handler continuation. I added `flushNativeDragFlow()` as a test-only helper and reran the focused test successfully.

## Verification

Command:

```powershell
pnpm test -- --run src/app.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       8 passed (8)
```

Command:

```powershell
pnpm test -- --run
```

Result:

```text
Test Files  11 passed (11)
Tests       45 passed (45)
```

Command:

```powershell
pnpm build
```

Result:

```text
tsc --noEmit && vite build
23 modules transformed.
built in 992ms
```

## Files Changed

- `src/app.ts`
- `src/app.test.ts`

## Self-Review

- Confirmed autonomous walking calls `moveWindowTo` only from the behavior walk state and does not call `saveWindowPosition`.
- Confirmed real native drag movement past `dragThresholdPx = 6` calls `saveWindowPosition(finalPosition.x, finalPosition.y)` and updates the anchor from the returned config.
- Confirmed unchanged native drag position enters the short-press path and does not persist the window position.
- Confirmed tray config updates refresh behavior config, paused state, and anchor position.
- Confirmed visibility changes update behavior hidden state before syncing the animation loop.
- Confirmed only the two owned source files were committed.

## Concerns

- `git commit` reported line-ending warnings that LF will be replaced by CRLF when Git next touches `src/app.ts` and `src/app.test.ts`. No functional issue observed.
- The requesting-code-review skill expects a subagent reviewer, but this environment did not expose a subagent dispatch tool in this session. I performed the self-review above instead.

## Review Fix: Native Drag Threshold Uses Drag Start Position

### Summary

- Added regression coverage for an unchanged native drag while the actual window position is offset from the saved anchor by autonomous walking.
- Updated drag classification in `src/app.ts` to compare the final native-drag position with the actual pre-drag window position instead of `anchorPosition`.
- Preserved real drag persistence: movement beyond `dragThresholdPx` still calls `saveWindowPosition(...)` and refreshes `anchorPosition` from the saved config.

### RED

Command:

```powershell
pnpm test -- --run src/app.test.ts
```

Output summary:

```text
Test Files  1 failed (1)
Tests       1 failed | 8 passed (9)
FAIL src/app.test.ts > boot > treats an unchanged native drag at a walked offset as a short press without saving position
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
Received first spy call: [1240, 680]
```

This reproduced the reviewer finding: an unchanged native drag at `{ x: 1240, y: 680 }` was compared to the saved anchor `{ x: 1200, y: 680 }` and incorrectly persisted as a drag.

### GREEN

Command:

```powershell
pnpm test -- --run src/app.test.ts
```

Output summary:

```text
Test Files  1 passed (1)
Tests       9 passed (9)
```

### Verification

Command:

```powershell
pnpm test -- --run
```

Result:

```text
Test Files  11 passed (11)
Tests       46 passed (46)
```

Command:

```powershell
pnpm build
```

Result:

```text
tsc --noEmit && vite build
23 modules transformed.
built in 2.17s
```

### Files Changed

- `src/app.ts`
- `src/app.test.ts`
- `.superpowers/sdd/task-6-report.md`
