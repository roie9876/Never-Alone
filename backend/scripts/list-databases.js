/**
 * List all databases in Cosmos DB account
 * Run: node scripts/list-databases.js
 */

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function listDatabases() {
  const endpoint = process.env.COSMOS_ENDPOINT;

  if (!endpoint) {
    console.error('❌ Missing COSMOS_ENDPOINT in .env file');
    process.exit(1);
  }

  console.log('🔍 Connecting to Cosmos DB...');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Auth: Azure AD (DefaultAzureCredential)\n`);

  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ endpoint, aadCredentials: credential });

  try {
    const { resources: databases } = await client.databases.readAll().fetchAll();

    if (databases.length === 0) {
      console.log('⚠️  No databases found in this Cosmos DB account');
      console.log('\nYou need to create a database in Azure Portal:');
      console.log('1. Go to your Cosmos DB account in Azure Portal');
      console.log('2. Click "Data Explorer" in the left menu');
      console.log('3. Click "New Database"');
      console.log('4. Enter database name: never-alone');
      console.log('5. Click "OK"\n');
      process.exit(1);
    }

    console.log(`✅ Found ${databases.length} database(s):\n`);
    databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.id}`);
    });

    console.log('\n📝 Your .env file has: COSMOS_DATABASE=' + process.env.COSMOS_DATABASE);

    const targetDb = process.env.COSMOS_DATABASE || 'never-alone';
    const exists = databases.some(db => db.id === targetDb);

    if (exists) {
      console.log(`✅ Database "${targetDb}" exists!`);
    } else {
      console.log(`❌ Database "${targetDb}" does NOT exist!`);
      console.log(`\nAvailable databases: ${databases.map(db => db.id).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listDatabases();
