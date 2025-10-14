param()

function Write-Title($text) {
  Write-Host ""
  Write-Host "=== $text ===" -ForegroundColor Cyan
}

$ErrorActionPreference = "Stop"
$root = "C:\Users\Dad\Desktop\ashwood-mobile-starter"
$proxyPath = Join-Path $root "proxy"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Title "Ashwood & Co. - Good Morning Startup"
Set-Location $root

# 1) Pull latest changes
Write-Title "Git Pull"
git pull origin main

# 2) Ensure proxy exists (create minimal files if missing)
Write-Title "Proxy Check"
if (-not (Test-Path (Join-Path $proxyPath "server.js"))) {
  Write-Host "Proxy not found. Creating minimal proxy..."
  New-Item -ItemType Directory -Force -Path $proxyPath | Out-Null

  # Build package.json via PowerShell object to avoid nested here-strings
  $pkg = [ordered]@{
    name = "ashwood-proxy"
    version = "0.1.0"
    private = $true
    main = "server.js"
    type = "commonjs"
    scripts = @{ start = "node server.js" }
    dependencies = @{ cors = "^2.8.5"; express = "^4.19.2" }
  }
  $pkg | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $proxyPath "package.json") -Encoding UTF8

  # server.js with a double-quoted here-string (safe inside this file)
  $serverJs = @"
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8787;
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ashwood-proxy", port: PORT, ts: new Date().toISOString() });
});
app.post("/echo", (req, res) => {
  res.json({ received: req.body ?? null });
});
app.all("/", (_req, res) => res.json({ api: "ashwood-proxy", status: "ready" }));
app.listen(PORT, () => console.log(`Ashwood proxy listening on http://localhost:${PORT}`));
"@
  $serverJs | Set-Content -Path (Join-Path $proxyPath "server.js") -Encoding UTF8

  Push-Location $proxyPath
  npm i
  Pop-Location
} else {
  Write-Host "Proxy exists."
}

# 3) Ensure proxy is running (start if port 8787 is not listening)
Write-Title "Proxy Start & Health"
$portBusy = $false
try {
  $portBusy = [bool](Get-NetTCPConnection -State Listen -LocalPort 8787 -ErrorAction SilentlyContinue)
} catch { $portBusy = $false }

if (-not $portBusy) {
  Write-Host "Starting proxy in a separate PowerShell window..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$proxyPath`"; npm start" | Out-Null
  Start-Sleep -Seconds 2
} else {
  Write-Host "Proxy already listening on 8787."
}

# Wait for /health OK (up to ~10 seconds)
$proxyOk = $false
for ($i=0; $i -lt 10; $i++) {
  try {
    $resp = Invoke-WebRequest "http://localhost:8787/health" -UseBasicParsing -TimeoutSec 2
    if ($resp.StatusCode -eq 200) { $proxyOk = $true; break }
  } catch { Start-Sleep -Milliseconds 800 }
}
if (-not $proxyOk) {
  Write-Error "Proxy health check failed. Check the proxy window for errors."
  exit 1
}
Write-Host "Proxy health OK." -ForegroundColor Green

# 4) ADB / Emulator sanity
Write-Title "ADB / Emulator Check"
if (Test-Path $adb) {
  & $adb devices -l
} else {
  Write-Warning "ADB not found at expected path: $adb"
}

# 5) End-of-Day Git helper
Write-Title "End-of-Day Git Helper (copy/paste when ready to push)"
@"
Set-Location `"$root`"
git status
git add .
git commit -m `"Daily progress update`"
git push origin main
"@ | Write-Host

# 6) Launch Expo (Android) with local API
Write-Title "Launching Expo (Android)"
$env:EXPO_PUBLIC_API_BASE = "http://10.0.2.2:8787"
npx expo start --android
