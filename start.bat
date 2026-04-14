@echo off
:: Set the working directory to the script's location
pushd %~dp0

echo Starting FitTrack AI...
:: Run the PowerShell script with Bypass policy to avoid permission issues
powershell -ExecutionPolicy Bypass -File start_services.ps1

:: Keep the window open if there's an error
if %errorlevel% neq 0 (
    echo.
    echo Something went wrong. Check the errors above.
    pause
)
popd
