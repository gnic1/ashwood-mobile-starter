# === Ashwood & Co — One-paste run script (Android, Dev Client, with 8787 proxy) ===
# 1) Kills stray Metro/Node
# 2) Starts Metro (Dev Client, localhost, clean cache) in a NEW PowerShell window
# 3) Ensures ADB reverse port mappings (8081/8082/19000-19002/8787)
# 4) Verifies a device/emulator is connected
# 5) Launches your Dev Client on the emulator
# Note: if you're using the local AI proxy, make sure it's running first:
#   cd "C:\Users\Dad\Desktop\ashwood-mobile-starter\server"; node index.js

$ROOT    = "C:\Users\Dad\Desktop\ashwood-mobile-starter"
$PKG     = "com.ashwoodco.ashwoodmobile"
$ADBPATH = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $ADBPATH)) { $ADBPATH = "adb" }

Write-Host "`n[1/5] Killing stray Metro/Node..." -ForegroundColor Cyan
taskkill /IM node.exe /F 2>$null | Out-Null

Write-Host "[2/5] Starting Metro (Dev Client, localhost, clean cache) in a new window..." -ForegroundColor Cyan
$cmd = "cd `"$ROOT`"; npx expo start --localhost --dev-client -c"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$cmd | Out-Null

Start-Sleep -Seconds 2

Write-Host "[3/5] Ensuring ADB reverse port mappings (8081, 8082, 19000-19002, 8787)..." -ForegroundColor Cyan
& $ADBPATH start-server 2>$null | Out-Null
& $ADBPATH reverse --remove-all 2>$null
& $ADBPATH reverse tcp:8081  tcp:8081
& $ADBPATH reverse tcp:8082  tcp:8082
& $ADBPATH reverse tcp:19000 tcp:19000
& $ADBPATH reverse tcp:19001 tcp:19001
& $ADBPATH reverse tcp:19002 tcp:19002
& $ADBPATH reverse tcp:8787  tcp:8787   # local AI proxy

Write-Host "[4/5] Checking for a connected device/emulator..." -ForegroundColor Cyan
$devices = & $ADBPATH devices | Where-Object {$_ -match "device$"}
if ($devices.Count -lt 1) {
  Write-Host "No Android device/emulator detected. Please start your emulator, then press Enter..." -ForegroundColor Yellow
  Read-Host | Out-Null
}

Write-Host "[5/5] Launching the Ashwood Dev Client..." -ForegroundColor Cyan
& $ADBPATH shell monkey -p $PKG 1 2>$null | Out-Null

Write-Host "`n✅ If Metro shows 'Connected', your app should be running."
Write-Host "   If it didn't open, verify the emulator is on, then re-run this script." -ForegroundColor Green
