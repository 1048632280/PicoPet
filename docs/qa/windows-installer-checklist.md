# PicoPet Windows Installer QA Checklist

## Environment

- Windows 10 or Windows 11.
- Test account is a normal user account.
- Existing PicoPet processes are stopped before installation.
- Release installer exists at `src-tauri/target/release/bundle/nsis/PicoPet_0.1.0_x64-setup.exe`.

## Clean Install

- [ ] Run `PicoPet_0.1.0_x64-setup.exe`.
- [ ] Confirm the installer completes without an error dialog.
- [ ] Launch PicoPet from the installed shortcut or Start menu entry.
- [ ] Confirm no cmd/conhost window appears.
- [ ] Confirm the pet window appears and tray icon is available.
- [ ] Exit from tray menu.
- [ ] Relaunch from the installed shortcut or Start menu entry.
- [ ] Confirm the last position is restored.

## Overwrite Install

- [ ] Run the same installer again without uninstalling first.
- [ ] Confirm the installer completes without an error dialog.
- [ ] Launch PicoPet.
- [ ] Confirm config is preserved.
- [ ] Confirm tray exit still closes the app.

## Uninstall

- [ ] Uninstall PicoPet from Windows Apps or the NSIS uninstaller.
- [ ] Confirm installed application files are removed.
- [ ] Confirm no PicoPet process remains.
- [ ] Confirm user config remains under the app config directory for now.

## Result

- Tester:
- Windows version:
- Commit:
- Installer path:
- Result:
- Notes:
