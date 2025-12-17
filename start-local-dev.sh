#!/bin/bash

echo "🚀 Starting Call Management System..."
echo "======================================"

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing root dependencies..."
  npm install
fi

if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd backend
  npm install
  cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..
fi

# Start DynamoDB Local
echo "🗄️ Starting DynamoDB Local..."
cd backend

# Load environment variables (skip comments and empty lines)
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Check if DynamoDB is already installed
if [ ! -d ".dynamodb" ] || [ ! -f ".dynamodb/DynamoDBLocal.jar" ]; then
  echo "Installing DynamoDB Local..."
  if npm run dynamodb:install; then
    echo "✅ DynamoDB Local installed via serverless plugin"
  else
    echo "⚠️ Serverless plugin installation failed, trying manual installation..."
    if [ -f "../install-dynamodb-local.sh" ]; then
      ../install-dynamodb-local.sh
    else
      echo "❌ Manual installation script not found."
      echo "Please manually download DynamoDB Local from:"
      echo "https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz"
      echo "and extract it to the backend/.dynamodb directory."
      exit 1
    fi
  fi
fi

# Start DynamoDB Local
echo "Starting DynamoDB Local with environment variables..."
npm run dynamodb:start &
DYNAMODB_PID=$!

# Wait for DynamoDB to start
echo "Waiting for DynamoDB to start..."
sleep 15

# Create DynamoDB tables
echo "Creating DynamoDB tables..."
npm run dynamodb:create-tables

# Create Client Management DynamoDB tables
echo "Creating Client Management DynamoDB tables..."
node create-client-tables.js

# Create Client step tables
echo "Creating Client Management DynamoDB tables..."
node create-step1-table.js
node create-step2-table.js
node create-step3-table.js
node create-step4-table.js
node create-step5-table.js


# Seed data into DynamoDB tables
echo "Seeding data into DynamoDB tables..."
node seed-data.js

# Seed Client Management data
echo "Seeding Client Management data..."
node seed-client-data.js

# Start Backend (Express.js)
echo "Starting Backend API (Express.js)..."
npm run express:dev &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
  echo "Shutting down services..."
  kill $DYNAMODB_PID $BACKEND_PID $FRONTEND_PID
  exit 0
}

# Register the cleanup function for SIGINT and SIGTERM signals
trap cleanup SIGINT SIGTERM

echo "All services started!"
echo "- DynamoDB Local: http://localhost:8000"
echo "- Backend API: http://localhost:3001"
echo "- Frontend: http://localhost:3000"
echo ""
echo "✅ System Features Available:"
echo "   • Call Management (Users, Phone Numbers, Calls, Follow-ups)"
echo "   • Client Workflow Management (5-Step Process)"
echo "   • Interactive Workflow Stepper with Sub-steps"
echo "   • Document and Form Data Management"
echo ""
echo "🔑 Demo Login Credentials:"
echo "   Admin: admin@example.com / password"
echo "   Caller: caller1@example.com / password"
echo ""
echo "📋 Sample Data Loaded:"
echo "   • 5 Sample clients with different workflow states"
echo "   • Complete 5-step workflow process"
echo "   • Sub-steps for Dispatch Process (Step 3)"
echo "   • Sample documents and form data"
echo ""
echo "Press Ctrl+C to stop all services."

# Keep the script running
wait
