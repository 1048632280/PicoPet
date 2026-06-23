param(
  [switch]$SkipManualReminder
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host "== $Label =="
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$shimDir = Join-Path $env:LOCALAPPDATA "CorepackShims"
if (Test-Path $shimDir) {
  $env:PATH = "$shimDir;$env:PATH"
}

Invoke-Step "windows release smoke" { pnpm check:windows:release }
Invoke-Step "windows portable artifact packaging" { pnpm portable:windows }
Invoke-Step "windows artifact validation" { pnpm artifact:windows }

if (-not $SkipManualReminder) {
  Write-Host "Manual QA still required:"
  Write-Host "- docs/qa/windows-beta-checklist.md"
  Write-Host "- docs/qa/windows-installer-checklist.md"
  Write-Host "- docs/qa/memory-baseline.md"
}

Write-Host "== Windows release gate automated checks completed =="
