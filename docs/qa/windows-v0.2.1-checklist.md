# PicoPet Windows v0.2.1 QA Checklist

## Automated Gate

- [ ] Run `pnpm release:windows:gate`.
- [ ] Confirm release executable uses Windows GUI subsystem.
- [ ] Confirm release installer exists and is larger than 500 KB.
- [ ] Confirm release executable exists and is larger than 1 MB.
- [ ] Confirm portable zip exists and is larger than 1 MB.
- [ ] Confirm portable zip contains `PicoPet/picopet.exe`.
- [ ] Confirm portable zip contains `PicoPet/data/`.

## Behavior Config

- [ ] Launch release executable and confirm `PicoPet/data/config.json` contains `behavior`.
- [ ] Set `behavior.preset` to `quiet`, relaunch, and confirm behavior remains low-distraction.
- [ ] Set `behavior.preset` to `normal`, relaunch, and confirm click feedback and walk cadence are more noticeable than quiet.
- [ ] Set `behavior.preset` to `lively`, relaunch, and confirm click feedback and walk cadence are more active than normal without continuous movement.
- [ ] Set `behavior.walk_mode` to `stationary`, relaunch, and confirm autonomous walk does not occur during observation.
- [ ] Set `behavior.walk_mode` to `short_range`, relaunch, and confirm autonomous walk stays near the saved anchor and returns to it.
- [ ] Set `behavior.walk_mode` to `roaming`, relaunch, and confirm config is repaired to `short_range`.
- [ ] Set an unknown `behavior.preset`, relaunch, and confirm config is repaired to `quiet`.
- [ ] Set `behavior.sleep_after_idle_seconds` to `60`, relaunch, and confirm sleep can trigger after idle time.

## Regression

- [ ] Confirm no cmd/conhost window appears when launching installed app normally.
- [ ] Move the pet to a custom position, exit from tray, relaunch, and confirm position is restored.
- [ ] Confirm drag still saves and restores the final position.
- [ ] Confirm click-through still blocks pointer interaction when enabled.
- [ ] Confirm `打开配置目录` opens `PicoPet/data/`.
- [ ] Confirm `data/picopet.log` appears after startup.
- [ ] Confirm `data/EBWebView/` appears after WebView startup.
- [ ] Confirm no new `%APPDATA%/com.picopet.*` or `%LOCALAPPDATA%/com.picopet.*` directory is created.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Result:
- Notes:
