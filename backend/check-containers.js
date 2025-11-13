require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: new DefaultAzureCredential()
});

async function checkContainers() {
  try {
    const { resources } = await client.database('never-alone').containers.readAll().fetchAll();
    console.log('📦 Existing containers in never-alone database:');
    resources.forEach(c => console.log('  ✅', c.id));

    const expectedContainers = [
      'FamilyMembers',
      'Reminders',
      'SafetyIncidents',
      'Conversations',
      'UserMemories',
      'Photos'
    ];

    console.log('\n📋 Expected containers:');
    expectedContainers.forEach(name => {
      const exists = resources.find(c => c.id === name);
      console.log(exists ? '  ✅' : '  ❌', name);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkContainers();
