#!/usr/bin/env node

/**
 * Cosmos DB Container Checker
 * Verifies that all required containers exist
 */

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const REQUIRED_CONTAINERS = [
  { name: 'users', partitionKey: '/userId', ttl: null },
  { name: 'conversations', partitionKey: '/userId', ttl: 7776000 },
  { name: 'memories', partitionKey: '/userId', ttl: null },
  { name: 'reminders', partitionKey: '/userId', ttl: null },
  { name: 'photos', partitionKey: '/userId', ttl: null },
  { name: 'safety-config', partitionKey: '/userId', ttl: null },
];

async function checkContainers() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const databaseName = process.env.COSMOS_DATABASE || 'never-alone';

  if (!endpoint) {
    console.error('❌ Missing COSMOS_ENDPOINT in .env file');
    process.exit(1);
  }

  console.log('🔍 Checking Cosmos DB containers...\n');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Database: ${databaseName}`);
  console.log(`Auth: Azure AD (DefaultAzureCredential)\n`);

  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ endpoint, aadCredentials: credential });
  const database = client.database(databaseName);

  try {
    // Check if database exists
    const { resource: dbInfo } = await database.read();
    console.log(`✅ Database "${databaseName}" exists\n`);
  } catch (error) {
    console.error(`❌ Database "${databaseName}" does not exist!`);
    console.error('   Create it in Azure Portal first.\n');
    process.exit(1);
  }

  // Check each container
  const results = [];
  for (const container of REQUIRED_CONTAINERS) {
    try {
      const containerInstance = database.container(container.name);
      const { resource: containerInfo } = await containerInstance.read();

      results.push({
        name: container.name,
        exists: true,
        partitionKey: containerInfo.partitionKey.paths[0],
        ttl: containerInfo.defaultTtl || null,
      });
    } catch (error) {
      results.push({
        name: container.name,
        exists: false,
      });
    }
  }

  // Print results
  console.log('Container Status:');
  console.log('─────────────────────────────────────────────────────────');

  let allExist = true;
  for (const result of results) {
    const required = REQUIRED_CONTAINERS.find(c => c.name === result.name);

    if (result.exists) {
      console.log(`✅ ${result.name.padEnd(20)} EXISTS`);
      console.log(`   Partition Key: ${result.partitionKey}`);
      if (result.ttl) {
        console.log(`   TTL: ${result.ttl} seconds (${result.ttl / 86400} days)`);
      }
    } else {
      console.log(`❌ ${result.name.padEnd(20)} MISSING`);
      console.log(`   Need to create with partition key: ${required.partitionKey}`);
      if (required.ttl) {
        console.log(`   Need to set TTL: ${required.ttl} seconds`);
      }
      allExist = false;
    }
    console.log('');
  }

  console.log('─────────────────────────────────────────────────────────');

  if (allExist) {
    console.log('\n✅ ALL CONTAINERS EXIST! You\'re ready to go!\n');
    process.exit(0);
  } else {
    console.log('\n❌ MISSING CONTAINERS DETECTED');
    console.log('\nTo create missing containers:');
    console.log('1. Open Azure Portal → Your Cosmos DB account');
    console.log('2. Click "Data Explorer" → Select database "never-alone"');
    console.log('3. Click "New Container"');
    console.log('4. Fill in Container ID and Partition Key from above');
    console.log('5. For "conversations" only: Enable TTL → Set to 7776000\n');
    process.exit(1);
  }
}

checkContainers().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
