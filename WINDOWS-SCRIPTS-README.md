# Windows Scripts for Call Management System

This document provides information about the Windows equivalent scripts for the Call Management System development environment.

## Available Scripts

### 1. Setup Scripts

#### `setup-new-environment.bat`
- **Purpose**: Windows batch script for initial environment setup
- **Usage**: Double-click or run from Command Prompt
- **Features**:
  - Checks prerequisites (Node.js, npm, Java)
  - Installs all dependencies
  - Creates environment files (.env)
  - Sets up DynamoDB Local
  - Runs validation tests
  - Basic error handling

#### `setup-new-environment.ps1`
- **Purpose**: Enhanced PowerShell script for initial environment setup
- **Usage**: Run from PowerShell: `.\setup-new-environment.ps1`
- **Features**:
  - All features of the batch version
  - Colored output for better readability
  - Advanced error handling with stack traces
  - Command-line parameters for customization
  - Better version checking and validation

**PowerShell Parameters:**
```powershell
.\setup-new-environment.ps1 -SkipJavaCheck    # Skip Java installation check
.\setup-new-environment.ps1 -SkipTests        # Skip build validation tests
.\setup-new-environment.ps1 -SkipJavaCheck -SkipTests  # Skip both
```

### 2. Development Server Scripts

#### `start-local-dev.bat`
- **Purpose**: Windows batch script to start all development services
- **Usage**: Double-click or run from Command Prompt
- **Features**:
  - Checks and installs missing dependencies
  - Starts DynamoDB Local
  - Creates database tables and seeds data
  - Starts backend and frontend services
  - Basic process management

#### `start-local-dev.ps1`
- **Purpose**: Enhanced PowerShell script to start all development services
- **Usage**: Run from PowerShell: `.\start-local-dev.ps1`
- **Features**:
  - All features of the batch version
  - Colored output and better status messages
  - Advanced process management with job control
  - Graceful cleanup on Ctrl+C
  - Better error handling and monitoring
  - Environment variable loading from .env files

**PowerShell Parameters:**
```powershell
.\start-local-dev.ps1 -SkipDependencyCheck    # Skip dependency installation check
```

## Prerequisites

### Required Software
1. **Node.js 14+** - Download from [nodejs.org](https://nodejs.org/)
2. **npm** - Usually comes with Node.js
3. **Java 8+** - Required for DynamoDB Local
   - Download from [AdoptOpenJDK](https://adoptopenjdk.net/)
   - Or install via package manager (Chocolatey, Scoop, etc.)

### PowerShell Execution Policy
If you encounter execution policy errors when running PowerShell scripts, you may need to adjust your execution policy:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow local scripts (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for the current session only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

## Usage Instructions

### First-Time Setup

1. **Clone the repository** and navigate to the project root
2. **Run the setup script**:
   - **Batch**: Double-click `setup-new-environment.bat` or run from Command Prompt
   - **PowerShell**: Open PowerShell, navigate to project root, run `.\setup-new-environment.ps1`

3. **Review the created environment files**:
   - `backend\.env` - Backend configuration
   - `frontend\.env` - Frontend configuration

### Starting Development Environment

1. **Run the start script**:
   - **Batch**: Double-click `start-local-dev.bat` or run from Command Prompt
   - **PowerShell**: Open PowerShell, navigate to project root, run `.\start-local-dev.ps1`

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - DynamoDB Local: http://localhost:8000

3. **Demo Login Credentials**:
   - Admin: `admin@example.com` / `password`
   - Caller: `caller1@example.com` / `password`

### Stopping Services

- **Batch Script**: Press `Ctrl+C` in the Command Prompt window, then press any key
- **PowerShell Script**: Press `Ctrl+C` - the script will automatically clean up all processes

## Troubleshooting

### Common Issues

1. **"Execution of scripts is disabled on this system"**
   - Solution: Adjust PowerShell execution policy (see above)

2. **"Java is not installed" warning**
   - Install Java 8+ from [AdoptOpenJDK](https://adoptopenjdk.net/)
   - Or continue without Java (DynamoDB Local won't work)

3. **"Node.js version 14+ is required"**
   - Update Node.js from [nodejs.org](https://nodejs.org/)

4. **Port already in use errors**
   - Check if services are already running
   - Kill existing Node.js processes: `taskkill /f /im node.exe`

5. **DynamoDB Local installation fails**
   - Ensure Java is installed and accessible
   - Try running the setup script as Administrator
   - Manual installation: Download from AWS and extract to `backend\.dynamodb`

### Manual Service Management

If you prefer to start services individually:

```batch
REM Backend
cd backend
npm run dev

REM Frontend (in new terminal)
cd frontend
npm start

REM DynamoDB Local (in new terminal)
cd backend
npm run dynamodb:start
```

### Environment Variables

The scripts automatically create `.env` files with default values. Review and update these files as needed:

- **backend\.env**: Database configuration, JWT secrets, AWS settings
- **frontend\.env**: API endpoints, environment settings

## Differences from Linux Scripts

### Key Adaptations Made

1. **Path Separators**: Changed from `/` to `\` for Windows paths
2. **Command Syntax**: 
   - `cd` → `cd /d` (for drive changes)
   - `export VAR=value` → `set VAR=value`
   - `command -v` → `where` command
3. **Process Management**: 
   - Background processes: `&` → `start /B` (batch) or `Start-Job` (PowerShell)
   - Process cleanup adapted for Windows
4. **Environment Variables**: Custom parsing for `.env` files
5. **Color Output**: Windows-compatible color codes and PowerShell color support
6. **Error Handling**: Windows-specific error codes and handling

### Feature Parity

Both Windows versions maintain feature parity with the original Linux scripts:
- ✅ Dependency checking and installation
- ✅ Environment file creation
- ✅ DynamoDB Local setup
- ✅ Database table creation and seeding
- ✅ Multi-service startup
- ✅ Graceful cleanup
- ✅ Status messages and progress indication

## Support

For issues specific to these Windows scripts, please check:
1. This README file
2. The main project documentation (README.md, QUICK-START.md)
3. Ensure all prerequisites are properly installed
4. Try running scripts as Administrator if permission issues occur

The PowerShell versions are recommended for better error handling and user experience, while the batch versions provide maximum compatibility across all Windows systems.
