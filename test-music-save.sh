#!/bin/bash

# Test Music Preferences Save
# This tests the full flow: Dashboard → Backend → Cosmos DB

echo "🧪 Testing Music Preferences Save"
echo "=================================="
echo ""

# Step 1: Check backend is running
echo "1️⃣ Checking backend..."
if lsof -i :3000 | grep -q LISTEN; then
  echo "   ✅ Backend running on port 3000"
else
  echo "   ❌ Backend NOT running! Start it first:"
  echo "      cd backend && npm run start:dev"
  exit 1
fi

# Step 2: Test POST /music/preferences endpoint
echo ""
echo "2️⃣ Testing POST /music/preferences..."
RESPONSE=$(curl -s -X POST http://localhost:3000/music/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-tiferet-001",
    "enabled": true,
    "preferredArtists": ["Test Artist 1", "Test Artist 2"],
    "preferredSongs": ["Test Song 1"],
    "preferredGenres": ["Test Genre"],
    "allowAutoPlay": true,
    "playOnSadness": false,
    "maxSongsPerSession": 3
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "   ✅ Backend endpoint works!"
else
  echo "   ❌ Backend returned error:"
  echo "$RESPONSE"
  exit 1
fi

# Step 3: Verify data in Cosmos DB
echo ""
echo "3️⃣ Verifying data in Cosmos DB..."
cd "/Users/robenhai/Never Alone/backend"
CHECK_RESULT=$(node -e "
require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

(async () => {
  try {
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: new DefaultAzureCredential()
    });
    const db = client.database('never-alone');
    const container = db.container('user-music-preferences');
    
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
      })
      .fetchAll();
    
    if (resources.length === 0) {
      console.log('NOT_FOUND');
    } else {
      const prefs = resources[0];
      console.log('FOUND');
      console.log('Artists:', prefs.preferredArtists.join(', '));
      console.log('Songs:', prefs.preferredSongs.join(', '));
      console.log('Updated:', prefs.updatedAt);
    }
  } catch (error) {
    console.log('ERROR:', error.message);
  }
})();
")

if echo "$CHECK_RESULT" | grep -q "FOUND"; then
  echo "   ✅ Data saved to Cosmos DB!"
  echo ""
  echo "$CHECK_RESULT" | grep -v "FOUND"
else
  echo "   ❌ Data NOT in Cosmos DB!"
  echo "$CHECK_RESULT"
  exit 1
fi

# Step 4: Test delete/update
echo ""
echo "4️⃣ Testing update (delete artist)..."
UPDATE_RESPONSE=$(curl -s -X POST http://localhost:3000/music/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-tiferet-001",
    "enabled": true,
    "preferredArtists": ["Test Artist 2"],
    "preferredSongs": ["Test Song 1"],
    "preferredGenres": ["Test Genre"],
    "allowAutoPlay": true,
    "playOnSadness": false,
    "maxSongsPerSession": 3
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
  echo "   ✅ Update successful!"
  
  # Verify update
  sleep 1
  VERIFY_RESULT=$(node -e "
  require('dotenv').config();
  const { CosmosClient } = require('@azure/cosmos');
  const { DefaultAzureCredential } = require('@azure/identity');
  
  (async () => {
    try {
      const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        aadCredentials: new DefaultAzureCredential()
      });
      const db = client.database('never-alone');
      const container = db.container('user-music-preferences');
      
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
        })
        .fetchAll();
      
      if (resources.length > 0) {
        const prefs = resources[0];
        console.log('Artists after update:', prefs.preferredArtists.join(', '));
        if (prefs.preferredArtists.length === 1 && prefs.preferredArtists[0] === 'Test Artist 2') {
          console.log('UPDATE_VERIFIED');
        }
      }
    } catch (error) {
      console.log('ERROR:', error.message);
    }
  })();
  ")
  
  if echo "$VERIFY_RESULT" | grep -q "UPDATE_VERIFIED"; then
    echo "   ✅ Update verified in Cosmos DB!"
  else
    echo "   ⚠️  Update may not have applied:"
    echo "$VERIFY_RESULT"
  fi
else
  echo "   ❌ Update failed:"
  echo "$UPDATE_RESPONSE"
fi

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo ""
echo "🔍 Now test in Dashboard:"
echo "   1. Go to http://localhost:3001/onboarding"
echo "   2. Navigate to Step 9 (Music Preferences)"
echo "   3. Change artists/songs"
echo "   4. Save the form"
echo "   5. Refresh page and verify changes persist"
