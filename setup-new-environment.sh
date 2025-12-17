#!/bin/bash

# ===================================
# Call Management System
# New Environment Setup Script
# ===================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Call Management System${NC}"
echo -e "${BLUE}New Environment Setup${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to print status messages
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "This script must be run from the call-management-system root directory"
    exit 1
fi

# Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js version 14+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm $(npm --version) ✓"

# Check Java (required for DynamoDB Local)
if ! command -v java &> /dev/null; then
    print_warning "Java is not installed. DynamoDB Local requires Java 8+."
    print_warning "Please install Java from https://adoptopenjdk.net/ or your system package manager."
    echo ""
    read -p "Continue without Java? (DynamoDB Local won't work) [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    SKIP_DYNAMODB=true
else
    print_status "Java $(java -version 2>&1 | head -n 1 | cut -d'"' -f2) ✓"
    SKIP_DYNAMODB=false
fi

echo ""

# Install dependencies
print_step "Installing dependencies..."

print_status "Installing root dependencies..."
npm install

print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

print_status "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""

# Set up environment files
print_step "Setting up environment files..."

# Backend environment
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        print_status "Creating backend/.env from example..."
        cp backend/.env.example backend/.env
        print_warning "Please review and update backend/.env with your specific configuration"
    else
        print_status "Creating basic backend/.env file..."
        cat > backend/.env << EOF
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
EOF
        print_warning "Created basic backend/.env - please review and update as needed"
    fi
else
    print_status "Backend .env file already exists"
fi

# Frontend environment
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        print_status "Creating frontend/.env from example..."
        cp frontend/.env.example frontend/.env
    else
        print_status "Creating basic frontend/.env file..."
        cat > frontend/.env << EOF
# Call Management System - Frontend Environment
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
EOF
    fi
else
    print_status "Frontend .env file already exists"
fi

echo ""

# Set up DynamoDB Local
if [ "$SKIP_DYNAMODB" = false ]; then
    print_step "Setting up DynamoDB Local..."
    
    cd backend
    
    if [ ! -d ".dynamodb" ] || [ ! -f ".dynamodb/DynamoDBLocal.jar" ]; then
        print_status "Installing DynamoDB Local..."
        if npm run dynamodb:install; then
            print_status "DynamoDB Local installed successfully via serverless plugin"
        else
            print_warning "Serverless plugin installation failed, trying manual installation..."
            cd ..
            if [ -f "install-dynamodb-local.sh" ]; then
                cd backend
                ../install-dynamodb-local.sh
                if [ -f ".dynamodb/DynamoDBLocal.jar" ]; then
                    print_status "DynamoDB Local installed successfully via manual installation"
                else
                    print_error "Manual installation also failed"
                    cd ..
                    exit 1
                fi
            else
                print_error "Manual installation script not found"
                print_warning "You may need to download it manually from:"
                print_warning "https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz"
                exit 1
            fi
            cd ..
        fi
    else
        print_status "DynamoDB Local already installed"
    fi
    
    cd ..
else
    print_warning "Skipping DynamoDB Local setup (Java not available)"
fi

echo ""

# Run tests
print_step "Running setup validation tests..."

# Test frontend build
print_status "Testing frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    print_status "Frontend builds successfully ✓"
    rm -rf build  # Clean up test build
else
    print_warning "Frontend build test failed - check for errors later"
fi
cd ..

# Test backend compilation
print_status "Testing backend compilation..."
cd backend
if npm run build > /dev/null 2>&1; then
    print_status "Backend compiles successfully ✓"
    rm -rf dist  # Clean up test build
else
    print_warning "Backend compilation test failed - check for errors later"
fi
cd ..

echo ""

# Final setup summary
print_step "Setup Summary"
echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Environment files created${NC}"
if [ "$SKIP_DYNAMODB" = false ]; then
    echo -e "${GREEN}✓ DynamoDB Local installed${NC}"
else
    echo -e "${YELLOW}⚠ DynamoDB Local skipped (Java not available)${NC}"
fi
echo -e "${GREEN}✓ Build tests completed${NC}"

echo ""
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Setup Complete!${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo "1. Review environment files:"
echo "   - backend/.env"
echo "   - frontend/.env"
echo ""
echo "2. Start the development environment:"
echo "   ${GREEN}./start-local-dev.sh${NC}"
echo ""
echo "3. Or start services individually:"
echo "   Backend:  ${GREEN}cd backend && npm run dev${NC}"
echo "   Frontend: ${GREEN}cd frontend && npm start${NC}"
echo ""
echo "4. Access the application:"
echo "   Frontend: ${CYAN}http://localhost:3000${NC}"
echo "   Backend:  ${CYAN}http://localhost:3001${NC}"
if [ "$SKIP_DYNAMODB" = false ]; then
    echo "   DynamoDB: ${CYAN}http://localhost:8000${NC}"
fi
echo ""
echo "5. Demo credentials:"
echo "   Admin:  ${YELLOW}admin@example.com / password${NC}"
echo "   Caller: ${YELLOW}caller1@example.com / password${NC}"
echo ""
echo "6. For troubleshooting, see:"
echo "   - ${CYAN}QUICK-START.md${NC}"
echo "   - ${CYAN}DEPLOYMENT-GUIDE.md${NC}"
echo "   - ${CYAN}README.md${NC}"
echo ""

print_status "Environment setup completed successfully!"
