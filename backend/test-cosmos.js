const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);

async function test() {
  try {
    console.log('🔍 Testing Cosmos DB connection...');
    console.log('Connection string:', process.env.COSMOS_CONNECTION_STRING?.substring(0, 50) + '...');
    
    const { database } = await client.databases.createIfNotExists({ id: 'never-alone' });
    console.log('\n✅ SUCCESS! Connected to Cosmos DB');
    console.log('📦 Database:', database.id);
    
    // List containers
    const { resources: containers } = await database.containers.readAll().fetchAll();
    console.log('📊 Containers found:', containers.length);
    containers.forEach(c => console.log('   -', c.id));
    
    console.log('\n🎉 Cosmos DB is working! Firewall issue resolved!');
    
  } catch (error) {
    console.error('\n❌ FAILED! Cosmos DB error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    console.error('\n💡 This means the firewall is still blocking access.');
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
