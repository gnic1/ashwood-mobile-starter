[CmdletBinding()]
param(
  [string]$OpenAIApiKey,
  [int]$Port = 5051,
  [string]$Model = 'gpt-4o-mini',
  [string]$CorsOrigin = '*',
  [string]$SharedSecret,
  [switch]$MockMode,
  [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Ensure-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found. Install it and re-run the script."
  }
}

function Set-DotEnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )
  $keyPattern = "^{0}\s*=" -f [regex]::Escape($Key)
  $lines = @()
  if (Test-Path $Path) {
    $lines = Get-Content -Path $Path
  }
  $updated = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $keyPattern) {
      $lines[$i] = "$Key=$Value"
      $updated = $true
      break
    }
  }
  if (-not $updated) {
    $lines += "$Key=$Value"
  }
  if ($lines.Count -gt 0) {
    $lines | Set-Content -Path $Path -Encoding UTF8
  } else {
    "$Key=$Value" | Set-Content -Path $Path -Encoding UTF8
  }
}

function Get-DotEnvValue {
  param(
    [string]$Path,
    [string]$Key
  )
  if (-not (Test-Path $Path)) { return $null }
  $pattern = "^{0}\s*=\s*(.*)$" -f [regex]::Escape($Key)
  foreach ($line in Get-Content -Path $Path) {
    if ($line -match $pattern) {
      return $Matches[1].Trim()
    }
  }
  return $null
}

function Prompt-ForApiKey {
  $secure = Read-Host -Prompt 'Enter your OpenAI API key (input hidden, press Enter to skip)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$serverDir = Join-Path $repoRoot 'server'
if (-not (Test-Path $serverDir)) {
  throw "Could not find server directory at $serverDir"
}

Push-Location $serverDir
try {
  Write-Step 'Checking prerequisites'
  Ensure-Command node
  Ensure-Command npm

  $ranInstall = $false
  if (-not $SkipInstall) {
    Write-Step 'Installing server dependencies (npm install)'
    npm install | ForEach-Object { Write-Host $_ }
    $ranInstall = $true
  } else {
    Write-Step 'Skipping npm install because -SkipInstall was provided'
  }

  $envPath = Join-Path $serverDir '.env'
  if (-not (Test-Path $envPath)) {
    Write-Host "Creating server .env file at $envPath"
    New-Item -ItemType File -Path $envPath -Force | Out-Null
  }

  $existingKey = Get-DotEnvValue -Path $envPath -Key 'OPENAI_API_KEY'
  if (-not $OpenAIApiKey) {
    if ($existingKey) {
      Write-Host 'Reusing existing OPENAI_API_KEY from server/.env'
      $OpenAIApiKey = $existingKey
    } elseif (-not $MockMode) {
      $OpenAIApiKey = Prompt-ForApiKey
    }
  }

  if (-not $OpenAIApiKey -and -not $MockMode) {
    throw 'An OpenAI API key is required unless -MockMode is specified.'
  }

  Write-Step 'Writing environment configuration'
  if ($OpenAIApiKey) {
    Set-DotEnvValue -Path $envPath -Key 'OPENAI_API_KEY' -Value $OpenAIApiKey
  } elseif ($existingKey) {
    # keep existing value but make sure formatting is consistent
    Set-DotEnvValue -Path $envPath -Key 'OPENAI_API_KEY' -Value $existingKey
  }
  Set-DotEnvValue -Path $envPath -Key 'PORT' -Value $Port
  Set-DotEnvValue -Path $envPath -Key 'MODEL' -Value $Model
  Set-DotEnvValue -Path $envPath -Key 'CORS_ORIGIN' -Value $CorsOrigin
  if ($PSBoundParameters.ContainsKey('SharedSecret')) {
    Set-DotEnvValue -Path $envPath -Key 'SHARED_SECRET' -Value $SharedSecret
  }
  Set-DotEnvValue -Path $envPath -Key 'MOCK_MODE' -Value ($MockMode.IsPresent ? '1' : '0')
  Set-DotEnvValue -Path $envPath -Key 'MAX_OUTPUT_TOKENS' -Value '512'

  Write-Step 'Summary'
  Write-Host ('Server dependencies installed: {0}' -f ($ranInstall ? 'yes' : 'no (skipped)')) -ForegroundColor Green
  Write-Host "Environment file: $envPath" -ForegroundColor Green
  if ($MockMode) {
    Write-Host 'MOCK_MODE=1 (no real OpenAI calls will be made)' -ForegroundColor Yellow
  } else {
    Write-Host 'Real OpenAI API key configured.' -ForegroundColor Green
  }
  Write-Host 'Start the proxy with:' -ForegroundColor Green
  Write-Host '  cd server'
  Write-Host '  npm start'
finally {
  Pop-Location
}
