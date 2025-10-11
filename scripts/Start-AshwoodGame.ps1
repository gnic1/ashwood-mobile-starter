# Start Ashwood & Co (GAME) in tunnel mode with proper ADB reverses
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\Start-AshwoodGame.ps1
$ErrorActionPreference = "Stop"

# Go to project root
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Set-Location ".."

Write-Host "== ADB devices =="
adb devices

Write-Host "`n== ADB reverse common dev ports =="
# Metro / DevServer + legacy Expo ports
$ports = 8081,8082,19000,19001,19002
foreach ($p in $ports) { adb reverse "tcp:$p" "tcp:$p" 2>$null }

# Optional: clear stale caches if previous run failed
# if (Test-Path ".\.expo") { Remove-Item -Recurse -Force ".\.expo" }
# if (Test-Path ".\.cache") { Remove-Item -Recurse -Force ".\.cache" }
# if (Test-Path ".\node_modules\.cache") { Remove-Item -Recurse -Force ".\node_modules\.cache" }

Write-Host "`n== Starting Expo (tunnel). If prompted about port 8082, answer 'Y' =="
npx expo start --tunnel
