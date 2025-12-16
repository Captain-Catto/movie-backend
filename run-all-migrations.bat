@echo off
echo ========================================
echo Running All Pending Migrations
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
    pause
    exit /b 1
)

set PGPASSWORD=%DB_PASSWORD%

echo ========================================
echo Migration 008: Search Optimization
echo ========================================
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -f migrations\008_add_search_optimization.sql
if %ERRORLEVEL% NEQ 0 (
    echo Migration 008 failed!
    pause
    exit /b 1
)
echo Migration 008 completed successfully!
echo.

echo ========================================
echo Migration 009: Performance Indexes
echo ========================================
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -f migrations\009_add_performance_indexes.sql
if %ERRORLEVEL% NEQ 0 (
    echo Migration 009 failed!
    pause
    exit /b 1
)
echo Migration 009 completed successfully!
echo.

echo ========================================
echo All migrations completed successfully!
echo ========================================
echo.
echo Restart backend to apply changes.
pause
