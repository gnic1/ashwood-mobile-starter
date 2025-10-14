param(
  [string]$AvdName = "Pixel_9",
  [switch]$Tunnel
)

# -------- helpers --------
function New-Log {
  param([string]$Prefix)
  if (-not (Test-Path -LiteralPath ".\logs")) { New-Item -ItemType Directory -Path ".\logs" | Out-Null }
  $stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
  return "logs\${Prefix}-$stamp.log"
}

function Start-Window {
  param([string]$Title,[string]$Command)
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoLogo","-NoExit",
    "-Command",
    "Set-Location '$pwd'; $Command"
  ) -WindowStyle Normal
  Start-Sleep -Milliseconds 200
}

function Wait-For-Port {
  param([int]$Port,[int]$TimeoutSec=60)
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(500,$false)
      if ($ok -and $client.Connected) { $client.Close(); return $true }
      $client.Close()
    } catch {}
  }
  return $false
}

function Ensure-Cmd {
  param([string]$Name,[string]$Hint)
  $c = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $c) {
    Write-Host "Missing command '$Name'. $Hint" -ForegroundColor Yellow
    return $false
  }
  return $true
}

# -------- banner --------
Write-Host '===================================================='
Write-Host ' Ashwood & Co — Start (git pull, proxy, expo, AVD)'
Write-Host '===================================================='

# -------- sanity / env --------
$ok = $true
$ok = (Ensure-Cmd -Name 'git'  -Hint 'Install Git for Windows') -and $ok
$ok = (Ensure-Cmd -Name 'node' -Hint 'Install Node.js LTS') -and $ok
$ok = (Ensure-Cmd -Name 'npx'  -Hint 'Install Node.js (npx)') -and $ok
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
if (-not (Test-Path $adbPath)) { Write-Host "ADB not found at $adbPath" -ForegroundColor Yellow; $ok=$false }
if (-not (Test-Path $emulatorPath)) { Write-Host "Emulator not found at $emulatorPath" -ForegroundColor Yellow; $ok=$false }
if (-not $ok) { Write-Host 'Fix the above tools, then re-run.' -ForegroundColor Red; exit 1 }

# -------- git fast-forward (no merge) --------
try {
  Write-Host 'Updating repository (git fetch --all --prune)...' -ForegroundColor Cyan
  git fetch --all --prune | Out-Null
  Write-Host 'Resetting local main to origin/main...' -ForegroundColor Cyan
  git rev-parse --abbrev-ref HEAD | Select-String -Quiet '^main$' | Out-Null
  if ($LASTEXITCODE -ne 0) { git checkout main | Out-Null }
  git reset --hard origin/main | Out-Null
  Write-Host 'Git up to date.' -ForegroundColor Green
} catch { Write-Host "Git update skipped: $($_.Exception.Message)" -ForegroundColor Yellow }

# -------- start proxy (server\server.js) --------
$proxyLog = New-Log 'proxy'
if (-not (Test-Path '.\server\server.js')) {
  Write-Host 'Warning: server\server.js not found. Skipping proxy.' -ForegroundColor Yellow
} else {
  $proxyCmd = "& node .\server\server.js 2>&1 | Tee-Object -FilePath '$proxyLog'"
  Write-Host "Starting Proxy ... logging to $proxyLog" -ForegroundColor Cyan
  Start-Window -Title 'Ashwood Proxy' -Command $proxyCmd
  if (-not (Wait-For-Port -Port 5051 -TimeoutSec 20)) {
    Write-Host 'Proxy not yet reachable on :5051 (continuing; Expo can start without it).' -ForegroundColor Yellow
  } else {
    Write-Host 'Proxy up on http://localhost:5051' -ForegroundColor Green
  }
}

# -------- start expo dev server --------
$expoLog = New-Log 'expo'
$expoArgs = @('expo','start')
if ($Tunnel) { $expoArgs += '--tunnel' }
$expoCmd = "& npx $($expoArgs -join ' ') 2>&1 | Tee-Object -FilePath '$expoLog'"
Write-Host "Starting Expo ... logging to $expoLog" -ForegroundColor Cyan
Start-Window -Title 'Ashwood Expo' -Command $expoCmd
Start-Sleep -Seconds 2

# -------- boot emulator --------
Write-Host "Booting Android emulator '$AvdName'..." -ForegroundColor Cyan
Start-Process -FilePath $emulatorPath -ArgumentList @('-avd', $AvdName, '-netdelay', 'none', '-netspeed', 'full') | Out-Null

# wait for device
& $adbPath wait-for-device 2>$null
$devs = & $adbPath devices
if (-not ($devs -match 'emulator-\d+\s+device')) {
  Write-Host 'Waiting for emulator to be ready...' -ForegroundColor Yellow
  Start-Sleep -Seconds 8
}

# -------- open app on Android (attach to running Expo) --------
Write-Host 'Opening app on Android via Expo...' -ForegroundColor Cyan
Start-Window -Title 'Expo Android Open' -Command "& npx expo start --android"

# -------- logcat (filtered) --------
$logcatLog = New-Log 'logcat'
$logcatCmd = "& `"$adbPath`" logcat ReactNative:V ReactNativeJS:V *:S 2>&1 | Tee-Object -FilePath '$logcatLog'"
Write-Host "Starting Android logcat ... logging to $logcatLog" -ForegroundColor Cyan
Start-Window -Title 'Ashwood Logcat' -Command $logcatCmd

# -------- summary --------
Write-Host '---------------------- SUMMARY ----------------------'
Write-Host ("Proxy log:   {0}" -f $proxyLog)
Write-Host ("Expo log:    {0}" -f $expoLog)
Write-Host ("Logcat log:  {0}" -f $logcatLog)
Write-Host 'Health check:  Invoke-WebRequest http://localhost:5051/health -UseBasicParsing'
Write-Host 'Status check:  .\Ashwood-Status.ps1 -TailLines 20'
Write-Host 'Stop all:      .\Ashwood-Stop.ps1'
Write-Host '-----------------------------------------------------'
