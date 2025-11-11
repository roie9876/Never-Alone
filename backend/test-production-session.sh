#!/bin/bash

# Test production session creation endpoint
echo "🧪 Testing POST /realtime/session (production endpoint)"
echo "=================================================="
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Test session creation
echo "📡 Creating session for test-user-production..."
RESPONSE=$(curl -s -X POST http://localhost:3000/realtime/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-production"}')

echo ""
echo "📦 Response:"
echo "$RESPONSE" | jq '.'

echo ""
echo "✅ Test complete!"
echo ""
echo "💡 If you see a session object with an ID, the production endpoint is working!"
echo "💡 This session is now stored in Cosmos DB (not just in-memory)"
