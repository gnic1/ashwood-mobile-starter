param()
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"

$env:EXPO_PUBLIC_API_BASE = "http://10.0.2.2:8787"
$env:EXPO_DEBUG = "1"

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$log = "logs\expo-$ts.log"
Write-Host "Starting Expo (verbose) with tunnel ... logging to $log"
npx expo start --tunnel --clear 2>&1 | Tee-Object -FilePath $log
