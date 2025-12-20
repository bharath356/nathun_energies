# PowerShell script for starting Call Management System
param(
    [switch]$SkipDependencyCheck
)

# Enable strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Color functions
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Write-Step($message) {
    Write-Host "[STEP] $message" -ForegroundColor Cyan
}

# Global variables for process tracking
$global:ProcessIds = @()
$global:Jobs = @()

# Cleanup function
function Cleanup {
    Write-Info "Shutting down services..."
    
    # Stop background jobs
    foreach ($job in $global:Jobs) {
        if ($job -and $job.State -eq "Running") {
            Stop-Job $job -ErrorAction SilentlyContinue
            Remove-Job $job -ErrorAction SilentlyContinue
        }
    }
    
    # Kill processes by name (more reliable on Windows)
    $processNames = @("node", "npm")
    foreach ($processName in $processNames) {
        Get-Process -Name $processName -ErrorAction SilentlyContinue | 
        Where-Object { $_.ProcessName -eq $processName } | 
        Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    Write-Info "All services stopped."
    exit 0
}

# Register cleanup on Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }
$null = Register-ObjectEvent -InputObject ([Console]) -EventName CancelKeyPress -Action { Cleanup }

try {
    Write-Host "🚀 Starting Call Management System..." -ForegroundColor Blue
    Write-Host "======================================" -ForegroundColor Blue
    Write-Host ""

    # Check if dependencies are installed
    if (-not $SkipDependencyCheck) {
        Write-Step "Checking dependencies..."
        
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing root dependencies..."
            npm install
            if ($LASTEXITCODE -ne 0) { throw "Failed to install root dependencies" }
        }

        if (-not (Test-Path "backend\node_modules")) {
            Write-Info "Installing backend dependencies..."
            Push-Location backend
            try {
                npm install
                if ($LASTEXITCODE -ne 0) { throw "Failed to install backend dependencies" }
            } finally {
                Pop-Location
            }
        }

        if (-not (Test-Path "frontend\node_modules")) {
            Write-Info "Installing frontend dependencies..."
            Push-Location frontend
            try {
                npm install
                if ($LASTEXITCODE -ne 0) { throw "Failed to install frontend dependencies" }
            } finally {
                Pop-Location
            }
        }
    }

    # Start DynamoDB Local
    Write-Step "Starting DynamoDB Local..."
    Push-Location backend

    try {
        # Load environment variables from .env file
        if (Test-Path ".env") {
            Write-Info "Loading environment variables..."
            Get-Content ".env" | ForEach-Object {
                if ($_ -match "^([^#][^=]+)=(.*)$") {
                    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
                }
            }
        }

        # Check if DynamoDB is already installed
        if (-not (Test-Path ".dynamodb") -or -not (Test-Path ".dynamodb\DynamoDBLocal.jar")) {
            Write-Info "Installing DynamoDB Local..."
            npm run dynamodb:install
            if ($LASTEXITCODE -eq 0) {
                Write-Info "✅ DynamoDB Local installed via serverless plugin"
            } else {
                Write-Warning "⚠️ Serverless plugin installation failed, trying manual installation..."
                if (Test-Path "..\install-dynamodb-local.sh") {
                    Write-Warning "Manual installation script found but requires bash/WSL"
                    Write-Warning "Please run install-dynamodb-local.sh manually or install DynamoDB Local"
                } else {
                    Write-Error "❌ Manual installation script not found."
                    Write-Host "Please manually download DynamoDB Local from:" -ForegroundColor Red
                    Write-Host "https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz" -ForegroundColor Red
                    Write-Host "and extract it to the backend\.dynamodb directory." -ForegroundColor Red
                    throw "DynamoDB Local installation failed"
                }
            }
        }

        # Start DynamoDB Local in background
        Write-Info "Starting DynamoDB Local with environment variables..."
        $dynamoJob = Start-Job -ScriptBlock { 
            Set-Location $using:PWD
            npm run dynamodb:start 
        }
        $global:Jobs += $dynamoJob

        # Wait for DynamoDB to start
        Write-Info "Waiting for DynamoDB to start..."
        Start-Sleep -Seconds 15

        # Create DynamoDB tables
        Write-Info "Creating DynamoDB tables..."
        npm run dynamodb:create-tables
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Warning: Error creating main tables"
        }

        # Create Client Management DynamoDB tables
        Write-Info "Creating Client Management DynamoDB tables..."
        node create-client-tables.js
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Warning: Error creating client tables"
        }

        # Create Client step tables
        Write-Info "Creating Client step tables..."
        @("create-step1-table.js", "create-step2-table.js", "create-step3-table.js", "create-step4-table.js", "create-step5-table.js") | ForEach-Object {
            node $_
        }

        # Seed data into DynamoDB tables
        Write-Info "Seeding data into DynamoDB tables..."
        node seed-data.js
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Warning: Error seeding main data"
        }

        # Seed Client Management data
        Write-Info "Seeding Client Management data..."
        node seed-client-data.js
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Warning: Error seeding client data"
        }

        # Start Backend (Express.js) in background
        Write-Info "Starting Backend API (Express.js)..."
        $backendJob = Start-Job -ScriptBlock { 
            Set-Location $using:PWD
            npm run express:dev 
        }
        $global:Jobs += $backendJob

    } finally {
        Pop-Location
    }

    # Start Frontend in background
    Write-Info "Starting Frontend..."
    Push-Location frontend
    try {
        $frontendJob = Start-Job -ScriptBlock { 
            Set-Location $using:PWD
            npm start 
        }
        $global:Jobs += $frontendJob
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "All services started!" -ForegroundColor Green
    Write-Host "- DynamoDB Local: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "- Backend API: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ System Features Available:" -ForegroundColor Green
    Write-Host "   • Call Management (Users, Phone Numbers, Calls, Follow-ups)"
    Write-Host "   • Client Workflow Management (5-Step Process)"
    Write-Host "   • Interactive Workflow Stepper with Sub-steps"
    Write-Host "   • Document and Form Data Management"
    Write-Host ""
    Write-Host "🔑 Demo Login Credentials:" -ForegroundColor Yellow
    Write-Host "   Admin: admin@example.com / password"
    Write-Host "   Caller: caller1@example.com / password"
    Write-Host ""
    Write-Host "📋 Sample Data Loaded:" -ForegroundColor Blue
    Write-Host "   • 5 Sample clients with different workflow states"
    Write-Host "   • Complete 5-step workflow process"
    Write-Host "   • Sub-steps for Dispatch Process (Step 3)"
    Write-Host "   • Sample documents and form data"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Magenta
    Write-Host ""

    # Keep the script running and monitor jobs
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if any jobs have failed
        $failedJobs = $global:Jobs | Where-Object { $_.State -eq "Failed" }
        if ($failedJobs) {
            Write-Warning "Some services have failed. Check the logs."
            foreach ($job in $failedJobs) {
                Write-Host "Failed job output:" -ForegroundColor Red
                Receive-Job $job
            }
        }
    }

} catch {
    Write-Error "An error occurred: $_"
    Cleanup
    exit 1
}
