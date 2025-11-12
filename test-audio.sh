#!/bin/bash

# Audio Testing Quick Start Script
# Validates Flutter audio capture and playback system

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/robenhai/Never Alone"

echo -e "${BLUE}🎙️  Audio Testing Quick Start${NC}"
echo "=================================="
echo ""

# Function to check if process is running
check_process() {
    local process_name=$1
    if ps aux | grep -v grep | grep -q "$process_name"; then
        echo -e "${GREEN}✅ $process_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $process_name is NOT running${NC}"
        return 1
    fi
}

# Step 1: Check Prerequisites
echo -e "${YELLOW}Step 1: Checking Prerequisites...${NC}"
echo ""

# Check backend
if check_process "npm run start:dev"; then
    echo "   Backend URL: http://localhost:3000"
else
    echo -e "${YELLOW}   Starting backend...${NC}"
    cd "$PROJECT_ROOT"
    ./start.sh &
    sleep 5
    if check_process "npm run start:dev"; then
        echo -e "${GREEN}   ✅ Backend started successfully${NC}"
    else
        echo -e "${RED}   ❌ Failed to start backend${NC}"
        exit 1
    fi
fi

# Check Flutter app
if check_process "never_alone_app"; then
    echo "   Flutter app is running"
else
    echo -e "${YELLOW}   ⚠️  Flutter app is NOT running${NC}"
    echo "   Please run manually:"
    echo "   cd \"$PROJECT_ROOT/frontend_flutter\""
    echo "   flutter run -d macos"
    echo ""
    read -p "   Press ENTER after starting Flutter app..."
fi

# Check backend health
echo ""
echo -e "${YELLOW}Step 2: Checking Backend Health...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:3000/health 2>/dev/null || echo "FAIL")
if [ "$HEALTH_CHECK" != "FAIL" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "   URL: http://localhost:3000/health"
    echo "   Response: $HEALTH_CHECK"
    exit 1
fi

# Check Cosmos DB connection
echo ""
echo -e "${YELLOW}Step 3: Checking Cosmos DB...${NC}"
# Backend logs should show Cosmos DB initialized
if tail -100 "$PROJECT_ROOT/backend/logs/app.log" 2>/dev/null | grep -q "Cosmos DB initialized"; then
    echo -e "${GREEN}✅ Cosmos DB connection verified${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify Cosmos DB (check backend logs)${NC}"
fi

# Display audio testing guide
echo ""
echo "=================================="
echo -e "${GREEN}✅ All systems ready for audio testing!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. Open Flutter app (should already be running)"
echo "2. Click 'התחל שיחה' (Start Conversation)"
echo "3. Grant microphone permission if prompted"
echo "4. Speak test phrase: 'שלום, קוראים לי תפארת'"
echo "5. Watch both terminals for audio logs"
echo ""
echo -e "${YELLOW}📖 Full Testing Guide:${NC}"
echo "   $PROJECT_ROOT/docs/AUDIO_TESTING_GUIDE.md"
echo ""
echo -e "${BLUE}🔍 Monitor Backend Logs:${NC}"
echo "   tail -f \"$PROJECT_ROOT/backend/logs/app.log\""
echo ""
echo -e "${BLUE}🔍 Monitor Flutter Logs:${NC}"
echo "   (Check terminal where 'flutter run' was executed)"
echo ""
echo -e "${YELLOW}Key Things to Watch:${NC}"
echo "   ✓ 'AudioService: Recording started'"
echo "   ✓ 'AudioService: Sending audio chunk (X bytes)'"
echo "   ✓ '[RealtimeGateway] Client audio-chunk received'"
echo "   ✓ '[RealtimeService] Forwarding audio chunk to Azure'"
echo "   ✓ 'AudioPlaybackService: Playing audio file'"
echo ""
echo -e "${GREEN}Ready to test! 🎙️${NC}"
echo ""

# Optional: Show recent backend logs
read -p "Show recent backend logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Recent Backend Logs (last 50 lines):${NC}"
    echo "-----------------------------------"
    tail -50 "$PROJECT_ROOT/backend/logs/app.log" 2>/dev/null || echo "Log file not found"
fi

echo ""
echo -e "${YELLOW}💡 Tip: Run 'flutter logs' in another terminal to see real-time Flutter output${NC}"
echo ""
