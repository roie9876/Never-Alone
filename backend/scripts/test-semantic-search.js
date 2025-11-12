/**
 * Test GPT-4 Semantic Photo Search
 *
 * This tests the new semantic search capability that understands:
 * - "טיול באיטליה" (Italy trip) → Matches "ונציה" (Venice)
 * - Semantic relationships between locations, people, events
 */

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const { OpenAIClient } = require('@azure/openai');

async function testSemanticSearch() {
  console.log('🧪 Testing GPT-4 Semantic Photo Search\n');

  try {
    // Initialize Azure clients
    const credential = new DefaultAzureCredential();

    const cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });

    const openaiClient = new OpenAIClient(
      process.env.AZURE_OPENAI_ENDPOINT,
      credential,
      {
        apiVersion: process.env.AZURE_OPENAI_CHAT_API_VERSION,
      },
    );

    const container = cosmosClient.database('never-alone').container('photos');
    const userId = 'user-tiferet-001';

    // Step 1: Load all photo metadata
    console.log('📚 Step 1: Loading photo metadata...');
    const { resources: allPhotos } = await container.items
      .query({
        query: 'SELECT p.id, p.filename, p.caption, p.manualTags, p.location, p.capturedDate FROM p WHERE p.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    console.log(`   ✅ Loaded ${allPhotos.length} photos\n`);

    allPhotos.forEach((p, i) => {
      console.log(`   Photo ${i + 1}: ${p.caption || 'No caption'}`);
      console.log(`      Tags: ${(p.manualTags || []).join(', ')}`);
    });

    // Step 2: Test semantic search queries
    const testQueries = [
      'טיול באיטליה',  // "Italy trip" - should match Venice
      'תמונות עם צביה', // "photos with Tzvia" - should match tagged photos
      'משפחה',          // "family" - should match photos with multiple people
      'ונציה',          // "Venice" - direct match
    ];

    console.log('\n🔍 Step 2: Testing semantic search queries...\n');

    for (const query of testQueries) {
      console.log(`\n📸 Query: "${query}"`);
      console.log('   ⏳ Asking GPT-4...');

      const photoDescriptions = allPhotos.map((photo, index) => {
        const tags = (photo.manualTags || []).join(', ');
        const caption = photo.caption || 'No caption';
        return `Photo ${index + 1} (ID: ${photo.id}): Caption: ${caption}, Tags: ${tags}`;
      }).join('\n');

      const systemPrompt = `You are a photo search assistant. Return the most relevant photo IDs as JSON array.
Example: [{"id": "photo-id", "score": 9, "reason": "Venice is in Italy"}]`;

      const userPrompt = `User request: "${query}"

Photos:
${photoDescriptions}

Return top 3 relevant photos as JSON array.`;

      const result = await openaiClient.getChatCompletions(
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 500,
        },
      );

      const response = result.choices[0]?.message?.content;
      console.log(`   ✅ GPT-4 Response:\n${response}\n`);

      try {
        const parsed = JSON.parse(response);
        const rankedPhotos = Array.isArray(parsed) ? parsed : (parsed.results || []);

        console.log(`   📊 Results:`);
        rankedPhotos.forEach((p, i) => {
          const photo = allPhotos.find(ph => ph.id === p.id);
          console.log(`      ${i + 1}. ${photo?.caption || 'Unknown'} (Score: ${p.score}/10)`);
          console.log(`         Reason: ${p.reason}`);
        });
      } catch (e) {
        console.log(`   ⚠️ Could not parse JSON response`);
      }
    }

    console.log('\n\n✅ Test complete!');
    console.log('\n💡 Key Takeaway:');
    console.log('   - "טיול באיטליה" should match "ונציה" because GPT-4 knows Venice is in Italy');
    console.log('   - This solves the problem where static keyword matching failed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testSemanticSearch();
