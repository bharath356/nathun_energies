# Call Management System - Quick Start Guide

Welcome to the Call Management System! This guide will help you get up and running quickly with your new development environment.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required
- **Node.js** (version 14 or later) - [Download here](https://nodejs.org/)
- **npm** (usually comes with Node.js)

### Optional but Recommended
- **Java** (version 8 or later) - Required for DynamoDB Local
  - [AdoptOpenJDK](https://adoptopenjdk.net/) (recommended)
  - Or install via your system package manager

### Verification
Check your installations:
```bash
node --version    # Should show v14.x.x or higher
npm --version     # Should show 6.x.x or higher
java -version     # Should show 1.8.x or higher (optional)
```

## 🚀 One-Command Setup

After extracting the package, navigate to the project directory and run:

```bash
chmod +x *.sh
./setup-new-environment.sh
```

This automated script will:
- ✅ Check all prerequisites
- ✅ Install all dependencies (root, frontend, backend)
- ✅ Set up environment configuration files
- ✅ Install and configure DynamoDB Local
- ✅ Run validation tests
- ✅ Provide next steps

## 🏃‍♂️ Quick Start (After Setup)

### Start All Services
```bash
./start-local-dev.sh
```

This will start:
- **DynamoDB Local** on port 8000
- **Backend API** on port 3001
- **Frontend** on port 3000

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **DynamoDB Admin**: http://localhost:8000 (if available)

### Demo Credentials
```
Admin User:
  Email: admin@example.com
  Password: password

Caller User:
  Email: caller1@example.com
  Password: password
```

## 📁 Project Structure

```
call-management-system/
├── 📄 README.md                    # Main project documentation
├── 📄 QUICK-START.md              # This file
├── 📄 DEPLOYMENT-GUIDE.md         # Production deployment guide
├── 🔧 setup-new-environment.sh    # Automated setup script
├── 🔧 start-local-dev.sh          # Start all services
├── 🔧 test-local-setup.sh         # Test your setup
├── 🔧 create-distribution-package.sh # Create distribution packages
├── 📦 package.json                # Root dependencies
├── 
├── 🎨 frontend/                   # React TypeScript frontend
│   ├── 📦 package.json
│   ├── 🔧 .env.example
│   ├── 📁 src/
│   │   ├── 📁 components/         # UI components
│   │   ├── 📁 pages/              # Page components
│   │   ├── 📁 services/           # API services
│   │   └── 📁 context/            # React context
│   └── 📁 public/
│
├── ⚙️ backend/                    # Serverless backend
│   ├── 📦 package.json
│   ├── 🔧 .env.example
│   ├── 📁 src/
│   │   ├── 📁 routes/             # API routes
│   │   ├── 📁 services/           # Business logic
│   │   ├── 📁 middleware/         # Express middleware
│   │   └── 📁 utils/              # Utility functions
│   ├── 📁 seeds/                  # Sample data
│   └── 🔧 serverless.yml          # Serverless config
│
├── 🔗 shared/                     # Shared TypeScript types
├── 📚 docs/                       # Detailed documentation
└── 🧠 memory-bank/                # Development notes & guides
```

## 🛠️ Manual Setup (Alternative)

If you prefer to set up manually or the automated script fails:

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Set Up Environment Files
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env as needed

# Frontend environment
cp frontend/.env.example frontend/.env
# Edit frontend/.env as needed
```

### 3. Install DynamoDB Local (if Java is available)
```bash
cd backend
npm run dynamodb:install
cd ..
```

### 4. Start Services Individually
```bash
# Terminal 1: Start DynamoDB Local
cd backend
npm run dynamodb:start

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm start
```

## 🧪 Testing Your Setup

Run the test script to verify everything is working:
```bash
./test-local-setup.sh
```

Or test manually:
1. Visit http://localhost:3000
2. Log in with demo credentials
3. Navigate through the application
4. Check that data loads properly

## 🔧 Development Commands

### Root Level
```bash
npm run install:all    # Install all dependencies
npm run dev           # Start all services
npm run build         # Build frontend
npm run test          # Run all tests
```

### Backend
```bash
cd backend
npm run dev           # Start Express server (development)
npm run build         # Build TypeScript
npm run test          # Run backend tests
npm run dynamodb:start    # Start DynamoDB Local
npm run dynamodb:create-tables  # Create call management tables
npm run client:create-tables    # Create client workflow tables
npm run dynamodb:seed           # Seed call management data
npm run client:seed             # Seed client workflow data
npm run setup:complete          # Run all table creation and seeding (one command)
```

### Frontend
```bash
cd frontend
npm start             # Start development server
npm run build         # Build for production
npm test              # Run frontend tests
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
If you get port conflicts:
```bash
# Kill processes on specific ports
sudo lsof -ti:3000 | xargs kill -9  # Frontend
sudo lsof -ti:3001 | xargs kill -9  # Backend
sudo lsof -ti:8000 | xargs kill -9  # DynamoDB
```

#### DynamoDB Connection Issues
1. Ensure Java is installed: `java -version`
2. Check if DynamoDB Local is running: `curl http://localhost:8000`
3. Restart DynamoDB Local:
   ```bash
   cd backend
   npm run dynamodb:start
   ```

#### Frontend Can't Connect to Backend
1. Check backend is running on port 3001
2. Verify `frontend/.env` has correct API URL:
   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

#### Build Failures
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules frontend/node_modules backend/node_modules
   npm run install:all
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

### Getting Help

1. **Check the logs** in your terminal for specific error messages
2. **Review documentation**:
   - `docs/setup.md` - Detailed setup guide
   - `memory-bank/troubleshooting-guide.md` - Common issues and solutions
   - `DEPLOYMENT-GUIDE.md` - Production deployment
3. **Verify your environment**:
   - Node.js version (14+)
   - Java version (8+) for DynamoDB Local
   - Available ports (3000, 3001, 8000)

## 🎯 Next Steps

After successful setup:

1. **Explore the Application**
   - Log in with demo credentials
   - Navigate through different sections
   - Test creating/editing data

2. **Review the Code**
   - Check `frontend/src/` for React components
   - Review `backend/src/` for API implementation
   - Examine `shared/types.ts` for data models

3. **Read Documentation**
   - `README.md` - Project overview
   - `docs/api.md` - API documentation
   - `memory-bank/` - Development notes

4. **Start Development**
   - Make changes to the code
   - Test your changes locally
   - Review deployment options

## 📞 Application Features

### User Management
- Role-based access (Admin/Caller)
- User authentication and profiles
- User creation and management

### Phone Number Management
- Random number assignment
- Batch allocation (10 numbers per caller)
- Number pool management

### Call Tracking
- Call status tracking
- Call history and outcomes
- Notes and duration recording

### Follow-up Management
- Scheduled follow-ups
- Task management
- Completion tracking

### Client Workflow Management ✨ NEW
- **5-Step Client Onboarding Process**:
  1. Client Finalization & Loan Process
  2. Site Survey and Installation
  3. Dispatch Process (with sub-steps)
  4. Ghar Portal Upload
  5. Final Bank Process and Subsidy
- **Interactive Workflow Stepper**: Visual progress tracking with status indicators
- **Sub-step Management**: Granular task tracking within major steps
- **Document Management**: Upload and track KYC documents, approvals, and certificates
- **Form Data Management**: Dynamic form fields for each workflow step
- **Assignee Management**: Assign different team members to different steps
- **Due Date Tracking**: Automatic overdue detection and alerts
- **Mobile Responsive**: Works seamlessly on all device sizes

### Dashboard
- Role-specific views
- Data visualization
- Responsive design

---

**Happy coding! 🎉**

For more detailed information, see the complete documentation in the `docs/` directory and `memory-bank/` for development insights.
