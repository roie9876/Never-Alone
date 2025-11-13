const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

async function checkFamilyMembers() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });

    const container = client.database('never-alone').container('FamilyMembers');
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    
    console.log('📋 Total FamilyMembers:', resources.length);
    console.log('\n📧 Family Member Records:');
    resources.forEach(fm => {
      console.log('  Email:', fm.email);
      console.log('  Name:', fm.name);
      console.log('  User ID:', fm.userId);
      console.log('  ---');
    });

    // Check specifically for sarah@example.com
    const sarah = resources.find(fm => fm.email === 'sarah@example.com');
    if (sarah) {
      console.log('\n✅ Sarah found!');
      console.log('   Email:', sarah.email);
      console.log('   UserID:', sarah.userId);
    } else {
      console.log('\n❌ Sarah NOT found in database!');
      console.log('   Need to create family member record for sarah@example.com');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFamilyMembers();
