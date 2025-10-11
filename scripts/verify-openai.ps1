[CmdletBinding()]
param(
  [string]$ServerUrl,
  [int]$TimeoutSeconds = 25,
  [switch]$StartServer,
  [switch]$LeaveServerRunning
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Message) Write-Host "`n=== $Message ===" -ForegroundColor Cyan }
function Ensure-Command { param([string]$Name) if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' was not found. Install it and re-run the script." } }

function Get-DotEnvMap {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  foreach ($line in Get-Content -Path $Path) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }
    $pair = $line -split '=', 2
    if ($pair.Length -eq 2) { $map[$pair[0].Trim()] = $pair[1].Trim() }
  }
  return $map
}

function Invoke-WithRetry {
  param([scriptblock]$Action,[int]$Retries,[int]$DelaySeconds = 1)
  $lastError = $null
  for ($i = 0; $i -lt $Retries; $i++) {
    try { return & $Action } catch { $lastError = $_; Start-Sleep -Seconds $DelaySeconds }
  }
  if ($lastError) { throw $lastError }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$serverDir = Join-Path $repoRoot 'server'
if (-not (Test-Path $serverDir)) { throw "Could not find server directory at $serverDir" }

$envMap = Get-DotEnvMap -Path (Join-Path $serverDir '.env')
if (-not $ServerUrl) {
  $port = if ($envMap.ContainsKey('PORT') -and $envMap['PORT']) { $envMap['PORT'] } else { '5051' }
  $ServerUrl = "http://localhost:$port"
}
$ServerUrl = $ServerUrl.TrimEnd('/')
$secret = if ($envMap.ContainsKey('SHARED_SECRET')) { $envMap['SHARED_SECRET'] } else { '' }
$mockMode = $envMap.ContainsKey('MOCK_MODE') -and $envMap['MOCK_MODE'] -eq '1'

$headers = @{}
if ($secret) { $headers['x-ashwood-key'] = $secret }

$serverJob = $null
if ($StartServer) {
  Write-Step 'Starting local proxy server'
  Ensure-Command node
  $serverJob = Start-Job -ScriptBlock { param($Dir) Set-Location $Dir; node server.js } -ArgumentList $serverDir
  Start-Sleep -Seconds 2
  $jobState = (Get-Job -Id $serverJob.Id).State
  if ($jobState -eq 'Failed') {
    $err = Receive-Job -Job $serverJob -ErrorAction SilentlyContinue
    throw "Proxy server failed to start: $err"
  }
}

try {
  $retries = [Math]::Max(1, [Math]::Ceiling($TimeoutSeconds))

  Write-Step "Checking $ServerUrl/health"
  $health = Invoke-WithRetry -Action { Invoke-RestMethod -Uri "$ServerUrl/health" -Headers $headers -Method Get -TimeoutSec 5 } -Retries $retries
  Write-Host (ConvertTo-Json $health -Depth 5)

  Write-Step "Checking $ServerUrl/health/openai"
  $openaiHealth = Invoke-WithRetry -Action { Invoke-RestMethod -Uri "$ServerUrl/health/openai" -Headers $headers -Method Get -TimeoutSec 15 } -Retries $retries
  Write-Host (ConvertTo-Json $openaiHealth -Depth 5)

  if ($mockMode) { Write-Host 'Proxy is running in MOCK_MODE=1; upstream OpenAI calls are simulated.' -ForegroundColor Yellow }
  elseif ($openaiHealth.ok) { Write-Host 'Proxy successfully reached OpenAI.' -ForegroundColor Green }
  else { Write-Host 'Proxy failed to reach OpenAI. Review the details above.' -ForegroundColor Red }

  $canChat = $openaiHealth.ok -and -not $mockMode
  if ($canChat) {
    Write-Step 'Smoke testing /api/chat'
    $chatBody = @{ prompt = 'Hello from Ashwood test harness.' }
    $chatHeaders = @{'Content-Type' = 'application/json'}
    foreach ($key in $headers.Keys) { $chatHeaders[$key] = $headers[$key] }
    $chatResult = Invoke-RestMethod -Uri "$ServerUrl/api/chat" -Headers $chatHeaders -Method Post -Body (ConvertTo-Json $chatBody) -TimeoutSec 20
    Write-Host (ConvertTo-Json $chatResult -Depth 5)
  } else {
    Write-Host 'Skipping /api/chat smoke test because the OpenAI health check failed or proxy is in mock mode.' -ForegroundColor Yellow
  }

  Write-Host "All checks completed." -ForegroundColor Green
} finally {
  if ($serverJob -and -not $LeaveServerRunning) {
    Write-Step 'Stopping local proxy server'
    try { Stop-Job -Job $serverJob -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
    try { Receive-Job -Job $serverJob -ErrorAction SilentlyContinue | Out-Null } catch {}
    Remove-Job -Job $serverJob -Force -ErrorAction SilentlyContinue
  } elseif ($serverJob) {
    Write-Host 'Proxy server job left running as requested. Use Get-Job/Receive-Job to monitor it.' -ForegroundColor Yellow
  }
}
