#!/bin/bash

# Never Alone - Quick Start Script
# Starts backend, dashboard, and Flutter app

set -e  # Exit on error

echo "🚀 Starting Never Alone..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing processes
echo "🧹 Checking for existing processes..."

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   Found process on port 3000, killing it..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -ti:3001 > /dev/null 2>&1; then
    echo "   Found process on port 3001, killing it..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "   ✅ Old processes cleaned up"

# Start backend in background
echo "📦 Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm run start:dev > /tmp/never-alone-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Start dashboard in background
echo "📸 Starting dashboard (for photos)..."
cd "$SCRIPT_DIR/dashboard"
PORT=3001 npm run dev > /tmp/never-alone-dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "   Dashboard PID: $DASHBOARD_PID"

# Wait for services to initialize
echo "⏳ Waiting for services to start (10 seconds)..."
sleep 10

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check logs at /tmp/never-alone-backend.log"
    exit 1
fi

# Check if dashboard is running
if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo "❌ Dashboard failed to start. Check logs at /tmp/never-alone-dashboard.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test backend health
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:3000"
else
    echo "⚠️  Backend started but health check failed. Continuing anyway..."
fi

# Test dashboard health
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Dashboard is running at http://localhost:3001"
else
    echo "⚠️  Dashboard started but health check failed. Continuing anyway..."
fi

echo ""

# Start Flutter app
echo "📱 Starting Flutter app..."
cd "$SCRIPT_DIR/frontend_flutter"
flutter run -d macos

# When Flutter app exits, kill backend and dashboard
echo ""
echo "🛑 Shutting down services..."
kill $BACKEND_PID 2>/dev/null || true
kill $DASHBOARD_PID 2>/dev/null || true
echo "✅ Done!"
