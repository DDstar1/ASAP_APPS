@echo off
:: ==========================================
:: Dual Expo Starter for Windows
:: Works with or without Windows Terminal
:: Folder structure:
::   ASAP_APPS/
::     ├── customer_app/
::     └── rider_app/
:: ==========================================

echo Do you want to clear cache before starting? (Y/N)
set /p clear_cache=

if /i "%clear_cache%"=="Y" (
    set cache_flag=--clear
    echo Cache will be cleared...
) else (
    set cache_flag=
    echo Starting without clearing cache...
)

timeout /t 1 /nobreak >nul

:: ✅ Check if Windows Terminal is available
where wt >nul 2>nul
if %errorlevel%==0 (
    echo 🪟 Windows Terminal detected! Launching both apps...
    wt new-tab --title "Customer App" --suppressApplicationTitle cmd /k ^
    "cd /d \"%~dp0customer_app\" && echo 🚀 Starting Customer App on port 8081... && npx expo start --port 8081 %cache_flag%" ^
    ; split-pane -V --title "Rider App" --suppressApplicationTitle cmd /k ^
    "cd /d \"%~dp0rider_app\" && timeout /t 2 /nobreak >nul && echo 🏍️  Starting Rider App on port 8082... && npx expo start --port 8082 %cache_flag%"
) else (
    echo ⚙️  Windows Terminal not found — using classic CMD windows...
    start "Customer App" cmd /k "cd /d \"%~dp0customer_app\" && echo 🚀 Starting Customer App on port 8081... && npx expo start --port 8081 %cache_flag%"
    timeout /t 2 /nobreak >nul
    start "Rider App" cmd /k "cd /d \"%~dp0rider_app\" && echo 🏍️  Starting Rider App on port 8082... && npx expo start --port 8082 %cache_flag%"
)

exit /b
