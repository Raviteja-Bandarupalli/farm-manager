# FarmManager deploy script - run in PowerShell
# Usage: .\scripts\deploy.ps1

Set-Location $PSScriptRoot\..

Write-Host "=== FarmManager Deploy ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Git status..." -ForegroundColor Yellow
git status --short
Write-Host ""

Write-Host "2. Pushing to origin main..." -ForegroundColor Yellow
$push = git push origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Trying pull then push..." -ForegroundColor Yellow
    git pull origin main --no-edit
    git push origin main
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push rejected. Try: git push --force-with-lease origin main" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Done. Check Vercel Deployments:" -ForegroundColor Green
Write-Host "   https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   Live: https://poultry-farm.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "4. Test: Login -> Sales -> Add row -> Refresh (Supabase persist)" -ForegroundColor Green
