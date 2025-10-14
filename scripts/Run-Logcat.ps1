param()
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  Write-Error "adb.exe not found at $adb. Install Android platform-tools or update the path in Run-Logcat.ps1."
  exit 1
}

& $adb logcat -c | Out-Null
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$log = "logs\device-$ts.log"
Write-Host "Starting adb logcat (ReactNative/Expo filtered) ... logging to $log"
& $adb logcat ReactNative:V ReactNativeJS:V RNAndroid:V Expo:V *:S | Tee-Object -FilePath $log
