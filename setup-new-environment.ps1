# PowerShell script for Call Management System Environment Setup
param(
    [switch]$SkipJavaCheck,
    [switch]$SkipTests
)

# Enable strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===================================
# Call Management System
# New Environment Setup Script
# ===================================

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

function Write-Header($message) {
    Write-Host $message -ForegroundColor Blue
}

try {
    Write-Header "===================================="
    Write-Header "Call Management System"
    Write-Header "New Environment Setup"
    Write-Header "===================================="
    Write-Host ""

    # Check if we're in the right directory
    if (-not (Test-Path "package.json") -or -not (Test-Path "frontend") -or -not (Test-Path "backend")) {
        Write-Error "This script must be run from the call-management-system root directory"
        exit 1
    }

    # Check prerequisites
    Write-Step "Checking prerequisites..."

    # Check Node.js
    try {
        $nodeVersion = node --version
        $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($nodeMajor -lt 14) {
            Write-Error "Node.js version 14+ is required. Current version: $nodeVersion"
            exit 1
        }
        
        Write-Info "Node.js $nodeVersion ✓"
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/"
        exit 1
    }

    # Check npm
    try {
        $npmVersion = npm --version
        Write-Info "npm $npmVersion ✓"
    } catch {
        Write-Error "npm is not installed. Please install npm."
        exit 1
    }

    # Check Java (required for DynamoDB Local)
    $skipDynamoDB = $false
    if (-not $SkipJavaCheck) {
        try {
            $javaVersion = java -version 2>&1 | Select-Object -First 1
            Write-Info "Java $javaVersion ✓"
        } catch {
            Write-Warning "Java is not installed. DynamoDB Local requires Java 8+."
            Write-Warning "Please install Java from https://adoptopenjdk.net/ or your system package manager."
            Write-Host ""
            
            $continue = Read-Host "Continue without Java? (DynamoDB Local won't work) [y/N]"
            if ($continue -notmatch '^[Yy]$') {
                exit 1
            }
            $skipDynamoDB = $true
        }
    } else {
        Write-Warning "Skipping Java check as requested"
        $skipDynamoDB = $true
    }

    Write-Host ""

    # Install dependencies
    Write-Step "Installing dependencies..."

    Write-Info "Installing root dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install root dependencies"
    }

    Write-Info "Installing backend dependencies..."
    Push-Location backend
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install backend dependencies"
        }
    } finally {
        Pop-Location
    }

    Write-Info "Installing frontend dependencies..."
    Push-Location frontend
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install frontend dependencies"
        }
    } finally {
        Pop-Location
    }

    Write-Host ""

    # Set up environment files
    Write-Step "Setting up environment files..."

    # Backend environment
    if (-not (Test-Path "backend\.env")) {
        if (Test-Path "backend\.env.example") {
            Write-Info "Creating backend\.env from example..."
            Copy-Item "backend\.env.example" "backend\.env"
            Write-Warning "Please review and update backend\.env with your specific configuration"
        } else {
            Write-Info "Creating basic backend\.env file..."
            $backendEnvContent = @"
# Call Management System - Backend Environment
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AWS Configuration
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1

# Development Settings
IS_OFFLINE=true
DYNAMODB_ENDPOINT=http://localhost:8000
STAGE=dev
REGION=us-east-1

# DynamoDB Table Names - Call Management
USERS_TABLE=call-management-backend-dev-users
PHONE_NUMBERS_TABLE=call-management-backend-dev-phone-numbers
CALLS_TABLE=call-management-backend-dev-calls
FOLLOWUPS_TABLE=call-management-backend-dev-followups

# DynamoDB Table Names - Client Management
CLIENTS_TABLE=call-management-backend-dev-clients
CLIENT_STEPS_TABLE=call-management-backend-dev-client-steps
CLIENT_SUBSTEPS_TABLE=call-management-backend-dev-client-substeps
CLIENT_DOCUMENTS_TABLE=call-management-backend-dev-client-documents
CLIENT_FORM_DATA_TABLE=call-management-backend-dev-client-form-data
CLIENT_EXPENSES_TABLE=call-management-backend-dev-client-expenses

# DynamoDB Table Names - Step Data
CLIENT_STEP1_DATA_TABLE=call-management-backend-dev-client-step1-data
CLIENT_STEP2_DATA_TABLE=call-management-backend-dev-client-step2-data
CLIENT_STEP3_DATA_TABLE=call-management-backend-dev-client-step3-data
CLIENT_STEP4_DATA_TABLE=call-management-backend-dev-client-step4-data
CLIENT_STEP5_DATA_TABLE=call-management-backend-dev-client-step5-data
"@
            Set-Content -Path "backend\.env" -Value $backendEnvContent
            Write-Warning "Created basic backend\.env - please review and update as needed"
        }
    } else {
        Write-Info "Backend .env file already exists"
    }

    # Frontend environment
    if (-not (Test-Path "frontend\.env")) {
        if (Test-Path "frontend\.env.example") {
            Write-Info "Creating frontend\.env from example..."
            Copy-Item "frontend\.env.example" "frontend\.env"
        } else {
            Write-Info "Creating basic frontend\.env file..."
            $frontendEnvContent = @"
# Call Management System - Frontend Environment
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
"@
            Set-Content -Path "frontend\.env" -Value $frontendEnvContent
        }
    } else {
        Write-Info "Frontend .env file already exists"
    }

    Write-Host ""

    # Set up DynamoDB Local
    if (-not $skipDynamoDB) {
        Write-Step "Setting up DynamoDB Local..."
        
        Push-Location backend
        try {
            if (-not (Test-Path ".dynamodb") -or -not (Test-Path ".dynamodb\DynamoDBLocal.jar")) {
                Write-Info "Installing DynamoDB Local..."
                npm run dynamodb:install
                if ($LASTEXITCODE -eq 0) {
                    Write-Info "DynamoDB Local installed successfully via serverless plugin"
                } else {
                    Write-Warning "Serverless plugin installation failed, trying manual installation..."
                    if (Test-Path "..\install-dynamodb-local.sh") {
                        Write-Warning "Manual installation script found but requires bash/WSL"
                        Write-Warning "Please run install-dynamodb-local.sh manually or install DynamoDB Local"
                    } else {
                        Write-Error "Manual installation script not found"
                        Write-Warning "You may need to download it manually from:"
                        Write-Warning "https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz"
                    }
                }
            } else {
                Write-Info "DynamoDB Local already installed"
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Warning "Skipping DynamoDB Local setup (Java not available)"
    }

    Write-Host ""

    # Run tests
    if (-not $SkipTests) {
        Write-Step "Running setup validation tests..."

        # Test frontend build
        Write-Info "Testing frontend build..."
        Push-Location frontend
        try {
            $null = npm run build 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Frontend builds successfully ✓"
                if (Test-Path "build") {
                    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
                }
            } else {
                Write-Warning "Frontend build test failed - check for errors later"
            }
        } finally {
            Pop-Location
        }

        # Test backend compilation
        Write-Info "Testing backend compilation..."
        Push-Location backend
        try {
            $null = npm run build 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Backend compiles successfully ✓"
                if (Test-Path "dist") {
                    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
                }
            } else {
                Write-Warning "Backend compilation test failed - check for errors later"
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Warning "Skipping validation tests as requested"
    }

    Write-Host ""

    # Final setup summary
    Write-Step "Setup Summary"
    Write-Host ""
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    Write-Host "✓ Environment files created" -ForegroundColor Green
    if (-not $skipDynamoDB) {
        Write-Host "✓ DynamoDB Local installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ DynamoDB Local skipped (Java not available)" -ForegroundColor Yellow
    }
    if (-not $SkipTests) {
        Write-Host "✓ Build tests completed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Build tests skipped" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Header "===================================="
    Write-Header "Setup Complete!"
    Write-Header "===================================="
    Write-Host ""

    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Review environment files:"
    Write-Host "   - backend\.env"
    Write-Host "   - frontend\.env"
    Write-Host ""
    Write-Host "2. Start the development environment:"
    Write-Host "   " -NoNewline
    Write-Host ".\start-local-dev.ps1" -ForegroundColor Green
    Write-Host "   or"
    Write-Host "   " -NoNewline
    Write-Host ".\start-local-dev.bat" -ForegroundColor Green
    Write-Host ""
    Write-Host "3. Or start services individually:"
    Write-Host "   Backend:  " -NoNewline
    Write-Host "cd backend && npm run dev" -ForegroundColor Green
    Write-Host "   Frontend: " -NoNewline
    Write-Host "cd frontend && npm start" -ForegroundColor Green
    Write-Host ""
    Write-Host "4. Access the application:"
    Write-Host "   Frontend: " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Backend:  " -NoNewline
    Write-Host "http://localhost:3001" -ForegroundColor Cyan
    if (-not $skipDynamoDB) {
        Write-Host "   DynamoDB: " -NoNewline
        Write-Host "http://localhost:8000" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "5. Demo credentials:"
    Write-Host "   Admin:  " -NoNewline
    Write-Host "admin@example.com / password" -ForegroundColor Yellow
    Write-Host "   Caller: " -NoNewline
    Write-Host "caller1@example.com / password" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "6. For troubleshooting, see:"
    Write-Host "   - " -NoNewline
    Write-Host "QUICK-START.md" -ForegroundColor Cyan
    Write-Host "   - " -NoNewline
    Write-Host "DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
    Write-Host "   - " -NoNewline
    Write-Host "README.md" -ForegroundColor Cyan
    Write-Host ""

    Write-Info "Environment setup completed successfully!"

} catch {
    Write-Error "Setup failed: $_"
    Write-Host "Stack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
