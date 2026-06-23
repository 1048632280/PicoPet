param(
  [switch]$Release
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$shimDir = Join-Path $env:LOCALAPPDATA "CorepackShims"
if (Test-Path $shimDir) {
  $env:PATH = "$shimDir;$env:PATH"
}

Write-Host "== PicoPet Windows smoke check =="
pnpm check
pnpm tauri build --debug

if ($Release) {
  pnpm tauri build
}

Write-Host "== Smoke check completed =="
