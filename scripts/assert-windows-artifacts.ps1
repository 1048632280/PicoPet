param(
  [string]$ReleaseExe = "",
  [string]$Installer = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ($ReleaseExe -eq "") {
  $ReleaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
}
if ($Installer -eq "") {
  $Installer = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis\PicoPet_0.1.0_x64-setup.exe"
}

function Assert-File {
  param(
    [string]$Path,
    [int64]$MinimumBytes
  )

  if (-not (Test-Path $Path)) {
    throw "Expected artifact is missing: $Path"
  }

  $item = Get-Item $Path
  if ($item.Length -lt $MinimumBytes) {
    throw "Artifact is unexpectedly small: $Path ($($item.Length) bytes)"
  }

  Write-Host "Artifact verified: $Path ($($item.Length) bytes)"
}

Assert-File -Path $ReleaseExe -MinimumBytes 1000000
Assert-File -Path $Installer -MinimumBytes 500000

& (Join-Path $PSScriptRoot "assert-windows-gui-subsystem.ps1") -ExePath $ReleaseExe
