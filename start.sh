#!/bin/bash

# Never Alone - Quick Start Script
# Starts both backend and Flutter app

set -e  # Exit on error

echo "🚀 Starting Never Alone..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing backend processes on port 3000
echo "🧹 Checking for existing backend processes..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   Found process on port 3000, killing it..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "   ✅ Old process cleaned up"
fi

# Start backend in background
echo "📦 Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm run start:dev > /tmp/never-alone-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to initialize
echo "⏳ Waiting for backend to start (10 seconds)..."
sleep 10

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check logs at /tmp/never-alone-backend.log"
    exit 1
fi

# Test backend health
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:3000"
else
    echo "⚠️  Backend started but health check failed. Continuing anyway..."
fi

echo ""

# Start Flutter app
echo "📱 Starting Flutter app..."
cd "$SCRIPT_DIR/frontend_flutter"
flutter run -d macos

# When Flutter app exits, kill backend
echo ""
echo "🛑 Shutting down backend..."
kill $BACKEND_PID 2>/dev/null || true
echo "✅ Done!"
