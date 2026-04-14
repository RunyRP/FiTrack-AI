# FitTrack AI - Startup Script

Write-Host "--- Starting FitTrack AI Services ---" -ForegroundColor Cyan

# 1. Cleanup existing processes
Write-Host "[1/3] Cleaning up old processes..."
Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue
# Find and stop python processes running uvicorn
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*uvicorn*" -or $_.ProcessName -eq "python" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Start Backend in a new window
Write-Host "[2/3] Launching Backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Wait for backend to initialize
Start-Sleep -Seconds 2

# 3. Start ngrok in a new window
Write-Host "[3/3] Launching ngrok with static domain..." -ForegroundColor Green
$ngrokPath = "C:\Users\Runy\Desktop\ngrok.exe"
$domain = "unconservative-nonadjudicatively-kathlyn.ngrok-free.dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$ngrokPath' http --domain=$domain 8000"

Write-Host "`nReady! You can now use your Vercel app." -ForegroundColor Cyan
Write-Host "Public URL: https://$domain"
Write-Host "Backend:    http://localhost:8000"
