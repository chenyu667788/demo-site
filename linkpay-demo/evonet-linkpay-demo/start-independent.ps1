# Evonet LinkPay Demo - Independent Startup Script
# This script ensures the project runs in isolation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Evonet LinkPay Demo - Independent Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is available
Write-Host "Checking port 3000 availability..." -ForegroundColor Yellow
$portInUse = netstat -ano | Select-String ":3000\s+LISTENING"
if ($portInUse) {
    Write-Host "Port 3000 is in use. Attempting to free it..." -ForegroundColor Yellow
    $processId = ($portInUse -split '\s+')[-1]
    try {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "Successfully terminated process $processId" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Failed to terminate process $processId. Please close it manually." -ForegroundColor Red
        Read-Host "Press Enter to continue anyway"
    }
}

# Navigate to script directory
Set-Location $PSScriptRoot

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start the server
Write-Host ""
Write-Host "Starting Evonet LinkPay Demo Server..." -ForegroundColor Green
Write-Host "Server will run on http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

node server.js

Read-Host "Press Enter to exit"
