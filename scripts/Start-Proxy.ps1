param(
  [switch]$NoLog
)

$ErrorActionPreference = "Continue"

$root  = "C:\Users\Dad\Desktop\ashwood-mobile-starter"
Set-Location $root

# Free port 8787 if something is listening
try {
  $conns = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction Stop
  foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch {}
  }
} catch {}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log   = Join-Path $root "logs\proxy-$stamp.log"

Write-Host "=== ASHWOOD PROXY LAUNCHER ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "Log : $log"
Write-Host "================================`n"

# Start the proxy and keep this window open afterward
if ($NoLog) {
  node proxy\server.js
} else {
  node proxy\server.js *>&1 | Tee-Object -FilePath $log
}

Write-Host "`nProxy stopped."
Write-Host "If it crashed, check the log:"
Write-Host $log -ForegroundColor Yellow
Read-Host "Press Enter to close window"
