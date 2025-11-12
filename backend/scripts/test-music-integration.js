#!/usr/bin/env node

/**
 * Test Music Integration End-to-End
 *
 * Tests:
 * 1. Load music preferences for Tiferet
 * 2. Search for a song
 * 3. Simulate play_music function call
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const axios = require('axios');
require('dotenv').config();

const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.COSMOS_DATABASE || 'never-alone';
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

async function testMusicIntegration() {
  console.log('🎵 Testing Music Integration End-to-End\n');
  console.log('=' .repeat(60));

  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ endpoint, aadCredentials: credential });
  const database = client.database(databaseId);

  // Test 1: Load music preferences
  console.log('\n📋 Test 1: Load Music Preferences');
  try {
    const prefsContainer = database.container('user-music-preferences');
    const { resources } = await prefsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: 'user-tiferet-001' }],
      })
      .fetchAll();

    if (resources.length === 0) {
      console.log('❌ No music preferences found for Tiferet');
      return;
    }

    const prefs = resources[0];
    console.log('✅ Music preferences loaded:');
    console.log(`   Enabled: ${prefs.enabled}`);
    console.log(`   Artists: ${prefs.preferredArtists.join(', ')}`);
    console.log(`   Songs: ${prefs.preferredSongs.join(', ')}`);
    console.log(`   Play on sadness: ${prefs.playOnSadness}`);

    // Test 2: Search for a preferred song
    console.log('\n🔍 Test 2: Search for Preferred Song');
    const searchQuery = `${prefs.preferredSongs[0]} ${prefs.preferredArtists[0]}`;
    console.log(`   Query: "${searchQuery}"`);

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        videoCategoryId: '10',
        maxResults: 1,
        key: youtubeApiKey,
      },
    });

    if (response.data.items.length === 0) {
      console.log('❌ No video found');
      return;
    }

    const video = response.data.items[0];
    console.log('✅ Video found:');
    console.log(`   Title: ${video.snippet.title}`);
    console.log(`   Artist: ${video.snippet.channelTitle}`);
    console.log(`   Video ID: ${video.id.videoId}`);
    console.log(`   URL: https://www.youtube.com/watch?v=${video.id.videoId}`);

    // Test 3: Simulate saving playback history
    console.log('\n💾 Test 3: Save Playback History');
    const historyContainer = database.container('music-playback-history');

    const historyEntry = {
      id: `playback-test-${Date.now()}`,
      userId: 'user-tiferet-001',
      conversationId: 'test-conversation',
      songName: video.snippet.title,
      artistName: video.snippet.channelTitle,
      youtubeVideoId: video.id.videoId,
      playedAt: new Date().toISOString(),
      triggeredBy: 'user_requested',
      conversationContext: 'Test playback from integration test',
      ttl: 7776000, // 90 days
    };

    await historyContainer.items.create(historyEntry);
    console.log('✅ Playback history saved');
    console.log(`   Song: ${historyEntry.songName}`);
    console.log(`   Played at: ${historyEntry.playedAt}`);

    // Test 4: Retrieve playback history
    console.log('\n📊 Test 4: Retrieve Playback History');
    const { resources: history } = await historyContainer.items
      .query({
        query: `
          SELECT * FROM c
          WHERE c.userId = @userId
          ORDER BY c.playedAt DESC
          OFFSET 0 LIMIT 5
        `,
        parameters: [{ name: '@userId', value: 'user-tiferet-001' }],
      })
      .fetchAll();

    console.log(`✅ Found ${history.length} playback records:`);
    history.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.songName} (${record.triggeredBy}) - ${record.playedAt}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✨ All music integration tests passed!\n');

    console.log('📋 Summary:');
    console.log('   ✅ Music preferences loaded from Cosmos DB');
    console.log('   ✅ YouTube API search working');
    console.log('   ✅ Playback history saved');
    console.log('   ✅ Playback history retrieved');
    console.log('\n🎉 Music integration backend is ready!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testMusicIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
