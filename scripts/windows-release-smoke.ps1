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
  $releaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
  Invoke-Step "assert Windows GUI subsystem" {
    & (Join-Path $PSScriptRoot "assert-windows-gui-subsystem.ps1") -ExePath $releaseExe
  }
}

Write-Host "== Smoke check completed =="
