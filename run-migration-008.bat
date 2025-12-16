@echo off
echo ========================================
echo Running Search Optimization Migration
echo ========================================
echo.

REM Read database credentials from .env
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if "%%a"=="DATABASE_HOST" set DB_HOST=%%b
    if "%%a"=="DATABASE_PORT" set DB_PORT=%%b
    if "%%a"=="DATABASE_USERNAME" set DB_USERNAME=%%b
    if "%%a"=="DATABASE_PASSWORD" set DB_PASSWORD=%%b
    if "%%a"=="DATABASE_NAME" set DB_DATABASE=%%b
)

echo Database: %DB_DATABASE%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USERNAME%
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql command not found!
    echo Please install PostgreSQL and add to PATH
    echo.
    echo Or run migration manually:
    echo psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -f migrations\008_add_search_optimization.sql
    pause
    exit /b 1
)

echo Running migration...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -f migrations\008_add_search_optimization.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Migration failed!
    echo ========================================
    echo Please check error messages above.
    pause
    exit /b 1
)

echo.
echo Done! Restart backend if running.
pause
