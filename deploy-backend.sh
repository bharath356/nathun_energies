#!/bin/bash

# Simplified Backend Deployment Script
# Creates a deployment package for AWS Lambda

set -e

echo "🚀 Building backend deployment package..."

# Check if we're in the correct directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

cd backend

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ deployment/ backend-deployment.zip

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npx tsc

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p deployment

# Copy compiled files
echo "📋 Copying compiled files..."
cp -r dist/* deployment/

# Restructure if needed (flatten backend/src structure)
if [ -d "deployment/backend/src" ]; then
    echo "🔄 Restructuring deployment directory..."
    mkdir -p deployment/temp_backend
    cp -r deployment/backend/src/* deployment/temp_backend/
    rm -rf deployment/backend
    cp -r deployment/temp_backend/* deployment/
    rm -rf deployment/temp_backend
fi

# Fix import paths for shared types
if [ -d "deployment/shared" ]; then
    echo "🔧 Fixing import paths..."
    find deployment -name "*.js" -type f -exec sed -i 's|require("../../../shared/types")|require("../shared/types")|g' {} \;
    find deployment -name "*.js" -type f -exec sed -i "s|require('../../../shared/types')|require('../shared/types')|g" {} \;
fi

# Copy package files
echo "📄 Copying package files..."
cp package.json deployment/
cp package-lock.json deployment/

# Install production dependencies
echo "🏭 Installing production dependencies..."
cd deployment
npm install --production --silent
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
cd deployment
zip -r ../backend-deployment.zip . -q
cd ..

# Clean up
rm -rf deployment/

# Get package size
PACKAGE_SIZE=$(du -h backend-deployment.zip | cut -f1)
echo "✅ Backend deployment package created: backend-deployment.zip (${PACKAGE_SIZE})"

cd ..
echo "🎉 Backend deployment ready!"
