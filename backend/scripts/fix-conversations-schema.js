const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function fixConversations() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: 'https://neveralone.documents.azure.com:443/',
      aadCredentials: credential
    });

    const database = client.database('never-alone');
    const container = database.container('conversations');

    // Get ALL conversations
    const { resources: allConvs } = await container.items
      .query('SELECT * FROM c')
      .fetchAll();

    console.log(`\n🔧 Found ${allConvs.length} conversations to fix`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const conv of allConvs) {
      try {
        let needsUpdate = false;

        // Fix startTime -> startedAt
        if (conv.startTime && !conv.startedAt) {
          conv.startedAt = conv.startTime;
          delete conv.startTime;
          needsUpdate = true;
        }

        // Fix endTime -> endedAt
        if (conv.endTime && !conv.endedAt) {
          conv.endedAt = conv.endTime;
          delete conv.endTime;
          needsUpdate = true;
        }

        // If startedAt is still missing, use _ts (creation timestamp)
        if (!conv.startedAt && conv._ts) {
          conv.startedAt = new Date(conv._ts * 1000).toISOString();
          needsUpdate = true;
        }

        if (needsUpdate) {
          await container.item(conv.id, conv.userId).replace(conv);
          fixed++;
          if (fixed % 20 === 0) {
            console.log(`   ✅ Fixed ${fixed} conversations...`);
          }
        } else {
          alreadyCorrect++;
        }
      } catch (err) {
        console.error(`   ❌ Error fixing conversation ${conv.id}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ✓ Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n🎉 Done! Dashboard should now show conversations.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixConversations();
