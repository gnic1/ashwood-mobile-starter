param(
  [switch]$NoGitPull
)

# ========= Helpers =========
function Write-Ok($msg){ Write-Host ("[OK]  {0}" -f $msg) -ForegroundColor Green }
function Write-Warn($msg){ Write-Host ("[WARN] {0}" -f $msg) -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host ("[ERR] {0}" -f $msg) -ForegroundColor Red }
function Test-HttpJson($uri, $method="GET", $body=$null){
  try{
    if($method -eq "GET"){
      return Invoke-WebRequest $uri -UseBasicParsing -TimeoutSec 15
    } else {
      return Invoke-RestMethod -Uri $uri -Method $method -ContentType "application/json" -Body $body -TimeoutSec 30
    }
  } catch {
    return $_.Exception
  }
}

# ========= Always run from project root =========
$ScriptDir   = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host ("`n=== Ashwood & Co. — Good Morning ({0}) ===" -f (Get-Date)) -ForegroundColor Cyan

# ========= Optional: pull latest =========
if(-not $NoGitPull){
  try{
    git pull origin main | Out-Null
    Write-Ok "Git pull main"
  } catch { Write-Warn "Git pull skipped/failed (continuing): $($_.Exception.Message)" }
}else{
  Write-Warn "NoGitPull set — skipping git pull"
}

# ========= Ensure .gitignore protection for secrets =========
$gitignorePath = Join-Path $ProjectRoot ".gitignore"
if(-not (Test-Path $gitignorePath)){ New-Item -ItemType File -Path $gitignorePath | Out-Null }
$gi = Get-Content $gitignorePath -Raw
$need = @("","# .env + backups",".env",".env.*.backup*")
foreach($ln in $need){ if($gi -notmatch [regex]::Escape($ln)){ Add-Content $gitignorePath $ln } }
Write-Ok ".gitignore updated (secrets safe)"

# ========= Ensure .env has required keys =========
$envPath = Join-Path $ProjectRoot ".env"
if(-not (Test-Path $envPath)){ New-Item -ItemType File -Path $envPath | Out-Null }

# Load existing .env
$dotenv = @{}
(Get-Content $envPath) | ForEach-Object {
  if($_ -match "^\s*#"){ return }
  if($_ -match "^\s*$"){ return }
  $k,$v = $_ -split "=",2
  if($k -and $v){ $dotenv[$k.Trim()] = $v.Trim() }
}

# Prefer existing User env var for OPENAI_API_KEY, else .env, else prompt once
$userKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY","User")
if([string]::IsNullOrWhiteSpace($dotenv["OPENAI_API_KEY"])){
  if(-not [string]::IsNullOrWhiteSpace($userKey)){
    $dotenv["OPENAI_API_KEY"] = $userKey
  }
}
if([string]::IsNullOrWhiteSpace($dotenv["OPENAI_API_KEY"]) -or $dotenv["OPENAI_API_KEY"] -match "REPLACE_ME|^sk-$"){
  $key = Read-Host "Enter your OPENAI_API_KEY (starts with sk-)"
  $dotenv["OPENAI_API_KEY"] = $key
  # persist at User level too for extra resilience
  [System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY",$key,"User")
}

# Defaults used by proxy/app buttons
if(-not $dotenv.ContainsKey("OPENAI_BASE_URL"))     { $dotenv["OPENAI_BASE_URL"]     = "https://api.openai.com/v1" }
if(-not $dotenv.ContainsKey("OPENAI_MODEL_GPT"))    { $dotenv["OPENAI_MODEL_GPT"]    = "gpt-4o-mini" }
if(-not $dotenv.ContainsKey("OPENAI_MODEL_VISION")) { $dotenv["OPENAI_MODEL_VISION"] = "gpt-4o-mini" }
if(-not $dotenv.ContainsKey("OPENAI_MODEL_IMAGE"))  { $dotenv["OPENAI_MODEL_IMAGE"]  = "gpt-image-1" }

# Save .env
$lines = @()
$dotenv.GetEnumerator() | ForEach-Object { $lines += ("{0}={1}" -f $_.Key,$_.Value) }
$lines | Set-Content -NoNewline $envPath
Write-Ok ".env written/verified (never committed)"

# ========= ADB reverse (so Expo Go reaches Metro) =========
$platTools = Join-Path $Env:LOCALAPPDATA "Android\Sdk\platform-tools"
$adb = Join-Path $platTools "adb.exe"
if(Test-Path $adb){
  Start-Process -WindowStyle Hidden -FilePath "taskkill" -ArgumentList "/F","/IM","adb.exe" -NoNewWindow -ErrorAction SilentlyContinue | Out-Null
  Start-Sleep -Milliseconds 300
  & $adb start-server    | Out-Null
  & $adb reverse tcp:8081 tcp:8081 2>$null
  & $adb reverse tcp:19000 tcp:19000 2>$null
  & $adb reverse tcp:19001 tcp:19001 2>$null
  Write-Ok "ADB reverse ready (8081, 19000, 19001)"
}else{
  Write-Warn "adb.exe not found — continuing"
}

# ========= Start Proxy (separate terminal) =========
try{ Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force } catch {}
$proxyCmd = "cd `"$ProjectRoot`"; node proxy\server.js"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command",$proxyCmd
Start-Sleep -Seconds 1
Write-Ok "Proxy launch requested (ports 8787/5051)"

# ========= Wait for proxy then health check =========
$proxyOk = $false
for($i=1;$i -le 20;$i++){
  $res = Test-HttpJson "http://localhost:8787" "GET"
  if($res -isnot [Exception] -and $res.StatusCode -eq 200){ $proxyOk = $true; break }
  Start-Sleep -Milliseconds 500
}
if(-not $proxyOk){ Write-Err "Proxy GET / not reachable on :8787"; }

# Lightweight smoke suite (only if proxy up)
$chatOk=$false;$visionOk=$false;$imageOk=$false
if($proxyOk){
  $chatBody = @{
    messages = @(@{ role="user"; content="gm" })
    model    = "gpt-4o-mini"
  } | ConvertTo-Json -Depth 5
  $r1 = Test-HttpJson "http://localhost:8787/api/chat" "POST" $chatBody
  if($r1 -isnot [Exception]){ $chatOk = $true }

  $visionBody = @{
    prompt    = "Describe in 3 words"
    image_url = "https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg"
    model     = "gpt-4o-mini"
  } | ConvertTo-Json -Depth 5
  $r2 = Test-HttpJson "http://localhost:8787/api/vision" "POST" $visionBody
  if($r2 -isnot [Exception]){ $visionOk = $true }

  $imageBody = @{
    prompt = "Minimal raven on antique key, outline"
    size   = "256x256"
    model  = "gpt-image-1"
  } | ConvertTo-Json -Depth 5
  $r3 = Test-HttpJson "http://localhost:8787/api/image" "POST" $imageBody
  if($r3 -isnot [Exception]){ $imageOk = $true }
}

# ========= Start Expo (localhost mode) =========
$env:EXPO_PUBLIC_API_BASE = "http://10.0.2.2:8787"
Write-Ok ("EXPO_PUBLIC_API_BASE={0}" -f $env:EXPO_PUBLIC_API_BASE)
Write-Host "Starting Expo… when Metro is ready, press 'a' to open Android." -ForegroundColor Cyan
Start-Sleep -Milliseconds 300
# Run in this window so you see Metro logs:
npx expo start --clear --host localhost

# (After you press 'a', you can open Dev Menu (Ctrl+M) → Reload if needed.)
# ========= End =========
