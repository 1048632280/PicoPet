param(
  [string]$ReleaseExe = "",
  [string]$Installer = "",
  [string]$PortableZip = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ($ReleaseExe -eq "") {
  $ReleaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
}
if ($Installer -eq "") {
  $Installer = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis\PicoPet_0.2.1_x64-setup.exe"
}
if ($PortableZip -eq "") {
  $PortableZip = Join-Path $repoRoot "src-tauri\target\release\bundle\portable\PicoPet_0.2.1_x64-portable.zip"
}

function Assert-File {
  param(
    [string]$Path,
    [int64]$MinimumBytes
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Expected artifact is missing: $Path"
  }

  $item = Get-Item -LiteralPath $Path
  if ($item.Length -lt $MinimumBytes) {
    throw "Artifact is unexpectedly small: $Path ($($item.Length) bytes)"
  }

  Write-Host "Artifact verified: $Path ($($item.Length) bytes)"
}

function Assert-ZipEntry {
  param(
    [string]$Path,
    [string]$EntryName
  )

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1
    if ($null -eq $entry) {
      throw "Expected zip entry is missing: $EntryName in $Path"
    }
    Write-Host "Zip entry verified: $EntryName"
  }
  finally {
    $zip.Dispose()
  }
}

Assert-File -Path $ReleaseExe -MinimumBytes 1000000
Assert-File -Path $Installer -MinimumBytes 500000
Assert-File -Path $PortableZip -MinimumBytes 1000000

Assert-ZipEntry -Path $PortableZip -EntryName "PicoPet/picopet.exe"
Assert-ZipEntry -Path $PortableZip -EntryName "PicoPet/data/"

& (Join-Path $PSScriptRoot "assert-windows-gui-subsystem.ps1") -ExePath $ReleaseExe
