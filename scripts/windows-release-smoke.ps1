param(
  [switch]$Release
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

Write-Host "== PicoPet Windows smoke check =="
Invoke-Step "pnpm check" { pnpm check }
Invoke-Step "pnpm tauri build --debug" { pnpm tauri build --debug }

if ($Release) {
  Invoke-Step "pnpm tauri build" { pnpm tauri build }
}

Write-Host "== Smoke check completed =="
