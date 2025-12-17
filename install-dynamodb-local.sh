#!/bin/bash

# Manual DynamoDB Local Installation Script
# This script manually downloads and installs DynamoDB Local when the serverless plugin fails

set -e

echo "🗄️ Manual DynamoDB Local Installation"
echo "====================================="

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Create .dynamodb directory if it doesn't exist
mkdir -p .dynamodb

# Download DynamoDB Local using HTTPS
echo "📥 Downloading DynamoDB Local..."
cd .dynamodb

# Use HTTPS URL instead of HTTP
DYNAMODB_URL="https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz"

if command -v wget &> /dev/null; then
    echo "Using wget to download..."
    wget -O dynamodb_local_latest.tar.gz "$DYNAMODB_URL"
elif command -v curl &> /dev/null; then
    echo "Using curl to download..."
    curl -L -o dynamodb_local_latest.tar.gz "$DYNAMODB_URL"
else
    echo "❌ Error: Neither wget nor curl is available. Please install one of them."
    exit 1
fi

# Extract the archive
echo "📦 Extracting DynamoDB Local..."
tar -xzf dynamodb_local_latest.tar.gz

# Clean up the archive
rm dynamodb_local_latest.tar.gz

# Verify installation
if [ -f "DynamoDBLocal.jar" ]; then
    echo "✅ DynamoDB Local installed successfully!"
    echo "📁 Installation location: $(pwd)"
    echo "📋 Files installed:"
    ls -la
else
    echo "❌ Error: Installation failed - DynamoDBLocal.jar not found"
    exit 1
fi

cd ..
echo "🎉 DynamoDB Local is ready to use!"
