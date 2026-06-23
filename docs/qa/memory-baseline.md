# PicoPet Memory Baseline

## Target

Resident memory target: 50-100 MB release-build host + WebView2 child **Private Working Set** while idle on Windows. This is resident private memory owned by PicoPet and its WebView2 runtime children, measured after the process tree is stable.

Summed total Working Set and Private Bytes must still be recorded as diagnostic and leak-context values. Total Working Set is not the merge gate because WebView2 shared runtime pages can be counted in multiple processes. If the app is launched from a shell and a `conhost` child appears in the process tree, record it in the raw tree but exclude it from the app target.

## Scripted Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
pnpm memory:windows -- -OutputJson docs/qa/memory-baseline.latest.json
```

The script excludes `LaunchShell` rows from `AppTargetWorkingSetPrivateMB` and keeps total Working Set as diagnostic context.

## Manual Fallback Command

Run PicoPet, wait 60 seconds, then execute:

```powershell
$roots = @(Get-Process PicoPet,picopet -ErrorAction SilentlyContinue)
$processes = @(Get-CimInstance Win32_Process)
$perfById = @{}
try {
  foreach ($perf in @(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop)) {
    if ($perf.IDProcess -gt 0 -and -not $perfById.ContainsKey([int]$perf.IDProcess)) {
      $perfById[[int]$perf.IDProcess] = $perf
    }
  }
} catch {
  Write-Warning "WorkingSetPrivate is unavailable from Win32_PerfFormattedData_PerfProc_Process"
}

function Convert-ToMB($bytes) {
  if ($null -eq $bytes) { return $null }
  [math]::Round([double]$bytes / 1MB, 1)
}

function Sum-MB($rows, $propertyName) {
  $values = @($rows | Where-Object { $null -ne $_.$propertyName } | ForEach-Object { [double]$_.$propertyName })
  if ($values.Count -eq 0) { return $null }
  [math]::Round(($values | Measure-Object -Sum).Sum, 1)
}

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
$treeRows = @(
  foreach ($process in $processTree | Sort-Object Id) {
    $perf = $perfById[[int]$process.Id]
    $role = switch ($process.ProcessName) {
      { $_ -in @("PicoPet", "picopet") } { "Host"; break }
      "msedgewebview2" { "WebView2"; break }
      "conhost" { "LaunchShell"; break }
      default { "Other" }
    }
    [pscustomobject]@{
      Role = $role
      ProcessName = $process.ProcessName
      Id = $process.Id
      ParentProcessId = ($processes | Where-Object { $_.ProcessId -eq $process.Id } | Select-Object -First 1).ParentProcessId
      WorkingSetMB = Convert-ToMB $process.WorkingSet64
      PrivateBytesMB = Convert-ToMB $process.PrivateMemorySize64
      WorkingSetPrivateMB = if ($perf) { Convert-ToMB $perf.WorkingSetPrivate } else { $null }
    }
  }
)
$targetRows = @($treeRows | Where-Object { $_.Role -in @("Host", "WebView2") })
$hostRows = @($treeRows | Where-Object { $_.Role -eq "Host" })
$webviewRows = @($treeRows | Where-Object { $_.Role -eq "WebView2" })

$treeRows | Format-Table -AutoSize

[pscustomobject]@{
  HostWorkingSetMB = Sum-MB $hostRows "WorkingSetMB"
  HostPrivateBytesMB = Sum-MB $hostRows "PrivateBytesMB"
  HostWorkingSetPrivateMB = Sum-MB $hostRows "WorkingSetPrivateMB"
  WebView2WorkingSetMB = Sum-MB $webviewRows "WorkingSetMB"
  WebView2PrivateBytesMB = Sum-MB $webviewRows "PrivateBytesMB"
  WebView2WorkingSetPrivateMB = Sum-MB $webviewRows "WorkingSetPrivateMB"
  AppTargetWorkingSetPrivateMB = Sum-MB $targetRows "WorkingSetPrivateMB"
  DiagnosticTotalWorkingSetMB = Sum-MB $targetRows "WorkingSetMB"
  DiagnosticTotalPrivateBytesMB = Sum-MB $targetRows "PrivateBytesMB"
  ProcessCount = $targetRows.Count
  ExcludedLaunchShellCount = @($treeRows | Where-Object { $_.Role -eq "LaunchShell" }).Count
}
```

## Expected Result

- Release-build `AppTargetWorkingSetPrivateMB` is between 50 and 100 MB during idle animation.
- `DiagnosticTotalWorkingSetMB` and `DiagnosticTotalPrivateBytesMB` are recorded but are not target pass/fail values.
- CPU usage remains near 0% when the pet is idle.
- When animation is paused, memory does not grow across five minutes.

## Record Template

| Date | Build | Windows Version | WebView2 Version | HostWorkingSetMB | HostPrivateBytesMB | HostWorkingSetPrivateMB | WebView2WorkingSetMB | WebView2PrivateBytesMB | WebView2WorkingSetPrivateMB | AppTargetWorkingSetPrivateMB | DiagnosticTotalWorkingSetMB | DiagnosticTotalPrivateBytesMB | ProcessCount | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-06-23 | Release executable `src-tauri/target/release/picopet.exe` | Microsoft Windows 10 家庭中文版 10.0.19045 | 149.0.4022.80 | 33.2 | 12.0 | 8.1 | 311.6 | 167.9 | 80.4 | 88.5 | 344.8 | 179.9 | 7 | Measured after 70 seconds idle. Host + WebView2 Private Working Set is within the 50-100 MB release target. Total Working Set is diagnostic only. One launch-shell `conhost` child was present and excluded from the app target; including it produced TotalWorkingSet 373.3 MB, TotalPrivateBytes 194.0 MB, TotalWorkingSetPrivate 99.2 MB. Cleanup: RemainingAfterCleanup=0. |
| 2026-06-22 | Debug executable `src-tauri/target/debug/picopet.exe` | Microsoft Windows 10 家庭中文版 10.0.19045 | 149.0.4022.80 | 37.9 | not recorded | not recorded | 318.8 | not recorded | not recorded | not recorded | 356.8 | not recorded | 7 | Historical diagnostic measurement after 65 seconds idle using the older total Working Set command. Total Working Set exceeded 50-100 MB and is not the target metric after WebView2 process-tree validation. One `conhost` child was excluded from the target sum; app process tree cleaned up afterward. |
