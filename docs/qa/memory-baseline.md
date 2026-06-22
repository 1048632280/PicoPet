# PicoPet Memory Baseline

## Target

Resident memory target: 50-100 MB total working set while idle on Windows. Measure the PicoPet host process plus its WebView2 child process tree; the host-only value is useful diagnostic context but is not the target measurement.

## Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
$roots = @(Get-Process PicoPet,picopet -ErrorAction SilentlyContinue)
$processes = @(Get-CimInstance Win32_Process)
$ids = New-Object 'System.Collections.Generic.HashSet[int]'
$queue = New-Object 'System.Collections.Generic.Queue[int]'
foreach ($root in $roots) {
  [void]$ids.Add([int]$root.Id)
  $queue.Enqueue([int]$root.Id)
}
while ($queue.Count -gt 0) {
  $parent = $queue.Dequeue()
  foreach ($child in @($processes | Where-Object { $_.ParentProcessId -eq $parent })) {
    if ($ids.Add([int]$child.ProcessId)) {
      $queue.Enqueue([int]$child.ProcessId)
    }
  }
}
$processTree = @(Get-Process -Id ([int[]]$ids) -ErrorAction SilentlyContinue)
$hostProcesses = @($processTree | Where-Object { $_.ProcessName -in @("PicoPet", "picopet") })
$webviewProcesses = @($processTree | Where-Object { $_.ProcessName -eq "msedgewebview2" })
$measured = @($hostProcesses + $webviewProcesses)
[pscustomobject]@{
  HostWorkingSetMB = [math]::Round(($hostProcesses | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)
  WebView2ChildrenMB = [math]::Round(($webviewProcesses | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)
  TotalWorkingSetMB = [math]::Round(($measured | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)
  ProcessCount = $measured.Count
}
```

## Expected Result

- `TotalWorkingSetMB` is between 50 and 100 MB during idle animation.
- CPU usage remains near 0% when the pet is idle.
- When animation is paused, memory does not grow across five minutes.

## Record Template

| Date | Build | Windows Version | WebView2 Version | HostWorkingSetMB | WebView2ChildrenMB | TotalWorkingSetMB | ProcessCount | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 2026-06-22 | Debug executable `src-tauri/target/debug/picopet.exe` | Microsoft Windows 10 家庭中文版 10.0.19045 | 149.0.4022.80 | 37.9 | 318.8 | 356.8 | 7 | Measured after 65 seconds idle with the host + WebView2 child process command; excluded one `conhost` child from the target sum; total exceeds the 50-100 MB target; app process tree cleaned up afterward. |
