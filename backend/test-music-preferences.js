/**
 * Test Music Preferences Loading
 * Verify music preferences are loaded correctly from Cosmos DB
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function testMusicPreferences() {
  console.log('🎵 Testing Music Preferences Loading\n');

  try {
    // Initialize Cosmos client with Azure AD
    const credential = new DefaultAzureCredential();
    const endpoint = process.env.COSMOS_ENDPOINT || 'https://neveralone.documents.azure.com:443/';

    const client = new CosmosClient({
      endpoint,
      aadCredentials: credential,
    });

    const database = client.database('never-alone');
    const container = database.container('user-music-preferences');

    // Test 1: Query all music preferences
    console.log('📋 Test 1: Query all music preferences');
    const { resources: allPrefs } = await container.items
      .query('SELECT * FROM c')
      .fetchAll();

    console.log(`   Found ${allPrefs.length} music preference records\n`);

    if (allPrefs.length === 0) {
      console.log('❌ No music preferences found in database!');
      console.log('   Make sure music preferences were saved from the dashboard.\n');
      return;
    }

    // Display all records
    allPrefs.forEach((pref, index) => {
      console.log(`   Record ${index + 1}:`);
      console.log(`   - userId: ${pref.userId}`);
      console.log(`   - enabled: ${pref.enabled}`);
      console.log(`   - preferredArtists: ${pref.preferredArtists?.join(', ') || '(none)'}`);
      console.log(`   - preferredSongs: ${pref.preferredSongs?.join(', ') || '(none)'}`);
      console.log(`   - preferredGenres: ${pref.preferredGenres?.join(', ') || '(none)'}`);
      console.log(`   - allowAutoPlay: ${pref.allowAutoPlay}`);
      console.log(`   - playOnSadness: ${pref.playOnSadness}`);
      console.log(`   - maxSongsPerSession: ${pref.maxSongsPerSession}`);
      console.log('');
    });

    // Test 2: Load preferences for specific user (Tiferet)
    const testUserId = 'user-tiferet-001';
    console.log(`📋 Test 2: Load preferences for user "${testUserId}"`);

    const { resources: userPrefs } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: testUserId }],
      })
      .fetchAll();

    if (userPrefs.length === 0) {
      console.log(`   ❌ No preferences found for user ${testUserId}`);
      console.log(`   This user either hasn't configured music preferences or they're stored under a different userId.\n`);
    } else {
      console.log(`   ✅ Found preferences for ${testUserId}:`);
      const pref = userPrefs[0];
      console.log(`   - enabled: ${pref.enabled}`);
      console.log(`   - Artists: ${pref.preferredArtists?.join(', ') || '(none)'}`);
      console.log(`   - Songs: ${pref.preferredSongs?.join(', ') || '(none)'}`);
      console.log(`   - Genres: ${pref.preferredGenres?.join(', ') || '(none)'}`);
      console.log('');
    }

    // Test 3: Check if loadMusicPreferences logic matches backend
    console.log('📋 Test 3: Simulate backend loadMusicPreferences() call');
    const { resources: backendSimulation } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: testUserId }],
      })
      .fetchAll();

    if (backendSimulation.length === 0) {
      console.log(`   ❌ Backend would return NULL (no preferences found)`);
      console.log(`   AI will see: "Music feature not configured for this user."`);
    } else {
      console.log(`   ✅ Backend would return preferences:`);
      const pref = backendSimulation[0];
      console.log(`   - Music enabled: ${pref.enabled}`);
      if (pref.enabled) {
        console.log(`   - AI will have access to:`);
        console.log(`     * Artists: ${pref.preferredArtists?.join(', ') || '(none)'}`);
        console.log(`     * Songs: ${pref.preferredSongs?.join(', ') || '(none)'}`);
        console.log(`     * Auto-play: ${pref.allowAutoPlay}`);
        console.log(`     * Play on sadness: ${pref.playOnSadness}`);
        console.log(`     * Max songs/session: ${pref.maxSongsPerSession}`);
      } else {
        console.log(`   - Music is DISABLED by user preference`);
      }
    }
    console.log('');

    console.log('✅ Music preferences test complete!');
    console.log('\n📝 Next steps if preferences are not loading:');
    console.log('   1. Verify userId matches between dashboard and backend');
    console.log('   2. Check backend logs for "Music preferences loaded" message');
    console.log('   3. Verify music preferences are included in system prompt');
    console.log('   4. Check if formatMusicPreferences() is being called');

  } catch (error) {
    console.error('❌ Error testing music preferences:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('   Cannot reach Cosmos DB endpoint. Check network connection.');
    }
  }
}

// Run test
testMusicPreferences();
