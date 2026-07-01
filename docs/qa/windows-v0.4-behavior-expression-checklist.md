# PicoPet Windows v0.4 Behavior Expression QA Checklist

## Automated Gate

- [ ] Run `pnpm check`.
- [ ] Run `pnpm release:windows:gate`.
- [ ] Run `pnpm artifact:windows`.
- [ ] Run `pnpm memory:windows` or record Private Working Set manually from Task Manager.

## Environment

- [ ] Use Windows 10 or Windows 11.
- [ ] Stop existing PicoPet processes before starting QA.
- [ ] Test a green portable extraction under a user-writable directory.
- [ ] Confirm runtime data is under `PicoPet/data/`.

## Default Quiet Behavior

- [ ] Start PicoPet with a clean `PicoPet/data/config.json`.
- [ ] Confirm behavior preset defaults to `quiet`.
- [ ] Watch idle for 2 minutes and confirm motion is subtle and not distracting.
- [ ] Confirm idle motion does not move the real window.
- [ ] Confirm CPU and memory do not visibly spike compared with v0.3.1 baseline.

## Preset Differences

- [ ] Open settings and switch behavior preset to `normal`.
- [ ] Confirm idle, happy, sleep, dragged, and walk effects are more visible than `quiet`.
- [ ] Switch behavior preset to `lively`.
- [ ] Confirm effects are clearly stronger than `normal`.
- [ ] Confirm `lively` still remains bounded and does not flicker or shake aggressively.

## Walk Modes

- [ ] Set movement mode to `stationary`.
- [ ] Wait until autonomous walk triggers.
- [ ] Confirm the pet shows in-place walk expression.
- [ ] Confirm the real window position does not change.
- [ ] Set movement mode to `short_range`.
- [ ] Wait until autonomous walk triggers.
- [ ] Confirm the real window moves a short distance.
- [ ] Confirm the real window returns to the saved anchor after walk completes.
- [ ] Confirm repeated short-range walks do not drift away from the anchor.

## Sleep

- [ ] Set sleep wait time to a short valid value such as `60` seconds.
- [ ] Wait for sleep to start.
- [ ] Confirm the first 2-3 seconds look like a transition into sleep.
- [ ] Confirm stable sleep has slower cadence and lower alpha.
- [ ] Click the sleeping pet once.
- [ ] Confirm it wakes to idle without playing happy feedback.

## Happy and Dragged

- [ ] Click the pet while awake.
- [ ] Confirm happy feedback is visible and returns to idle.
- [ ] Drag the pet more than 6 px.
- [ ] Confirm dragged compression/downshift appears during native drag.
- [ ] Release the drag.
- [ ] Confirm a short rebound appears after release.
- [ ] Relaunch PicoPet and confirm it restores the release position.

## Regression

- [ ] Confirm no cmd/conhost window appears when launching installed app normally.
- [ ] Confirm tray menu can pause and resume animation.
- [ ] Confirm click-through prevents pointer interaction with the pet.
- [ ] Confirm scale changes still resize the canvas correctly.
- [ ] Confirm settings window opens and saves behavior settings.
- [ ] Confirm `roaming`, coordinate editing, FPS editing, JSON editing, update checker, plugin features, and skin import are not exposed.
- [ ] Confirm existing `PicoPet/data/config.json`, `picopet.log`, and `EBWebView/` remain under `PicoPet/data/`.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Private Working Set:
- Result:
- Notes:
