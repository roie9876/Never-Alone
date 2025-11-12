#!/usr/bin/env node

const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

async function testWithInternationalSongs() {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body.access_token);

  // Test with popular international songs that should have previews
  const queries = [
    'Yesterday Beatles',
    'Imagine John Lennon',
    'Bohemian Rhapsody Queen',
  ];

  console.log('🔍 Testing with international songs (should have previews)...\n');

  for (const query of queries) {
    const result = await spotifyApi.searchTracks(query, { limit: 1 });
    const track = result.body.tracks.items[0];

    console.log(`🎵 "${track.name}" by ${track.artists[0].name}`);
    console.log(`   Preview: ${track.preview_url ? '✅ Available' : '❌ Not available'}`);
    if (track.preview_url) {
      console.log(`   URL: ${track.preview_url}`);
    }
    console.log('');
  }
}

testWithInternationalSongs().catch(console.error);
