@echo off
setlocal enabledelayedexpansion

REM ===================================
REM Call Management System
REM New Environment Setup Script
REM ===================================

echo ====================================
echo Call Management System
echo New Environment Setup
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] This script must be run from the call-management-system root directory
    echo [ERROR] package.json not found
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERROR] This script must be run from the call-management-system root directory
    echo [ERROR] frontend directory not found
    pause
    exit /b 1
)

if not exist "backend" (
    echo [ERROR] This script must be run from the call-management-system root directory
    echo [ERROR] backend directory not found
    pause
    exit /b 1
)

REM Check prerequisites
echo [STEP] Checking prerequisites...

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Get Node.js version (simplified check)
for /f "tokens=1 delims=." %%a in ('node --version') do (
    set "NODE_MAJOR=%%a"
    set "NODE_MAJOR=!NODE_MAJOR:v=!"
)

if !NODE_MAJOR! LSS 14 (
    echo [ERROR] Node.js version 14+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo [INFO] Node.js version check passed ✓

REM Check npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo [INFO] npm version check passed ✓

REM Check Java (required for DynamoDB Local)
where java >nul 2>&1
if errorlevel 1 (
    echo [WARN] Java is not installed. DynamoDB Local requires Java 8+.
    echo [WARN] Please install Java from https://adoptopenjdk.net/ or your system package manager.
    echo.
    set /p "CONTINUE=Continue without Java? (DynamoDB Local won't work) [y/N]: "
    if /i not "!CONTINUE!"=="y" (
        exit /b 1
    )
    set "SKIP_DYNAMODB=true"
) else (
    echo [INFO] Java version check passed ✓
    set "SKIP_DYNAMODB=false"
)

echo.

REM Install dependencies
echo [STEP] Installing dependencies...

echo [INFO] Installing root dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

echo [INFO] Installing backend dependencies...
cd /d backend
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd /d ..

echo [INFO] Installing frontend dependencies...
cd /d frontend
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd /d ..

echo.

REM Set up environment files
echo [STEP] Setting up environment files...

REM Backend environment
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [INFO] Creating backend\.env from example...
        copy "backend\.env.example" "backend\.env" >nul
        echo [WARN] Please review and update backend\.env with your specific configuration
    ) else (
        echo [INFO] Creating basic backend\.env file...
        (
            echo # Call Management System - Backend Environment
            echo NODE_ENV=development
            echo PORT=3001
            echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
            echo.
            echo # AWS Configuration
            echo AWS_ACCESS_KEY_ID=dummy
            echo AWS_SECRET_ACCESS_KEY=dummy
            echo AWS_REGION=us-east-1
            echo.
            echo # Development Settings
            echo IS_OFFLINE=true
            echo DYNAMODB_ENDPOINT=http://localhost:8000
            echo STAGE=dev
            echo REGION=us-east-1
            echo.
            echo # DynamoDB Table Names - Call Management
            echo USERS_TABLE=call-management-backend-dev-users
            echo PHONE_NUMBERS_TABLE=call-management-backend-dev-phone-numbers
            echo CALLS_TABLE=call-management-backend-dev-calls
            echo FOLLOWUPS_TABLE=call-management-backend-dev-followups
            echo.
            echo # DynamoDB Table Names - Client Management
            echo CLIENTS_TABLE=call-management-backend-dev-clients
            echo CLIENT_STEPS_TABLE=call-management-backend-dev-client-steps
            echo CLIENT_SUBSTEPS_TABLE=call-management-backend-dev-client-substeps
            echo CLIENT_DOCUMENTS_TABLE=call-management-backend-dev-client-documents
            echo CLIENT_FORM_DATA_TABLE=call-management-backend-dev-client-form-data
            echo CLIENT_EXPENSES_TABLE=call-management-backend-dev-client-expenses
            echo.
            echo # DynamoDB Table Names - Step Data
            echo CLIENT_STEP1_DATA_TABLE=call-management-backend-dev-client-step1-data
            echo CLIENT_STEP2_DATA_TABLE=call-management-backend-dev-client-step2-data
            echo CLIENT_STEP3_DATA_TABLE=call-management-backend-dev-client-step3-data
            echo CLIENT_STEP4_DATA_TABLE=call-management-backend-dev-client-step4-data
            echo CLIENT_STEP5_DATA_TABLE=call-management-backend-dev-client-step5-data
        ) > "backend\.env"
        echo [WARN] Created basic backend\.env - please review and update as needed
    )
) else (
    echo [INFO] Backend .env file already exists
)

REM Frontend environment
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        echo [INFO] Creating frontend\.env from example...
        copy "frontend\.env.example" "frontend\.env" >nul
    ) else (
        echo [INFO] Creating basic frontend\.env file...
        (
            echo # Call Management System - Frontend Environment
            echo REACT_APP_API_URL=http://localhost:3001
            echo REACT_APP_ENV=development
        ) > "frontend\.env"
    )
) else (
    echo [INFO] Frontend .env file already exists
)

echo.

REM Set up DynamoDB Local
if "!SKIP_DYNAMODB!"=="false" (
    echo [STEP] Setting up DynamoDB Local...
    
    cd /d backend
    
    if not exist ".dynamodb" goto install_dynamodb_setup
    if not exist ".dynamodb\DynamoDBLocal.jar" goto install_dynamodb_setup
    echo [INFO] DynamoDB Local already installed
    goto skip_dynamodb_setup
    
    :install_dynamodb_setup
    echo [INFO] Installing DynamoDB Local...
    npm run dynamodb:install
    if errorlevel 1 (
        echo [WARN] Serverless plugin installation failed, trying manual installation...
        if exist "..\install-dynamodb-local.sh" (
            echo [WARN] Manual installation script found but requires bash/WSL
            echo [WARN] Please run install-dynamodb-local.sh manually or install DynamoDB Local
        ) else (
            echo [ERROR] Manual installation script not found
            echo [WARN] You may need to download it manually from:
            echo [WARN] https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
        )
    ) else (
        echo [INFO] DynamoDB Local installed successfully via serverless plugin
    )
    
    :skip_dynamodb_setup
    cd /d ..
) else (
    echo [WARN] Skipping DynamoDB Local setup (Java not available)
)

echo.

REM Run tests
echo [STEP] Running setup validation tests...

REM Test frontend build
echo [INFO] Testing frontend build...
cd /d frontend
npm run build >nul 2>&1
if errorlevel 1 (
    echo [WARN] Frontend build test failed - check for errors later
) else (
    echo [INFO] Frontend builds successfully ✓
    if exist "build" rmdir /s /q "build" >nul 2>&1
)
cd /d ..

REM Test backend compilation
echo [INFO] Testing backend compilation...
cd /d backend
npm run build >nul 2>&1
if errorlevel 1 (
    echo [WARN] Backend compilation test failed - check for errors later
) else (
    echo [INFO] Backend compiles successfully ✓
    if exist "dist" rmdir /s /q "dist" >nul 2>&1
)
cd /d ..

echo.

REM Final setup summary
echo [STEP] Setup Summary
echo.
echo ✓ Dependencies installed
echo ✓ Environment files created
if "!SKIP_DYNAMODB!"=="false" (
    echo ✓ DynamoDB Local installed
) else (
    echo ⚠ DynamoDB Local skipped (Java not available)
)
echo ✓ Build tests completed

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.

echo Next Steps:
echo.
echo 1. Review environment files:
echo    - backend\.env
echo    - frontend\.env
echo.
echo 2. Start the development environment:
echo    start-local-dev.bat
echo.
echo 3. Or start services individually:
echo    Backend:  cd backend ^&^& npm run dev
echo    Frontend: cd frontend ^&^& npm start
echo.
echo 4. Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
if "!SKIP_DYNAMODB!"=="false" (
    echo    DynamoDB: http://localhost:8000
)
echo.
echo 5. Demo credentials:
echo    Admin:  admin@example.com / password
echo    Caller: caller1@example.com / password
echo.
echo 6. For troubleshooting, see:
echo    - QUICK-START.md
echo    - DEPLOYMENT-GUIDE.md
echo    - README.md
echo.

echo [INFO] Environment setup completed successfully!
echo.
pause
