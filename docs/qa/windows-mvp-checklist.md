# PicoPet Windows MVP QA Checklist

## Environment

- Windows 10 or Windows 11
- WebView2 Runtime installed or installer can bootstrap it
- Built with `pnpm tauri build --debug`

## Manual Checks

- [ ] Launch app from `pnpm tauri dev`.
- [ ] Confirm the pet window is transparent and borderless.
- [ ] Confirm the pet window stays above a normal Notepad window.
- [ ] Drag the pet to a new position.
- [ ] Exit from tray menu.
- [ ] Launch again and confirm the previous position is restored.
- [ ] Use tray menu `暂停动画`; confirm animation stops.
- [ ] Use tray menu again; confirm animation resumes.
- [ ] Use tray menu `开启点击穿透`; confirm clicks pass through to a window underneath.
- [ ] Disable click-through from tray and confirm dragging works again.
- [ ] Use tray menu `重置位置`; confirm pet returns near the primary screen bottom-right.
- [ ] Use tray menu `退出`; confirm no PicoPet process remains in Task Manager.
