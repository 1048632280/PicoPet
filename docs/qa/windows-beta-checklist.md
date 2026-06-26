# PicoPet Windows Beta QA Checklist

## Automated Gate

- [ ] Run `pnpm release:windows:gate`.
- [ ] Confirm release executable uses Windows GUI subsystem.
- [ ] Confirm release installer exists and is larger than 500 KB.
- [ ] Confirm release executable exists and is larger than 1 MB.
- [ ] Confirm portable zip exists and is larger than 1 MB.
- [ ] Confirm portable zip contains `PicoPet/picopet.exe`.
- [ ] Confirm portable zip contains `PicoPet/data/`.

## Runtime Behavior

- [ ] Launch release executable directly.
- [ ] Confirm no cmd/conhost window appears.
- [ ] Move the pet to a custom position.
- [ ] Exit through tray menu.
- [ ] Relaunch and confirm the position is restored.
- [ ] Close the window through OS close handling if available and confirm position is restored.
- [ ] Confirm `data/config.json` appears beside `picopet.exe` after first launch.
- [ ] Confirm `data/config.json` contains a `behavior` section after first launch.
- [ ] Confirm a short click triggers a visible happy/bounce response.
- [ ] Confirm a drag still saves and restores the final position after relaunch.
- [ ] Confirm the pet occasionally performs only a small short-range walk near its saved position.
- [ ] Set `behavior.enabled` to `false`, relaunch, and confirm autonomous walk/sleep behavior stops.
- [ ] Set `behavior.sleep_after_idle_seconds` to `60`, relaunch, and confirm sleep can trigger after idle time.
- [ ] Confirm `data/picopet.log` appears after startup.
- [ ] Confirm `data/EBWebView/` appears after WebView startup.
- [ ] Confirm no new `%APPDATA%/com.picopet.*` or `%LOCALAPPDATA%/com.picopet.*` directory is created.
- [ ] Test on primary monitor.
- [ ] Test on secondary monitor when available.
- [ ] Test with Windows display scaling at 100%.
- [ ] Test with Windows display scaling above 100% when available.

## Operational Features

- [ ] Toggle `开机自启动`.
- [ ] Confirm launch-on-login setting is reflected in the tray label after restart.
- [ ] Confirm `关于 PicoPet` shows version information in tray.
- [ ] Confirm `打开配置目录` opens `PicoPet/data/`.
- [ ] Confirm log file exists after startup and exit.

## Portable Zip

- [ ] Extract `PicoPet_0.2.0_x64-portable.zip` into a clean user-writable directory.
- [ ] Launch `PicoPet/picopet.exe`.
- [ ] Confirm `PicoPet/data/config.json` is created.
- [ ] Confirm `PicoPet/data/picopet.log` is created.
- [ ] Confirm `PicoPet/data/EBWebView/` is created.
- [ ] Move the pet, exit from tray, relaunch, and confirm the position is restored.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Result:
- Notes:
