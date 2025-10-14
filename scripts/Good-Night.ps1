param()

function Title($t){ Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Pause($msg="Press Enter to continue..."){ Read-Host $msg | Out-Null }

$ErrorActionPreference = "Stop"
$root    = "C:\Users\Dad\Desktop\ashwood-mobile-starter"
$logsDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

# Helper: stop listeners on a port
function Stop-Port($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host ("Terminated PID {0} on port {1}" -f $procId, $port) -ForegroundColor Yellow
      } catch {
        Write-Warning ("Could not terminate PID {0} on port {1}: {2}" -f $procId, $port, $_.Exception.Message)
      }
    }
  } else {
    Write-Host ("No listener on port {0}" -f $port)
  }
}

# ============= 1) Snapshot health into log ============
Title "Capture quick health snapshot"
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$log   = Join-Path $logsDir ("goodnight-" + $stamp + ".txt")

"Good-Night Snapshot ($stamp)" | Out-File -FilePath $log -Encoding UTF8
"Project root: $root"          | Out-File -FilePath $log -Append
"------------------------------" | Out-File -FilePath $log -Append

function Add-Health($name, $url) {
  try {
    $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3
    "[$name] OK  $url -> $($r.Content)" | Out-File -FilePath $log -Append
  } catch {
    "[$name] ERR $url -> $($_.Exception.Message)" | Out-File -FilePath $log -Append
  }
}

Add-Health "proxy-8787" "http://localhost:8787/health"
Add-Health "proxy-5051" "http://localhost:5051/health"

"------------------------------" | Out-File -FilePath $log -Append
Write-Host "Wrote snapshot: $log" -ForegroundColor Green
Pause

# ============= 2) Git status -> optional commit/push ============
Title "Git status / commit / push"
Set-Location $root
git status

$defaultMsg = "Daily progress update - " + (Get-Date -Format "yyyy-MM-dd")
$msg = Read-Host "Commit message (Enter for default: '$defaultMsg' or type 'skip' to skip commit)"
if ($msg -eq "skip") {
  Write-Host "Skipping commit."
} else {
  if ([string]::IsNullOrWhiteSpace($msg)) { $msg = $defaultMsg }
  git add .
  $commitOutput = git commit -m $msg 2>&1
  if ($LASTEXITCODE -ne 0 -and ($commitOutput -match "nothing to commit")) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
  } else {
    $commitOutput | Write-Host
  }
  Write-Host "Pushing to origin/main..."
  git push origin main
}
Pause

# ============= 3) Stop proxy + Metro (free ports) ============
Title "Stop proxy & Metro (free ports 8787, 5051, 8081)"
Stop-Port 8787
Stop-Port 5051
Stop-Port 8081
Pause

# ============= 4) Optional: kill lingering node.exe ============
Title "Optional: kill lingering node.exe (Metro/CLI)"
$killNodes = Read-Host "Kill all node.exe processes? (y/N)"
if ($killNodes -match '^[Yy]$') {
  $procs = Get-Process node -ErrorAction SilentlyContinue
  if ($procs) {
    $procs | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch {} }
    Write-Host ("Killed {0} node.exe processes" -f $procs.Count) -ForegroundColor Yellow
  } else {
    Write-Host "No node.exe processes found."
  }
} else {
  Write-Host "Skipping node.exe kill."
}
Pause

# ============= 5) Done ============
Title "Good night! Everything is shut down."
Write-Host "Snapshot saved: $log"
Write-Host "You can close the proxy/Expo windows if any remain."
Pause "Press Enter to exit..."