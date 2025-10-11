[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [int]$ProxyPort = 5051
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Message) Write-Host "`n=== $Message ===" -ForegroundColor Cyan }
function Ensure-Command { param([string]$Name) if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' was not found. Install it and re-run the script." } }

function Set-DotEnvValue {
  param([string]$Path,[string]$Key,[string]$Value)
  $keyPattern = "^{0}\s*=" -f [regex]::Escape($Key)
  $lines = @()
  if (Test-Path $Path) { $lines = Get-Content -Path $Path }
  $updated = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $keyPattern) { $lines[$i] = "$Key=$Value"; $updated = $true; break }
  }
  if (-not $updated) { $lines += "$Key=$Value" }
  if ($lines.Count -gt 0) { $lines | Set-Content -Path $Path -Encoding UTF8 } else { "$Key=$Value" | Set-Content -Path $Path -Encoding UTF8 }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
Push-Location $repoRoot
try {
  Write-Step 'Checking prerequisites'
  Ensure-Command node
  Ensure-Command npm
  Write-Host ("Node version: {0}" -f (node --version))

  if (-not $SkipInstall) {
    Write-Step 'Installing app dependencies (npm install)'
    # Use Start-Process to avoid pipeline/strict-mode quirks
    $p = Start-Process -FilePath "npm" -ArgumentList "install" -NoNewWindow -PassThru -Wait
    if ($p.ExitCode -ne 0) { throw "npm install failed with exit code $($p.ExitCode)" }
  } else {
    Write-Step 'Skipping npm install because -SkipInstall was provided'
  }

  $envPath = Join-Path $repoRoot '.env'
  if (-not (Test-Path $envPath)) { Write-Host "Creating .env file at $envPath"; New-Item -ItemType File -Path $envPath -Force | Out-Null }

  Write-Step 'Configuring Expo environment defaults'
  $baseUrl = "http://localhost:$ProxyPort"
  Set-DotEnvValue -Path $envPath -Key 'EXPO_PUBLIC_OPENAI_BASE_URL' -Value $baseUrl
  Set-DotEnvValue -Path $envPath -Key 'EXPO_PUBLIC_OPENAI_MODEL' -Value 'gpt-4o-mini'
  if (-not (Select-String -Path $envPath -Pattern 'EXPO_PUBLIC_OPENAI_API_KEY' -Quiet)) {
    Add-Content -Path $envPath -Value '# EXPO_PUBLIC_OPENAI_API_KEY=<your dev key (optional when using proxy)>'
  }

  Write-Step 'All done'
  Write-Host 'Next steps:' -ForegroundColor Green
  Write-Host '  1. Run scripts/init-server.ps1 to configure the local OpenAI proxy.'
  Write-Host '  2. Start Expo with `npm start` once the proxy is running.'
} finally {
  Pop-Location
}
