@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Call Management System...
echo ======================================

REM Check if dependencies are installed
echo 📦 Checking dependencies...
if not exist "node_modules" (
  echo Installing root dependencies...
  npm install
  if errorlevel 1 (
    echo Error installing root dependencies
    pause
    exit /b 1
  )
)

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  cd /d backend
  npm install
  if errorlevel 1 (
    echo Error installing backend dependencies
    pause
    exit /b 1
  )
  cd /d ..
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  cd /d frontend
  npm install
  if errorlevel 1 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
  )
  cd /d ..
)

REM Start DynamoDB Local
echo 🗄️ Starting DynamoDB Local...
cd /d backend

REM Load environment variables from .env file
if exist .env (
  echo Loading environment variables...
  for /f "usebackq tokens=1,2 delims==" %%a in (.env) do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" if not "!line!"=="" (
      set "%%a=%%b"
    )
  )
)

REM Check if DynamoDB is already installed
if not exist ".dynamodb" goto install_dynamodb
if not exist ".dynamodb\DynamoDBLocal.jar" goto install_dynamodb
goto start_dynamodb

:install_dynamodb
echo Installing DynamoDB Local...
npm run dynamodb:install
if errorlevel 1 (
  echo ⚠️ Serverless plugin installation failed, trying manual installation...
  if exist "..\install-dynamodb-local.sh" (
    echo Manual installation script found but requires bash
    echo Please run install-dynamodb-local.sh manually or install DynamoDB Local
  ) else (
    echo ❌ Manual installation script not found.
    echo Please manually download DynamoDB Local from:
    echo https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
    echo and extract it to the backend\.dynamodb directory.
    pause
    exit /b 1
  )
) else (
  echo ✅ DynamoDB Local installed via serverless plugin
)

:start_dynamodb
REM Start DynamoDB Local in background
echo Starting DynamoDB Local with environment variables...
start /B npm run dynamodb:start

REM Wait for DynamoDB to start
echo Waiting for DynamoDB to start...
timeout /t 15 /nobreak >nul

REM Create DynamoDB tables
echo Creating DynamoDB tables...
npm run dynamodb:create-tables
if errorlevel 1 (
  echo Warning: Error creating main tables
)

REM Create Client Management DynamoDB tables
echo Creating Client Management DynamoDB tables...
node create-client-tables.js
if errorlevel 1 (
  echo Warning: Error creating client tables
)

REM Create Client step tables
echo Creating Client step tables...
node create-step1-table.js
node create-step2-table.js
node create-step3-table.js
node create-step4-table.js
node create-step5-table.js

REM Seed data into DynamoDB tables
echo Seeding data into DynamoDB tables...
node seed-data.js
if errorlevel 1 (
  echo Warning: Error seeding main data
)

REM Seed Client Management data
echo Seeding Client Management data...
node seed-client-data.js
if errorlevel 1 (
  echo Warning: Error seeding client data
)

REM Start Backend (Express.js) in background
echo Starting Backend API (Express.js)...
start /B npm run express:dev

REM Start Frontend in background
echo Starting Frontend...
cd /d ..\frontend
start /B npm start

echo.
echo All services started!
echo - DynamoDB Local: http://localhost:8000
echo - Backend API: http://localhost:3001
echo - Frontend: http://localhost:3000
echo.
echo ✅ System Features Available:
echo    • Call Management (Users, Phone Numbers, Calls, Follow-ups)
echo    • Client Workflow Management (5-Step Process)
echo    • Interactive Workflow Stepper with Sub-steps
echo    • Document and Form Data Management
echo.
echo 🔑 Demo Login Credentials:
echo    Admin: admin@example.com / password
echo    Caller: caller1@example.com / password
echo.
echo 📋 Sample Data Loaded:
echo    • 5 Sample clients with different workflow states
echo    • Complete 5-step workflow process
echo    • Sub-steps for Dispatch Process (Step 3)
echo    • Sample documents and form data
echo.
echo Press Ctrl+C to stop all services.
echo.

REM Keep the script running
pause
