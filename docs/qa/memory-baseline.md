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
