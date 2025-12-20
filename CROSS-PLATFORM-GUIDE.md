# Cross-Platform Development Guide

This guide explains the cross-platform solution implemented for the Call Management System, ensuring it works seamlessly on Windows, Linux, and macOS.

## 🎯 Problem Solved

The original project had Unix-specific commands in npm scripts that failed on Windows:
```bash
# This failed on Windows
"dynamodb:start": "export $(grep -v '^#' .env | grep -v '^$' | xargs) && serverless dynamodb start"
```

## ✅ Cross-Platform Solution

### 1. Fixed Backend Scripts

**Before (Unix-only):**
```json
{
  "dev": "export $(grep -v '^#' .env | grep -v '^$' | xargs) && serverless offline start --httpPort 3001",
  "dynamodb:start": "export $(grep -v '^#' .env | grep -v '^$' | xargs) && serverless dynamodb start"
}
```

**After (Cross-platform):**
```json
{
  "dev": "dotenv -e .env -- serverless offline start --httpPort 3001",
  "dynamodb:start": "dotenv -e .env -- serverless dynamodb start"
}
```

### 2. Added Cross-Platform Dependencies

Added to `backend/package.json`:
- `cross-env`: Cross-platform environment variables
- `dotenv-cli`: Load .env files in npm scripts

### 3. Created Unified Node.js Scripts

#### `scripts/env-manager.js`
- Cross-platform environment file management
- Automatically creates `.env` from `.env.example`
- Validates required environment variables

#### `scripts/start-local.js`
- Unified local development startup
- Works identically on all platforms
- Handles dependency installation, DynamoDB setup, database seeding, and service startup

#### `scripts/deploy.js`
- Cross-platform deployment script
- Replaces separate shell scripts
- Supports backend, frontend, and full deployments

## 🚀 Usage

### Quick Start (Any Platform)

```bash
# Setup environment files
npm run setup

# Start complete development environment
npm run start:local

# Or start individual services
npm run dynamodb:start
npm run backend:dev
npm run frontend:dev
```

### Available Scripts

#### Environment Management
```bash
npm run setup              # Setup .env files from .env.example
npm run setup:env          # Same as above
```

#### Development
```bash
npm run start:local        # Start complete development stack
npm run dynamodb:start     # Start DynamoDB Local only
npm run dynamodb:setup     # Install DynamoDB + create tables + seed data
npm run dev                # Start backend and frontend (legacy)
npm run backend:dev        # Start backend only
npm run frontend:dev       # Start frontend only
```

#### Deployment
```bash
npm run deploy:backend     # Deploy backend to AWS
npm run deploy:frontend    # Build frontend for deployment
npm run deploy:all         # Deploy both backend and frontend
npm run deploy:info        # Show deployment information
```

#### Testing
```bash
npm test                   # Run all tests
npm run test:backend       # Run backend tests
npm run test:frontend      # Run frontend tests
```

## 🔧 Technical Details

### Environment Variable Loading

**Old approach (Unix-only):**
```bash
export $(grep -v '^#' .env | grep -v '^$' | xargs)
```

**New approach (Cross-platform):**
```bash
dotenv -e .env -- [command]
```

### Process Management

The Node.js scripts handle process management across platforms:
- **Windows**: Uses `npm.cmd` and proper shell options
- **Unix/Linux**: Uses standard `npm` and shell commands
- **Process cleanup**: Handles Ctrl+C gracefully on all platforms

### Path Handling

All scripts use Node.js `path` module for cross-platform path handling:
```javascript
const backendDir = path.join(this.projectRoot, 'backend');
const envFile = path.join(directory, '.env');
```

## 📁 File Structure

```
├── scripts/                    # Cross-platform Node.js scripts
│   ├── env-manager.js         # Environment management
│   ├── start-local.js         # Local development startup
│   └── deploy.js              # Deployment script
├── backend/
│   ├── package.json           # Updated with cross-platform scripts
│   └── .env                   # Environment variables
├── frontend/
│   └── .env                   # Frontend environment variables
└── package.json               # Root scripts updated
```

## 🔄 Migration from Platform-Specific Scripts

### For Windows Users
Instead of:
```powershell
.\start-local-dev.ps1
```

Use:
```bash
npm run start:local
```

### For Linux/macOS Users
Instead of:
```bash
./start-local-dev.sh
```

Use:
```bash
npm run start:local
```

## 🧪 Testing Cross-Platform Compatibility

### Windows Testing
```cmd
# Command Prompt
npm run dynamodb:start

# PowerShell
npm run start:local
```

### Linux/macOS Testing
```bash
npm run dynamodb:start
npm run start:local
```

## 🔍 Troubleshooting

### Common Issues

1. **"dotenv command not found"**
   ```bash
   cd backend && npm install
   ```

2. **Java not found (DynamoDB Local)**
   - Install Java 8+ from [AdoptOpenJDK](https://adoptopenjdk.net/)
   - Ensure `java` is in your PATH

3. **Permission denied on scripts**
   ```bash
   # Linux/macOS
   chmod +x scripts/*.js
   ```

4. **Port already in use**
   ```bash
   # Kill existing processes
   # Windows
   taskkill /f /im node.exe
   
   # Linux/macOS
   pkill -f node
   ```

### Environment Variables

Ensure your `.env` files exist:
```bash
# Check if .env files exist
ls backend/.env frontend/.env

# Create from examples if missing
npm run setup
```

## 🎉 Benefits

1. **True Cross-Platform**: Works identically on Windows, Linux, and macOS
2. **Simplified Workflow**: Single set of commands for all platforms
3. **Better Error Handling**: Node.js scripts provide better error messages
4. **Maintainable**: No need to maintain separate Windows/Linux scripts
5. **CI/CD Ready**: Works in any CI/CD environment
6. **Developer Friendly**: Familiar npm commands

## 🔮 Future Enhancements

- Add Docker support for even more consistency
- Implement health checks for services
- Add automatic port conflict resolution
- Create VS Code tasks for common operations
- Add support for different environment stages (dev, staging, prod)

## 📚 Dependencies Added

### Backend Dependencies
```json
{
  "devDependencies": {
    "cross-env": "^7.0.3",
    "dotenv-cli": "^7.3.0"
  }
}
```

These are lightweight, well-maintained packages that are standard in the Node.js ecosystem for cross-platform development.
