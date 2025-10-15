param([switch]$NoGitPull)

# --- Always run from the project root ---
# This script lives in ...\ashwood-mobile-starter\scripts
$ScriptDir   = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# --- Optional: pull latest ---
if (-not $NoGitPull) {
  try { git pull origin main } catch {}
}

# --- Ensure .env is git-ignored ---
$gitignorePath = Join-Path $ProjectRoot ".gitignore"
if (-not (Test-Path $gitignorePath)) { New-Item -ItemType File -Path $gitignorePath | Out-Null }
$gi = Get-Content $gitignorePath -Raw
$needLines = @("","# .env + backups",".env",".env.*.backup*")
foreach ($ln in $needLines) {
  if ($gi -notmatch [regex]::Escape($ln)) { Add-Content $gitignorePath $ln }
}

# --- Ensure .env exists and has required keys (do NOT commit) ---
$envPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envPath)) { New-Item -ItemType File -Path $envPath | Out-Null }

# Load .env into a hashtable
$dotenv = @{}
(Get-Content $envPath) | ForEach-Object {
  if ($_ -match "^\s*#") { return }
  if ($_ -match "^\s*$") { return }
  $k,$v = $_ -split "=",2
  if ($null -ne $k -and $null -ne $v) { $dotenv[$k.Trim()] = $v.Trim() }
}

# Prompt for API key only if missing/placeholder
if (-not $dotenv.ContainsKey("OPENAI_API_KEY") -or $dotenv["OPENAI_API_KEY"] -match "REPLACE_ME|^sk-$") {
  $key = Read-Host "Enter your OPENAI_API_KEY (starts with sk-)"
  $dotenv["OPENAI_API_KEY"] = $key
}

# Defaults for models/base-url used by buttons via proxy
if (-not $dotenv.ContainsKey("OPENAI_BASE_URL"))     { $dotenv["OPENAI_BASE_URL"]     = "https://api.openai.com/v1" }
if (-not $dotenv.ContainsKey("OPENAI_MODEL_GPT"))    { $dotenv["OPENAI_MODEL_GPT"]    = "gpt-4o-mini" }
if (-not $dotenv.ContainsKey("OPENAI_MODEL_VISION")) { $dotenv["OPENAI_MODEL_VISION"] = "gpt-4o-mini" }
if (-not $dotenv.ContainsKey("OPENAI_MODEL_IMAGE"))  { $dotenv["OPENAI_MODEL_IMAGE"]  = "gpt-image-1" }

# Write .env back
$lines = @()
$dotenv.GetEnumerator() | ForEach-Object { $lines += ("{0}={1}" -f $_.Key,$_.Value) }
$lines | Set-Content -NoNewline $envPath
Write-Host "[OK] .env written/updated (not committed)."

# --- ADB port reverse (best-effort) ---
$platTools = Join-Path $Env:LOCALAPPDATA "Android\Sdk\platform-tools"
$adb = Join-Path $platTools "adb.exe"
if (Test-Path $adb) {
  Start-Process -WindowStyle Hidden -FilePath "taskkill" -ArgumentList "/F","/IM","adb.exe" -NoNewWindow -ErrorAction SilentlyContinue | Out-Null
  Start-Sleep -Milliseconds 300
  & $adb start-server | Out-Null
  & $adb reverse tcp:8081 tcp:8081 2>$null
  & $adb reverse tcp:19000 tcp:19000 2>$null
  & $adb reverse tcp:19001 tcp:19001 2>$null
  Write-Host "[OK] ADB port reverse configured."
} else {
  Write-Warning "adb.exe not found; continuing."
}

# --- Start Proxy in a separate PowerShell window (from project root) ---
try { Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force } catch {}
$proxyCmd = "cd `"$ProjectRoot`"; node proxy\server.js"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command",$proxyCmd
Start-Sleep -Seconds 1
Write-Host "[OK] Proxy starting at http://localhost:8787 (and :5051)."

# --- Start Expo in this window (from project root) ---
$env:EXPO_PUBLIC_API_BASE = "http://10.0.2.2:8787"
Write-Host "[OK] EXPO_PUBLIC_API_BASE=$($env:EXPO_PUBLIC_API_BASE)"
Write-Host "Starting Expo (localhost)… when ready, press 'a' to open Android."
npx expo start --clear --host localhost
