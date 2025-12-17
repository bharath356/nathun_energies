#!/bin/bash

# Simplified Frontend Deployment Script
# Creates a deployment package for AWS Amplify

set -e

echo "🚀 Creating frontend deployment package..."

# Check if we're in the correct directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

cd frontend

# Remove existing deployment package
if [ -f "../frontend-deployment.zip" ]; then
    echo "🗑️ Removing existing deployment package..."
    rm "../frontend-deployment.zip"
fi

# Create the deployment ZIP file
echo "📦 Creating deployment package..."
zip -r ../frontend-deployment.zip . -x \
    "node_modules/*" \
    "build/*" \
    ".git/*" \
    "*.log" \
    ".env.local" \
    ".env.development.local" \
    ".env.test.local" \
    ".DS_Store" \
    "*.swp" \
    "*.swo" \
    "*~" \
    -q

cd ..

# Check if ZIP was created successfully
if [ -f "frontend-deployment.zip" ]; then
    PACKAGE_SIZE=$(du -h frontend-deployment.zip | cut -f1)
    echo "✅ Frontend deployment package created: frontend-deployment.zip (${PACKAGE_SIZE})"
    echo ""
    echo "📋 Next Steps for AWS Amplify:"
    echo "   1. Go to AWS Amplify Console"
    echo "   2. Choose 'Deploy without Git provider'"
    echo "   3. Upload: frontend-deployment.zip"
    echo "   4. Set environment variable: REACT_APP_API_URL"
    echo "   5. Deploy your application"
    echo ""
    echo "🎉 Frontend deployment ready!"
else
    echo "❌ Error: Failed to create deployment package"
    exit 1
fi
