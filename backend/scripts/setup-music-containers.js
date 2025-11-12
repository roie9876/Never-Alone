#!/usr/bin/env node

/**
 * Setup Cosmos DB Containers for Music Integration
 *
 * Creates:
 * 1. user-music-preferences container (stores user music settings)
 * 2. music-playback-history container (stores playback logs with 90-day TTL)
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.COSMOS_DATABASE || 'never-alone';

async function setupMusicContainers() {
  console.log('🎵 Setting up Music Integration Cosmos DB containers...\n');

  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ endpoint, aadCredentials: credential });

  const database = client.database(databaseId);

  // Container 1: user-music-preferences
  console.log('📦 Creating user-music-preferences container...');
  try {
    const { container: prefsContainer } = await database.containers.createIfNotExists({
      id: 'user-music-preferences',
      partitionKey: {
        paths: ['/userId'],
        kind: 'Hash'
      },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    });
    console.log('✅ user-music-preferences container ready\n');
  } catch (error) {
    console.error('❌ Failed to create user-music-preferences container:', error.message);
  }

  // Container 2: music-playback-history (with 90-day TTL)
  console.log('📦 Creating music-playback-history container (90-day TTL)...');
  try {
    const { container: historyContainer } = await database.containers.createIfNotExists({
      id: 'music-playback-history',
      partitionKey: {
        paths: ['/userId'],
        kind: 'Hash'
      },
      defaultTtl: 7776000, // 90 days in seconds
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    });
    console.log('✅ music-playback-history container ready (auto-deletes after 90 days)\n');
  } catch (error) {
    console.error('❌ Failed to create music-playback-history container:', error.message);
  }

  // Create sample music preferences for Tiferet
  console.log('🎼 Creating sample music preferences for Tiferet...');
  try {
    const prefsContainer = database.container('user-music-preferences');

    const samplePreferences = {
      id: 'music-pref-tiferet',
      userId: 'user-tiferet-001',
      enabled: true,
      preferredArtists: ['Naomi Shemer', 'Arik Einstein', 'Shalom Hanoch'],
      preferredSongs: [
        'ירושלים של זהב',
        'אני ואתה',
        'יושב על הגדר',
        'שיר לשלום'
      ],
      preferredGenres: ['Israeli classics', '1960s Hebrew songs', 'Folk'],
      musicService: 'youtube-music',
      allowAutoPlay: false,
      playOnSadness: true,
      maxSongsPerSession: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await prefsContainer.items.upsert(samplePreferences);
    console.log('✅ Sample music preferences created for Tiferet');
    console.log('   - Artists: Naomi Shemer, Arik Einstein, Shalom Hanoch');
    console.log('   - Songs: ירושלים של זהב, אני ואתה, יושב על הגדר, שיר לשלום');
    console.log('   - Auto-play on sadness: enabled\n');
  } catch (error) {
    console.error('❌ Failed to create sample preferences:', error.message);
  }

  console.log('✨ Music integration containers setup complete!\n');
  console.log('📋 Summary:');
  console.log('   - user-music-preferences: Stores user music settings');
  console.log('   - music-playback-history: Logs playback (90-day auto-delete)');
  console.log('   - Sample data: Tiferet\'s Israeli classics preferences loaded\n');
}

// Run the setup
setupMusicContainers()
  .then(() => {
    console.log('🎉 Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
