[CmdletBinding()]
param(
  [string]$EmulatorName = "Pixel_9",
  [int]$ProxyPort = 5051,
  [switch]$MockMode,
  [string]$SharedSecret = "",
  [switch]$SkipServerInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n=== $Message ===" -ForegroundColor Cyan }
function Ensure-FileExists { param([string]$Path,[string]$MissingMsg) if (-not (Test-Path $Path)) { throw $MissingMsg } }

function Get-NpmCmdPath {
  $candidates = @(
    "C:\Program Files\nodejs\npm.cmd",
    "C:\Program Files (x86)\nodejs\npm.cmd"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  $resolved = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if ($resolved) { return $resolved }
  throw "npm.cmd not found. Install Node.js and ensure npm is on PATH."
}

function Set-DotEnvValue {
  param([string]$Path,[string]$Key,[string]$Value)
  $pat = "^{0}\s*=" -f [regex]::Escape($Key)
  $lines = @()
  if (Test-Path $Path) { $lines = Get-Content -Path $Path }
  if ($lines -isnot [System.Collections.IEnumerable]) { $lines = @($lines) } # normalize single-line case
  $hit = $false
  for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pat) { $lines[$i] = "$Key=$Value"; $hit = $true; break }
  }
  if (-not $hit) { $lines += "$Key=$Value" }
  if ($lines.Count -gt 0) { $lines | Set-Content -Path $Path -Encoding UTF8 } else { "$Key=$Value" | Set-Content -Path $Path -Encoding UTF8 }
}

function Wait-For-Http {
  param([string]$Url,[int]$Retries = 25,[int]$DelaySeconds = 1)
  for ($i=0; $i -lt $Retries; $i++) {
    try { Invoke-RestMethod -Uri $Url -TimeoutSec 5 | Out-Null; return $true } catch { Start-Sleep -Seconds $DelaySeconds }
  }
  return $false
}

# Resolve repo root from this script's location
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
Set-Location $repoRoot

# Paths & sanity
Ensure-FileExists -Path (Join-Path $repoRoot "package.json") -MissingMsg "Run this from a valid project: package.json not found at $repoRoot."
$serverDir = Join-Path $repoRoot "server"
Ensure-FileExists -Path $serverDir -MissingMsg "Server folder not found at '$serverDir'."

$npmCmd = Get-NpmCmdPath
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$adb = Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe"
$emulatorExe = Join-Path $env:ANDROID_SDK_ROOT "emulator\emulator.exe"
Ensure-FileExists -Path $adb -MissingMsg "ADB not found at '$adb'. Install Android SDK Platform-tools."
Ensure-FileExists -Path $emulatorExe -MissingMsg "emulator.exe not found at '$emulatorExe'. Install Android SDK Emulator."

# Step 1: Ensure .env for Android (10.0.2.2 -> host)
Write-Step "Updating .env for Android proxy access"
$envPath = Join-Path $repoRoot ".env"
if (-not (Test-Path $envPath)) { New-Item -ItemType File -Path $envPath -Force | Out-Null }
Set-DotEnvValue -Path $envPath -Key "EXPO_PUBLIC_OPENAI_BASE_URL" -Value ("http://10.0.2.2:{0}" -f $ProxyPort)
Set-DotEnvValue -Path $envPath -Key "EXPO_PUBLIC_OPENAI_MODEL" -Value "gpt-4o-mini"

# Step 2: Start emulator if needed
Write-Step "Checking ADB devices"
& $adb start-server | Out-Null
$devices = & $adb devices
$alreadyUp = ($devices -match "emulator-.*\sdevice").Length -gt 0
if (-not $alreadyUp) {
  Write-Step "Starting emulator '$EmulatorName'"
  Start-Process -FilePath $emulatorExe -ArgumentList @("-avd", $EmulatorName, "-no-boot-anim", "-netdelay","none","-netspeed","full") | Out-Null
  Write-Host "Waiting for device to come online..."
  & $adb wait-for-device
  Start-Sleep -Seconds 5
}
& $adb devices -l

# Step 3: Start proxy (background job)
Write-Step "Starting local proxy on port $ProxyPort (MockMode=$($MockMode.IsPresent))"
$proxyJob = Start-Job -ScriptBlock {
  param($Dir,$NpmCmd,$UseMock,$Port,$Shared,$SkipInstall)
  Set-Location $Dir
  if (-not $SkipInstall) {
    $p = Start-Process -FilePath $NpmCmd -ArgumentList "install" -NoNewWindow -PassThru -Wait
    if ($p.ExitCode -ne 0) { throw "npm install (server) failed: $($p.ExitCode)" }
  }
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
  SetPair $envFile "MODEL" "gpt-4o-mini"
  SetPair $envFile "CORS_ORIGIN" "*"
  SetPair $envFile "MAX_OUTPUT_TOKENS" "512"
  $mockValue = if ($UseMock) { "1" } else { "0" }
  SetPair $envFile "MOCK_MODE" $mockValue
  if ($Shared) { SetPair $envFile "SHARED_SECRET" $Shared }
  $p2 = Start-Process -FilePath $NpmCmd -ArgumentList "start" -NoNewWindow -PassThru
  Wait-Process -Id $p2.Id
} -ArgumentList $serverDir,$npmCmd,$MockMode.IsPresent,$ProxyPort,$SharedSecret,$SkipServerInstall

$ok = Wait-For-Http -Url ("http://localhost:{0}/health" -f $ProxyPort) -Retries 30 -DelaySeconds 1
if ($ok) { Write-Host "Proxy is responding on http://localhost:$ProxyPort" -ForegroundColor Green } else { Write-Host "Proxy did not respond yet; continuing (check job output with Get-Job/Receive-Job)." -ForegroundColor Yellow }

# Step 4: Build, install, and run on Android (auto-confirm npx prompts)
Write-Step "Building and running the Android app"
$exit = 0
try {
  $p3 = Start-Process -FilePath "npx" -ArgumentList "-y","expo","run:android" -NoNewWindow -PassThru -Wait
  $exit = $p3.ExitCode
} catch {
  $npxCmd = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
  if ($npxCmd) {
    $p4 = Start-Process -FilePath $npxCmd -ArgumentList "-y expo run:android" -NoNewWindow -PassThru -Wait
    $exit = $p4.ExitCode
  } else {
    throw $_
  }
}
if ($exit -ne 0) { throw "expo run:android failed with exit code $exit" }

Write-Step "Startup complete"
Write-Host "Emulator is running, proxy started, app built and launched." -ForegroundColor Green
Write-Host "Manage proxy job with:  Get-Job; Receive-Job <id>; Stop-Job <id>; Remove-Job <id>"
