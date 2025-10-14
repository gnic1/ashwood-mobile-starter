param()
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$log = "logs\proxy-$ts.log"
$node = "node"

# Prefer .cjs (CommonJS), then .js
$candidates = @(
  ".\server\server.cjs",
  ".\server\server.js",
  ".\server\mock-server.cjs",
  ".\server.js"
)

$entry = $null
foreach ($c in $candidates) {
  if (Test-Path $c) { $entry = $c; break }
}

if (-not $entry) {
  Write-Error ("No proxy entry found. Looked for: " + ($candidates -join ", "))
  exit 1
}

$env:PORT = "5051"
Write-Host "Starting Proxy on :$($env:PORT) using '$entry' ... logging to $log"
& $node $entry 2>&1 | Tee-Object -FilePath $log
