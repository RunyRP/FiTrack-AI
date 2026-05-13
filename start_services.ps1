# FitTrack AI - Startup Script

Write-Host "--- Starting FitTrack AI Services ---" -ForegroundColor Cyan

# 1. Cleanup existing processes
Write-Host "[1/4] Cleaning up old processes..."
Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue

# Kill any existing uvicorn or vite processes more surgically
Get-CimInstance Win32_Process | Where-Object { 
    ($_.Name -eq "python.exe" -and $_.CommandLine -like "*uvicorn*") -or 
    ($_.Name -eq "node.exe" -and $_.CommandLine -like "*vite*") 
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# 2. Start Backend in a new window
Write-Host "[2/4] Launching Backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-Command", "cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Wait for backend to initialize
Start-Sleep -Seconds 2

# 3. Start Frontend in a new window
Write-Host "[3/4] Launching Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-Command", "cd frontend; npm run dev"

# 4. Start ngrok in a new window
Write-Host "[4/4] Launching ngrok with static domain..." -ForegroundColor Green
$ngrokPath = "C:\Users\Runy\Desktop\ngrok.exe"
$domain = "unconservative-nonadjudicatively-kathlyn.ngrok-free.dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$ngrokPath' http --domain=$domain 8000"

Write-Host "`nReady! All services are starting." -ForegroundColor Cyan
Write-Host "Public URL:    https://$domain"
Write-Host "Local Backend:  http://localhost:8000"
Write-Host "Local Frontend: http://localhost:5173"
