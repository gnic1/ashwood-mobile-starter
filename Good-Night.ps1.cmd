# ============================================
# Location: C:\Users\Dad\Desktop\ashwood-mobile-starter\scripts\Good-Night.ps1
# Purpose:  Cleanly shut down Ashwood & Co. dev environment and prep for next day
# ============================================

Write-Host "🕯️ Shutting down Ashwood & Co. environment..." -ForegroundColor Yellow

# --- Step 1: Stop running Node/Expo processes ---
Write-Host "Stopping Node and Expo processes..." -ForegroundColor DarkCyan
Get-Process -Name node, expo -ErrorAction SilentlyContinue | Stop-Process -Force

# --- Step 2: Commit and push latest changes to GitHub ---
Set-Location "C:\Users\Dad\Desktop\ashwood-mobile-starter"
Write-Host "Committing and pushing to GitHub..." -ForegroundColor DarkCyan

git add .
$commitMessage = "Good Night Commit - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m "$commitMessage"
git push origin main

# --- Step 3: Confirm clean state ---
Write-Host "`n✅ Environment saved and shut down successfully."
Write-Host "💤 You’re all set for tomorrow!"
