$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$candidates = @()
if ($env:ETCHLOOM_MODEL_PYTHON) { $candidates += $env:ETCHLOOM_MODEL_PYTHON }
$candidates += (Join-Path $projectRoot '.venv-model\Scripts\python.exe')
if ($env:CONDA_PREFIX) { $candidates += (Join-Path $env:CONDA_PREFIX 'python.exe') }

# Known good environments
$candidates += 'C:\Users\Jimin\miniconda3\envs\midi_gen\python.exe'

$conda = Get-Command conda -ErrorAction SilentlyContinue
if ($conda) {
  try {
    $candidates += ((& $conda.Source env list --json | ConvertFrom-Json).envs | ForEach-Object { Join-Path $_ 'python.exe' })
  } catch { }
}
$systemPython = Get-Command python -ErrorAction SilentlyContinue
if ($systemPython) { $candidates += $systemPython.Source }

$python = $null
foreach ($candidate in ($candidates | Select-Object -Unique)) {
  if (-not (Test-Path -LiteralPath $candidate)) { continue }
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  & $candidate -c "import torch, torchvision, PIL" *> $null
  $ErrorActionPreference = $previousPreference
  if ($LASTEXITCODE -eq 0) { $python = $candidate; break }
}
if (-not $python) {
  throw 'No Python environment with torch, torchvision, and Pillow was found for v2. Please install torch and torchvision.'
}
Write-Host "Etchloom v2 Model using: $python"
& $python (Join-Path $projectRoot 'services\informative_drawings\server.py') @args
