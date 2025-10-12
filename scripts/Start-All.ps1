# Starts the proxy (port 8787) and Expo (tunnel) for Ashwood & Co (GAME)
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\Start-All.ps1
$ErrorActionPreference = "Stop"

# Open proxy in new window
$proxy = "Set-Location `"`"C:\Users\Dad\Desktop\ashwood-mobile-starter\server`"`"; npm run start"
Start-Process powershell -ArgumentList "-NoExit","-Command",$proxy

# Give proxy a moment
Start-Sleep -Seconds 1

# Ensure emulator can reach host ports
$ports = 8787,8081,8082,19000,19001,19002
foreach ($p in $ports) { adb reverse tcp:$p tcp:$p 2>$null }

# Start Expo (Tunnel). If prompted "Use port 8082?" → Y, then press 'a' to open Android.
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"
npx expo start --tunnel
