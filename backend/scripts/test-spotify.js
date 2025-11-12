#!/usr/bin/env node

/**
 * Test Spotify Integration
 *
 * This script tests the new Spotify service to ensure:
 * 1. Spotify API credentials are valid
 * 2. Can search for Hebrew songs
 * 3. Can retrieve preview URLs
 * 4. Can search for the specific test song (Jerusalem of Gold)
 */

const { DefaultAzureCredential } = require('@azure/identity');
const { CosmosClient } = require('@azure/cosmos');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testSpotifyCredentials() {
  log('🔑', 'Testing Spotify API credentials...', colors.blue);

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    log('❌', 'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not found in .env', colors.red);
    return false;
  }

  log('✅', `Client ID: ${clientId.substring(0, 10)}...`, colors.green);
  log('✅', `Client Secret: ${clientSecret.substring(0, 10)}...`, colors.green);

  // Test authentication
  const spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
  });

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);

    log('✅', `Access token obtained! Expires in ${data.body.expires_in} seconds`, colors.green);
    return spotifyApi;
  } catch (error) {
    log('❌', `Failed to authenticate: ${error.message}`, colors.red);
    return false;
  }
}

async function testHebrewSearch(spotifyApi) {
  log('🔍', 'Testing Hebrew song search...', colors.blue);

  const queries = [
    'ירושלים של זהב נעמי שמר',
    'אני ואתה אריק איינשטיין',
    'שיר לשלום',
  ];

  for (const query of queries) {
    try {
      log('🎵', `Searching for: "${query}"`, colors.yellow);

      const result = await spotifyApi.searchTracks(query, {
        limit: 1,
        market: 'IL',
      });

      if (result.body.tracks.items.length === 0) {
        log('⚠️', `  No results found`, colors.yellow);
        continue;
      }

      const track = result.body.tracks.items[0];
      log('✅', `  Found: "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`, colors.green);
      log('📀', `  Track ID: ${track.id}`, colors.magenta);
      log('🔗', `  Spotify URL: ${track.external_urls.spotify}`, colors.magenta);

      if (track.preview_url) {
        log('🎧', `  Preview URL: ${track.preview_url.substring(0, 50)}...`, colors.green);
      } else {
        log('⚠️', `  No preview URL available for this track`, colors.yellow);
      }

      if (track.album.images[0]) {
        log('🖼️', `  Album Art: ${track.album.images[0].url.substring(0, 50)}...`, colors.magenta);
      }

      console.log('');
    } catch (error) {
      log('❌', `  Search failed: ${error.message}`, colors.red);
    }
  }
}

async function testSpecificSong(spotifyApi) {
  log('🎯', 'Testing specific song: Jerusalem of Gold', colors.blue);

  const query = 'ירושלים של זהב נעמי שמר';

  try {
    const result = await spotifyApi.searchTracks(query, {
      limit: 3, // Get top 3 to compare
      market: 'IL',
    });

    if (result.body.tracks.items.length === 0) {
      log('❌', 'No results found for Jerusalem of Gold', colors.red);
      return false;
    }

    log('✅', `Found ${result.body.tracks.items.length} versions:`, colors.green);
    console.log('');

    for (let i = 0; i < result.body.tracks.items.length; i++) {
      const track = result.body.tracks.items[i];
      console.log(`${colors.yellow}Option ${i + 1}:${colors.reset}`);
      console.log(`  Title: ${track.name}`);
      console.log(`  Artist: ${track.artists.map(a => a.name).join(', ')}`);
      console.log(`  Album: ${track.album.name}`);
      console.log(`  Duration: ${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`);
      console.log(`  Preview: ${track.preview_url ? '✅ Available' : '❌ Not available'}`);
      console.log(`  Spotify URL: ${track.external_urls.spotify}`);
      console.log('');
    }

    return true;
  } catch (error) {
    log('❌', `Failed to search: ${error.message}`, colors.red);
    return false;
  }
}

async function testMusicPreferencesInCosmosDB() {
  log('💾', 'Testing music preferences in Cosmos DB...', colors.blue);

  try {
    const credential = new DefaultAzureCredential();
    const cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });

    const database = cosmosClient.database('never-alone');
    const container = database.container('user-music-preferences');

    // Query for Tiferet's preferences
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: 'user-tiferet-001' }],
      })
      .fetchAll();

    if (resources.length === 0) {
      log('⚠️', 'No music preferences found for Tiferet', colors.yellow);
      return false;
    }

    const prefs = resources[0];
    log('✅', 'Found music preferences:', colors.green);
    console.log(`  Enabled: ${prefs.enabled}`);
    console.log(`  Preferred Artists: ${prefs.preferredArtists.join(', ')}`);
    console.log(`  Preferred Songs: ${prefs.preferredSongs.join(', ')}`);
    console.log(`  Music Service: ${prefs.musicService}`);
    console.log('');

    return true;
  } catch (error) {
    log('❌', `Failed to load preferences: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  console.log('');
  log('🎵', '=== SPOTIFY INTEGRATION TEST ===', colors.magenta);
  console.log('');

  // Test 1: Credentials
  const spotifyApi = await testSpotifyCredentials();
  if (!spotifyApi) {
    log('❌', 'Spotify authentication failed - cannot continue', colors.red);
    process.exit(1);
  }
  console.log('');

  // Test 2: Hebrew search
  await testHebrewSearch(spotifyApi);

  // Test 3: Specific song
  await testSpecificSong(spotifyApi);

  // Test 4: Cosmos DB preferences
  await testMusicPreferencesInCosmosDB();

  log('✅', 'All tests complete!', colors.green);
  console.log('');
  log('📝', 'Next steps:', colors.blue);
  console.log('  1. Backend is ready to use Spotify');
  console.log('  2. Need to update Flutter to play preview URLs');
  console.log('  3. Update music_player_audio.dart to use previewUrl instead of videoId');
  console.log('');
}

main().catch(error => {
  log('❌', `Test failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
