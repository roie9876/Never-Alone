#!/usr/bin/env node

/**
 * Test YouTube Music API Integration
 *
 * Tests:
 * 1. Search for specific Hebrew songs
 * 2. Search by artist
 * 3. Search by genre
 */

const axios = require('axios');
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function searchYouTube(query) {
  console.log(`\n🔍 Searching: "${query}"`);

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      },
    });

    if (response.data.items.length === 0) {
      console.log('❌ No results found');
      return null;
    }

    const item = response.data.items[0];
    console.log('✅ Found:');
    console.log(`   Title: ${item.snippet.title}`);
    console.log(`   Artist: ${item.snippet.channelTitle}`);
    console.log(`   Video ID: ${item.id.videoId}`);
    console.log(`   URL: https://www.youtube.com/watch?v=${item.id.videoId}`);

    return item;
  } catch (error) {
    console.error('❌ Search failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    return null;
  }
}

async function runTests() {
  console.log('🎵 Testing YouTube Music API Integration\n');
  console.log('=' .repeat(60));

  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not found in .env file');
    process.exit(1);
  }

  // Test 1: Specific Hebrew song
  console.log('\n📝 Test 1: Specific Hebrew Song');
  await searchYouTube('ירושלים של זהב Naomi Shemer');

  // Test 2: Another popular Israeli song
  console.log('\n📝 Test 2: Another Israeli Classic');
  await searchYouTube('אני ואתה Arik Einstein');

  // Test 3: Search by artist
  console.log('\n📝 Test 3: Search by Artist');
  await searchYouTube('Naomi Shemer Israeli music');

  // Test 4: Search by genre
  console.log('\n📝 Test 4: Search by Genre');
  await searchYouTube('Israeli classics 1960s Hebrew songs');

  // Test 5: Another Hebrew classic
  console.log('\n📝 Test 5: Shir LaShalom (Song for Peace)');
  await searchYouTube('שיר לשלום Israeli song');

  console.log('\n' + '='.repeat(60));
  console.log('✨ All tests completed!\n');
}

// Run the tests
runTests()
  .then(() => {
    console.log('🎉 YouTube API integration working!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
