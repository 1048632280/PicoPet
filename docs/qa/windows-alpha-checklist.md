# PicoPet Windows Alpha QA Checklist

## Environment

- Windows 10 or Windows 11.
- WebView2 Runtime installed or installer can bootstrap it.
- Built from branch `codex/windows-alpha-hardening`.
- `pnpm check:windows` completed before manual QA.

## Manual Checks

- [ ] Launch app with `pnpm tauri dev`.
- [ ] Confirm the pet window is transparent and borderless.
- [ ] Confirm the pet stays above Notepad.
- [ ] Drag the pet to a new position.
- [ ] Exit from tray menu.
- [ ] Launch again and confirm the previous position is restored.
- [ ] Use tray menu `暂停动画`; confirm animation stops.
- [ ] Confirm paused state does not cause visible CPU activity in Task Manager.
- [ ] Use tray menu `继续动画`; confirm animation resumes.
- [ ] Use tray menu `放大`; confirm pet size increases and remains visible.
- [ ] Use tray menu `缩小`; confirm pet size decreases and remains draggable.
- [ ] Use tray menu `重置大小`; confirm size returns to default.
- [ ] Use tray menu `开启点击穿透`; confirm clicks pass through to a window underneath.
- [ ] Disable click-through from tray and confirm dragging works again.
- [ ] Use tray menu `重置位置`; confirm pet returns near primary screen bottom-right.
- [ ] Use tray menu `退出`; confirm no PicoPet process remains in Task Manager.
- [ ] Launch release executable, wait 60 seconds, and run `pnpm memory:windows`.
- [ ] Record `AppTargetWorkingSetPrivateMB` in `docs/qa/memory-baseline.md`.
