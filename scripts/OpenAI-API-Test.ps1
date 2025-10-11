[CmdletBinding()]
param(
  [switch]$StartServer,
  [switch]$LeaveServerRunning,
  [switch]$MockMode,
  [int]$Port = 5051
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n=== $Message ===" -ForegroundColor Cyan }
function Ensure-FileExists { param([string]$Path,[string]$Msg) if (-not (Test-Path $Path)) { throw $Msg } }
function Wait-For-Http {
  param([string]$Url,[int]$Retries = 25,[int]$DelaySeconds = 1)
  for ($i=0;$i -lt $Retries;$i++) {
    try { Invoke-RestMethod -Uri $Url -TimeoutSec 5 | Out-Null; return $true } catch { Start-Sleep -Seconds $DelaySeconds }
  }
  return $false
}

# Resolve repo root from this script's location
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
Set-Location $repoRoot

Ensure-FileExists -Path (Join-Path $repoRoot "package.json") -Msg "Run this from a valid project."
$serverDir = Join-Path $repoRoot "server"
Ensure-FileExists -Path $serverDir -Msg "Server folder not found at '$serverDir'."

$verifyScript = Join-Path $repoRoot "scripts\verify-openai.ps1"
$useInline = -not (Test-Path $verifyScript)

$serverJob = $null
if ($StartServer) {
  Write-Step "Starting proxy server (MockMode=$($MockMode.IsPresent))"
  $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npmCmd) { throw "npm.cmd not found. Ensure Node/npm are installed." }
  $serverJob = Start-Job -ScriptBlock {
    param($Dir,$NpmCmd,$Mock,$Port)
    Set-Location $Dir
    $envFile = Join-Path $Dir ".env"
    if (-not (Test-Path $envFile)) { New-Item -ItemType File -Path $envFile -Force | Out-Null }
    function SetPair([string]$Path,[string]$K,[string]$V){
      $pat="^{0}\s*=" -f [regex]::Escape($K)
      $lines=@(); if(Test-Path $Path){ $lines=Get-Content -Path $Path }
      if ($lines -isnot [System.Collections.IEnumerable]) { $lines = @($lines) }
      $hit=$false
      for($i=0;$i -lt $lines.Count;$i++){ if($lines[$i] -match $pat){ $lines[$i]="$K=$V"; $hit=$true; break } }
      if(-not $hit){ $lines+="$K=$V" }
      if($lines.Count -gt 0){ $lines | Set-Content -Path $Path -Encoding UTF8 } else { "$K=$V" | Set-Content -Path $Path -Encoding UTF8 }
    }
    SetPair $envFile "PORT" $Port
    SetPair $envFile "MOCK_MODE" (if($Mock){'1'}else{'0'})
    SetPair $envFile "MODEL" "gpt-4o-mini"
    SetPair $envFile "CORS_ORIGIN" "*"
    SetPair $envFile "MAX_OUTPUT_TOKENS" "512"
    Start-Process -FilePath $NpmCmd -ArgumentList "start" -NoNewWindow -Wait
  } -ArgumentList $serverDir,$npmCmd,$MockMode.IsPresent,$Port
}

$base = "http://localhost:$Port"
Write-Step "Waiting for $base/health"
$up = Wait-For-Http -Url "$base/health" -Retries 30 -DelaySeconds 1
if (-not $up) { throw "Proxy did not become healthy at $base/health." }

if (-not $useInline) {
  Write-Step "Running scripts/verify-openai.ps1"
  & $verifyScript -ServerUrl $base -TimeoutSeconds 25 -StartServer:$false -LeaveServerRunning
} else {
  Write-Step "Checking /health"
  $h = Invoke-RestMethod "$base/health" -TimeoutSec 10
  $h | ConvertTo-Json -Depth 5 | Write-Host

  Write-Step "Checking /health/openai"
  $okOpenAI = $false
  try {
    $h2 = Invoke-RestMethod "$base/health/openai" -TimeoutSec 20
    $h2 | ConvertTo-Json -Depth 5 | Write-Host
    if ($h2.ok) { $okOpenAI = $true }
  } catch {
    Write-Host "OpenAI health endpoint errored (likely no key if mock=false)." -ForegroundColor Red
    Write-Host $_
  }

  if ($okOpenAI -and ($h.MOCK_MODE -ne "1")) {
    Write-Step "POST /api/chat (smoke)"
    $body = @{ prompt = "Hello from Ashwood OpenAI test." } | ConvertTo-Json
    $res = Invoke-RestMethod "$base/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
    $res | ConvertTo-Json -Depth 5 | Write-Host
  } else {
    Write-Host "Skipping /api/chat (mock mode or upstream not healthy)." -ForegroundColor Yellow
  }
}

Write-Step "API test complete"
if ($serverJob -and -not $LeaveServerRunning) {
  Write-Host "Stopping proxy job..." -ForegroundColor Yellow
  try { Stop-Job $serverJob -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
  try { Receive-Job $serverJob -ErrorAction SilentlyContinue | Out-Null } catch {}
  Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
} elseif ($serverJob) {
  Write-Host "Proxy left running. Use Get-Job / Stop-Job / Remove-Job to manage it." -ForegroundColor Yellow
}
