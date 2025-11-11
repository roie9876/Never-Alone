const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

async function test() {
  try {
    console.log('🔍 Testing Cosmos DB connection with Azure AD...');
    console.log('Endpoint:', process.env.COSMOS_ENDPOINT);
    console.log('Database:', process.env.COSMOS_DATABASE);
    
    // Use Azure AD authentication (same as your backend)
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential
    });
    
    console.log('\n📡 Attempting to connect...');
    
    const { database } = await client.databases.createIfNotExists({ 
      id: process.env.COSMOS_DATABASE || 'never-alone' 
    });
    
    console.log('\n✅ SUCCESS! Connected to Cosmos DB');
    console.log('📦 Database:', database.id);
    
    // List containers
    const { resources: containers } = await database.containers.readAll().fetchAll();
    console.log('📊 Containers found:', containers.length);
    containers.forEach(c => console.log('   ✓', c.id));
    
    console.log('\n🎉 Cosmos DB is working! Firewall issue resolved!');
    console.log('💡 You can now use the production /realtime/session endpoint!');
    
  } catch (error) {
    console.error('\n❌ FAILED! Cosmos DB error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.statusCode) console.error('Status code:', error.statusCode);
    
    if (error.message.includes('firewall') || error.message.includes('IP')) {
      console.error('\n🔥 Firewall still blocking access');
    } else if (error.message.includes('authentication') || error.message.includes('credential')) {
      console.error('\n🔑 Authentication issue - run: az login');
    }
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
