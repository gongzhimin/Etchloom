param([switch]$NoProxy)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$weightsDir = Join-Path $projectRoot 'services\informative_drawings\weights'
$destination = Join-Path $weightsDir 'model.pth'
$expected = 'C686CED2A666B4850B4BB6CCF0748031C3EDA9F822DE73A34B8979970D90F0C6'
$url = 'https://huggingface.co/spaces/carolineec/informativedrawings/resolve/main/model.pth?download=true'
function Get-Sha256([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') }
    finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}
New-Item -ItemType Directory -Force -Path $weightsDir | Out-Null
if ((Test-Path -LiteralPath $destination) -and ((Get-Sha256 $destination) -eq $expected)) {
  Write-Host 'Informative Drawings weights are already installed and verified.'
  exit 0
}
$curlArgs = @('-fL', '--retry', '4', '--retry-all-errors', '-o', $destination)
if ($NoProxy) { $curlArgs += @('--proxy', '') }
& curl.exe @curlArgs $url
if ($LASTEXITCODE -ne 0) { throw 'Failed to download the model weights.' }
$actual = Get-Sha256 $destination
if ($actual -ne $expected) {
  Remove-Item -LiteralPath $destination
  throw "Model checksum mismatch: $actual"
}
Write-Host "Installed verified weights at $destination"
