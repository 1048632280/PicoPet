# PicoPet Memory Baseline

## Target

Resident memory target: 50-100 MB while idle on Windows.

## Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
Get-Process PicoPet,picopet -ErrorAction SilentlyContinue |
  Select-Object ProcessName,Id,@{Name="WorkingSetMB";Expression={[math]::Round($_.WorkingSet64 / 1MB, 1)}}
```

## Expected Result

- `WorkingSetMB` is between 50 and 100 MB during idle animation.
- CPU usage remains near 0% when the pet is idle.
- When animation is paused, memory does not grow across five minutes.

## Record Template

| Date | Build | Windows Version | WebView2 Version | WorkingSetMB | Notes |
| --- | --- | --- | --- | ---: | --- |
| 2026-06-22 | Debug executable `src-tauri/target/debug/picopet.exe` | Windows 10 Home China 10.0.19045 | 149.0.4022.80 | 38.1 | Measured after 65 seconds idle with the documented `Get-Process PicoPet,picopet` command; app process cleaned up afterward. |
