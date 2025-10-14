param()
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"

Write-Host "Launching consoles: Proxy, Expo, Logcat ..."
Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy Bypass","-File `".\scripts\Run-Proxy.ps1`""
Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy Bypass","-File `".\scripts\Run-Expo.ps1`""
Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy Bypass","-File `".\scripts\Run-Logcat.ps1`""

Write-Host "Started. Logs will be written to .\logs\*.log"
