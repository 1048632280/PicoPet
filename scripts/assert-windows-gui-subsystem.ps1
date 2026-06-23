param(
  [Parameter(Mandatory = $true)]
  [string]$ExePath
)

chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$resolvedPath = Resolve-Path $ExePath
$bytes = [System.IO.File]::ReadAllBytes($resolvedPath)

if ($bytes.Length -lt 0x40) {
  throw "Executable is too small to contain a PE header: $resolvedPath"
}

$peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
$subsystemOffset = $peOffset + 24 + 68

if ($subsystemOffset + 2 -gt $bytes.Length) {
  throw "Executable PE header is incomplete: $resolvedPath"
}

$subsystem = [BitConverter]::ToUInt16($bytes, $subsystemOffset)
if ($subsystem -ne 2) {
  throw "Expected Windows GUI subsystem 2, got $subsystem for $resolvedPath"
}

Write-Host "Windows GUI subsystem verified: $resolvedPath"
