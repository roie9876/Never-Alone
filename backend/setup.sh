#!/bin/bash

# Never Alone Backend Setup Script
# Automates the initial setup process

set -e  # Exit on error

echo "🌙 Never Alone - Backend Setup"
echo "==============================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 Please edit .env with your Azure credentials:"
    echo "   - AZURE_OPENAI_ENDPOINT"
    echo "   - AZURE_OPENAI_KEY"
    echo "   - COSMOS_ENDPOINT"
    echo "   - COSMOS_KEY"
    echo "   - REDIS_HOST"
    echo "   - REDIS_PASSWORD"
    echo "   - BLOB_STORAGE_CONNECTION_STRING"
    echo "   - SPEECH_KEY"
    echo ""
    echo "After editing .env, run this script again."
    exit 0
else
    echo "✅ .env file found"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old. Please upgrade to Node.js 18+."
    echo "   Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""

# Test Azure connections
echo "🔌 Testing Azure connections..."
echo ""

# Source the .env file for connection tests
export $(grep -v '^#' .env | xargs)

# Test Redis connection
if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PASSWORD" ]; then
    echo "   Testing Redis connection..."
    # Note: This requires redis-cli to be installed
    # npm test will verify this programmatically
    echo "   ⏭️  Redis test skipped (requires server running)"
else
    echo "   ⚠️  Redis credentials not configured in .env"
fi

# Test Cosmos DB (requires Azure CLI)
if command -v az &> /dev/null; then
    echo "   ✅ Azure CLI detected"

    # Check if logged in
    if az account show &> /dev/null; then
        echo "   ✅ Azure CLI authenticated"
    else
        echo "   ⚠️  Not logged into Azure CLI. Run: az login"
    fi
else
    echo "   ⚠️  Azure CLI not installed (optional for manual setup)"
fi

echo ""

# Build the project
echo "🏗️  Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Check TypeScript errors above."
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create Cosmos DB containers:"
echo "   Run the Azure CLI commands in backend/README.md"
echo ""
echo "2. Generate audio files:"
echo "   npm run generate-audio"
echo ""
echo "3. Start development server:"
echo "   npm run start:dev"
echo ""
echo "4. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "📚 Full documentation: backend/README.md"
echo ""
