# PicoPet Windows Beta QA Checklist

## Automated Gate

- [ ] Run `pnpm release:windows:gate`.
- [ ] Confirm release executable uses Windows GUI subsystem.
- [ ] Confirm release installer exists and is larger than 500 KB.
- [ ] Confirm release executable exists and is larger than 1 MB.

## Runtime Behavior

- [ ] Launch release executable directly.
- [ ] Confirm no cmd/conhost window appears.
- [ ] Move the pet to a custom position.
- [ ] Exit through tray menu.
- [ ] Relaunch and confirm the position is restored.
- [ ] Close the window through OS close handling if available and confirm position is restored.
- [ ] Test on primary monitor.
- [ ] Test on secondary monitor when available.
- [ ] Test with Windows display scaling at 100%.
- [ ] Test with Windows display scaling above 100% when available.

## Operational Features

- [ ] Toggle `开机自启动`.
- [ ] Confirm launch-on-login setting is reflected in the tray label after restart.
- [ ] Confirm `关于 PicoPet` shows version information in tray.
- [ ] Confirm `打开配置目录` opens the config directory.
- [ ] Confirm log file exists after startup and exit.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Result:
- Notes:
