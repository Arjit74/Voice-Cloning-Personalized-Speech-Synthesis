# Voice Cloning - Full Stack Startup Script
# This script starts both the backend API server and frontend dev server

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Voice Cloning - Full Stack Application Startup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend API Server in a new window
Write-Host "[1/2] Starting Backend API Server (Port 5000)..." -ForegroundColor Yellow
$backendPath = $scriptDir
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend API Server' -ForegroundColor Green; python api_server.py"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend Dev Server in a new window
Write-Host "[2/2] Starting Frontend Dev Server (Port 8080)..." -ForegroundColor Yellow
$frontendPath = Join-Path $scriptDir "Frontend Voice Cloning"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Dev Server' -ForegroundColor Green; npm run dev"

# Wait a bit for frontend to start
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Both servers are starting up!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:   http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend UI:   http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Application is ready!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the servers:" -ForegroundColor Yellow
Write-Host "  - Close the Backend and Frontend terminal windows" -ForegroundColor Gray
Write-Host "  - Or press Ctrl+C in each window" -ForegroundColor Gray
Write-Host ""
