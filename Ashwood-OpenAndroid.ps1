param(
  [string]$AvdName = "Pixel_9"  # change to match -list-avds output
)

$ErrorActionPreference = "Stop"
$proj     = "C:\Users\Dad\Desktop\ashwood-mobile-starter"
$adb      = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$emulator = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"

if (-not (Test-Path $emulator)) { throw "Android emulator not found at $emulator" }
if (-not (Test-Path $adb))      { throw "adb not found at $adb" }

# Start emulator if no device is online
$hasDevice = (& $adb devices) -match "device\s*$" | Measure-Object | Select-Object -ExpandProperty Count
if ($hasDevice -eq 0) {
  Write-Host "Starting Android emulator: $AvdName ..."
  Start-Process $emulator -ArgumentList "-avd `"$AvdName`" -netdelay none -netspeed full"
}

# Wait for device and full boot
& $adb start-server | Out-Null
& $adb wait-for-device
while(((& $adb shell getprop sys.boot_completed) -replace "\s","") -ne "1"){ Start-Sleep -Seconds 2 }
& $adb devices -l

# Open the running Expo dev server on Android
Set-Location $proj
Write-Host "Opening Expo on Android device..."
npx expo start --android
