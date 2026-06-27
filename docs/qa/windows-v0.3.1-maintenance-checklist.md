# PicoPet Windows v0.3.1 Maintenance QA Checklist

## Automated Gate

- [ ] Run `pnpm check`.
- [ ] Run `pnpm artifact:windows`.
- [ ] Run `pnpm release:windows:gate` before release tagging.

## Environment

- [ ] Use Windows 10 or Windows 11.
- [ ] Stop existing PicoPet processes before starting QA.
- [ ] Test a green portable extraction under a user-writable directory.
- [ ] Confirm runtime data is under `PicoPet/data/`.

## Settings Maintenance

- [ ] Launch PicoPet.
- [ ] Open tray menu and click `设置`.
- [ ] Confirm `打开配置目录`, `打开日志文件`, `导出配置`, `导入配置`, `恢复默认设置`, and `生成诊断信息` are visible.
- [ ] Click `打开配置目录` and confirm Explorer opens `PicoPet/data/`.
- [ ] Click `打开日志文件` and confirm Explorer selects or opens `picopet.log`.
- [ ] Temporarily rename `picopet.log`, click `打开日志文件`, and confirm the settings window shows an error without exiting PicoPet.
- [ ] Restore `picopet.log`.

## Export and Import

- [ ] Change behavior preset or sleep wait time from the settings window.
- [ ] Click `导出配置`.
- [ ] Confirm `PicoPet/data/config.export.json` exists and contains the current config.
- [ ] Copy a valid config to `PicoPet/data/config.import.json`.
- [ ] Click `导入配置`.
- [ ] Confirm settings controls refresh to the imported values.
- [ ] Confirm `PicoPet/data/config.json` matches the sanitized imported values.
- [ ] Put invalid JSON in `PicoPet/data/config.import.json`.
- [ ] Click `导入配置`.
- [ ] Confirm the settings window shows an error.
- [ ] Confirm existing `PicoPet/data/config.json` was not replaced by the invalid JSON.

## Restore Defaults

- [ ] Click `恢复默认设置` once.
- [ ] Confirm no config reset happens yet and status says `再次点击确认恢复默认`.
- [ ] Click `恢复默认设置` again within 5 seconds.
- [ ] Confirm settings controls reset to defaults.
- [ ] Confirm `PicoPet/data/config.json` is rewritten with default values.
- [ ] Confirm `PicoPet/data/EBWebView/` still exists.
- [ ] Confirm `PicoPet/data/picopet.log` still exists.
- [ ] Confirm import/export files are not deleted.

## Diagnostics

- [ ] Click `生成诊断信息`.
- [ ] Confirm diagnostics text shows version, config directory, config file, and log file.
- [ ] Confirm diagnostics text can be selected and copied manually.
- [ ] Confirm no new system clipboard permission prompt appears.

## Regression

- [ ] Confirm no cmd/conhost window appears when launching installed app normally.
- [ ] Move the pet to a custom position, exit from tray, relaunch, and confirm position is restored.
- [ ] Confirm click-through, pause animation, scale, and launch-on-login controls still work.
- [ ] Confirm `roaming`, coordinate editing, FPS editing, JSON editing, update checker, and plugin features are not exposed.

## Result

- Tester:
- Windows version:
- Display scaling:
- Monitor setup:
- Commit:
- Result:
- Notes:
