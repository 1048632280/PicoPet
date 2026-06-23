param(
  [string[]]$ProcessName = @("PicoPet", "picopet"),
  [string]$OutputJson = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Convert-ToMB($bytes) {
  if ($null -eq $bytes) { return $null }
  [math]::Round([double]$bytes / 1MB, 1)
}

function Sum-MB($rows, $propertyName) {
  $values = @($rows | Where-Object { $null -ne $_.$propertyName } | ForEach-Object { [double]$_.$propertyName })
  if ($values.Count -eq 0) { return $null }
  [math]::Round(($values | Measure-Object -Sum).Sum, 1)
}

$roots = @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)
if ($roots.Count -eq 0) {
  throw "No PicoPet process found. Launch PicoPet, wait 60 seconds, then rerun this script."
}

$processes = @(Get-CimInstance Win32_Process)
$perfById = @{}
foreach ($perf in @(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop)) {
  if ($perf.IDProcess -gt 0 -and -not $perfById.ContainsKey([int]$perf.IDProcess)) {
    $perfById[[int]$perf.IDProcess] = $perf
  }
}

$ids = New-Object "System.Collections.Generic.HashSet[int]"
$queue = New-Object "System.Collections.Generic.Queue[int]"
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

$treeRows = @(
  foreach ($process in @(Get-Process -Id ([int[]]$ids) -ErrorAction SilentlyContinue | Sort-Object Id)) {
    $perf = $perfById[[int]$process.Id]
    $processInfo = $processes | Where-Object { $_.ProcessId -eq $process.Id } | Select-Object -First 1
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
      ParentProcessId = $processInfo.ParentProcessId
      WorkingSetMB = Convert-ToMB $process.WorkingSet64
      PrivateBytesMB = Convert-ToMB $process.PrivateMemorySize64
      WorkingSetPrivateMB = if ($perf) { Convert-ToMB $perf.WorkingSetPrivate } else { $null }
    }
  }
)

$targetRows = @($treeRows | Where-Object { $_.Role -in @("Host", "WebView2") })
$summary = [pscustomobject]@{
  CapturedAt = (Get-Date).ToString("s")
  AppTargetWorkingSetPrivateMB = Sum-MB $targetRows "WorkingSetPrivateMB"
  DiagnosticTotalWorkingSetMB = Sum-MB $targetRows "WorkingSetMB"
  DiagnosticTotalPrivateBytesMB = Sum-MB $targetRows "PrivateBytesMB"
  ProcessCount = $targetRows.Count
  ExcludedLaunchShellCount = @($treeRows | Where-Object { $_.Role -eq "LaunchShell" }).Count
  Processes = $treeRows
}

$treeRows | Format-Table -AutoSize
$summary | Select-Object CapturedAt, AppTargetWorkingSetPrivateMB, DiagnosticTotalWorkingSetMB, DiagnosticTotalPrivateBytesMB, ProcessCount, ExcludedLaunchShellCount | Format-List

if ($OutputJson -ne "") {
  $summary | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $OutputJson
  Write-Host "Wrote memory baseline JSON to $OutputJson"
}
