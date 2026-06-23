param(
  [string]$ReleaseExe = "",
  [string]$OutputZip = ""
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ($ReleaseExe -eq "") {
  $ReleaseExe = Join-Path $repoRoot "src-tauri\target\release\picopet.exe"
}

$packageJson = Get-Content -Encoding UTF8 (Join-Path $repoRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version
$portableDir = Join-Path $repoRoot "src-tauri\target\release\bundle\portable"
if ($OutputZip -eq "") {
  $OutputZip = Join-Path $portableDir "PicoPet_${version}_x64-portable.zip"
}

if (-not (Test-Path -LiteralPath $ReleaseExe)) {
  throw "Release executable is missing: $ReleaseExe"
}

New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
if (Test-Path -LiteralPath $OutputZip) {
  Remove-Item -LiteralPath $OutputZip -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($OutputZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $zip,
    $ReleaseExe,
    "PicoPet/picopet.exe",
    [System.IO.Compression.CompressionLevel]::Optimal
  ) | Out-Null
  $zip.CreateEntry("PicoPet/data/") | Out-Null
}
finally {
  $zip.Dispose()
}

$item = Get-Item -LiteralPath $OutputZip
Write-Host "Portable artifact created: $OutputZip ($($item.Length) bytes)"
