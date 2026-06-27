# PicoPet Windows v0.3 Settings QA Checklist

## Automated Gate

- [ ] Run `pnpm release:windows:gate`.
- [ ] Confirm `dist/settings.html` exists after `pnpm build`.
- [ ] Confirm release executable uses Windows GUI subsystem.
- [ ] Confirm release installer exists and is larger than 500 KB.
- [ ] Confirm release executable exists and is larger than 1 MB.
- [ ] Confirm portable zip exists and is larger than 1 MB.
- [ ] Confirm portable zip contains `PicoPet/picopet.exe`.
- [ ] Confirm portable zip contains `PicoPet/data/`.

## Settings Window Lifecycle

- [ ] Launch PicoPet.
- [ ] Open tray menu and click `设置`.
- [ ] Confirm a titled `PicoPet 设置` window opens.
- [ ] Click `设置` again while the window is open and confirm the existing window is focused instead of creating a duplicate.
- [ ] Close the settings window.
- [ ] Click `设置` again and confirm the window opens with the latest saved config.

## Behavior Settings

- [ ] Set behavior preset to `安静` and confirm `PicoPet/data/config.json` stores `"preset": "quiet"`.
- [ ] Set behavior preset to `标准` and confirm `"preset": "normal"`.
- [ ] Set behavior preset to `活跃` and confirm `"preset": "lively"`.
- [ ] Set walk mode to `原地` and confirm `"walk_mode": "stationary"`.
- [ ] Set walk mode to `小范围` and confirm `"walk_mode": "short_range"`.
- [ ] Set sleep wait time below `60`, leave the field, and confirm the UI and config show `60`.
- [ ] Set sleep wait time above `86400`, leave the field, and confirm the UI and config show `86400`.

## Window Settings

- [ ] Toggle click-through on and confirm the pet stops receiving direct clicks.
- [ ] Toggle click-through off and confirm the pet receives direct clicks again.
- [ ] Toggle pause animation on and confirm animation/autonomous behavior pauses.
- [ ] Toggle pause animation off and confirm animation resumes.
- [ ] Change scale through every listed value from `50%` to `200%` and confirm the pet window resizes.
- [ ] Click `重置位置` and confirm the pet moves to the current screen bottom-right area.

## Startup and Maintenance

- [ ] Toggle launch on login on and confirm `startup.launch_on_login` becomes `true`.
- [ ] Toggle launch on login off and confirm `startup.launch_on_login` becomes `false`.
- [ ] Click `打开配置目录` and confirm Explorer opens `PicoPet/data/`.
- [ ] Confirm the settings UI does not expose JSON editing, import/export, restore defaults, logs center, diagnostics center, update checker, coordinates, FPS, `always_on_top`, or `roaming`.

## Regression

- [ ] Confirm no cmd/conhost window appears when launching installed app normally.
- [ ] Move the pet to a custom position, exit from tray, relaunch, and confirm position is restored.
- [ ] Confirm drag still saves and restores the final position.
- [ ] Confirm `PicoPet/data/config.json` remains under the app directory.
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
