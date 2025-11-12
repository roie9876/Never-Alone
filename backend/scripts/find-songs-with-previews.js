#!/usr/bin/env node

/**
 * Find Hebrew songs with preview URLs available
 */

const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

async function findSongsWithPreviews() {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  // Authenticate
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body.access_token);

  const queries = [
    'Idan Raichel',
    'עומר אדם',
    'Static and Ben El',
    'נועה קירל',
    'הפרויקט של עידן רייכל',
    'עידן רייכל',
  ];

  console.log('🔍 Searching for Hebrew songs WITH preview URLs...\n');

  for (const query of queries) {
    try {
      const result = await spotifyApi.searchTracks(query, {
        limit: 5,
        market: 'IL',
      });

      for (const track of result.body.tracks.items) {
        if (track.preview_url) {
          console.log(`✅ "${track.name}" by ${track.artists[0].name}`);
          console.log(`   Preview: ${track.preview_url}`);
          console.log('');
        }
      }
    } catch (error) {
      console.error(`Error searching for ${query}:`, error.message);
    }
  }
}

findSongsWithPreviews().catch(console.error);
