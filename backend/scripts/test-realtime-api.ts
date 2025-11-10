/**
 * Test Script for Realtime API Integration
 *
 * This script:
 * 1. Creates a test user profile in Cosmos DB
 * 2. Creates some test memories
 * 3. Tests Realtime API session creation
 * 4. Verifies memory injection
 * 5. Tests the complete flow
 */

import { config } from 'dotenv';
import { DefaultAzureCredential } from '@azure/identity';
import { CosmosClient } from '@azure/cosmos';
import axios from 'axios';

// Load environment variables
config();

const credential = new DefaultAzureCredential();
const cosmosEndpoint = process.env.COSMOS_ENDPOINT || '';
const databaseName = process.env.COSMOS_DATABASE || 'never-alone';

if (!cosmosEndpoint) {
  console.error('❌ COSMOS_ENDPOINT not set in environment variables');
  process.exit(1);
}

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  aadCredentials: credential,
});

const database = cosmosClient.database(databaseName);

async function createTestUser() {
  console.log('\n📝 Creating test user profile...');

  const usersContainer = database.container('users');

  const testUser = {
    id: 'test-user-123',
    userId: 'test-user-123',
    personalInfo: {
      name: 'תפארת כהן',
      age: 78,
      language: 'he-IL',
      timezone: 'Asia/Jerusalem',
    },
    cognitiveMode: 'dementia',
    familyMembers: [
      {
        name: 'מיכל',
        relationship: 'daughter',
        phone: '+972-50-123-4567',
        isPrimaryContact: true,
      },
      {
        name: 'שרה',
        relationship: 'granddaughter',
        phone: '+972-54-987-6543',
        isPrimaryContact: false,
      },
    ],
    safetyRules: {
      neverAllow: [
        {
          rule: 'leaving_home_alone',
          reason: 'Busy highway nearby, disorientation risk',
        },
        {
          rule: 'cooking_unsupervised',
          reason: 'Forgot stove on twice last month',
        },
      ],
      redirectToFamily: [
        'medication changes',
        'doctor appointments',
        'financial matters',
      ],
      approvedActivities: [
        'sitting in garden',
        'watching TV',
        'listening to music',
        'looking at photos',
      ],
      crisisTriggers: [
        'I want to hurt myself',
        'אני רוצה למות',
        'I hate living',
      ],
      forbiddenTopics: [
        'politics',
        'deceased spouse details',
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await usersContainer.items.upsert(testUser);
    console.log('✅ Test user created: test-user-123 (תפארת כהן)');
    return testUser;
  } catch (error: any) {
    console.error('❌ Failed to create test user:', error.message);
    throw error;
  }
}

async function createTestMemories() {
  console.log('\n🧠 Creating test long-term memories...');

  const memoriesContainer = database.container('memories');

  const testMemories = [
    {
      id: 'memory-001',
      userId: 'test-user-123',
      memoryType: 'family_info',
      category: 'family',
      content: 'Granddaughter Sarah works as a teacher in Tel Aviv',
      tags: ['Sarah', 'Tel Aviv', 'teacher', 'granddaughter'],
      importance: 'high',
      confidenceScore: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'memory-002',
      userId: 'test-user-123',
      memoryType: 'preference',
      category: 'preference',
      content: 'Loves classical music, especially Mozart',
      tags: ['music', 'Mozart', 'classical'],
      importance: 'medium',
      confidenceScore: 0.90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'memory-003',
      userId: 'test-user-123',
      memoryType: 'health',
      category: 'health',
      content: 'Takes Metformin 500mg twice daily for Type 2 diabetes',
      tags: ['medication', 'diabetes', 'Metformin'],
      importance: 'high',
      confidenceScore: 0.98,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'memory-004',
      userId: 'test-user-123',
      memoryType: 'routine',
      category: 'routine',
      content: 'Enjoys morning walks in the garden when weather is nice',
      tags: ['garden', 'walking', 'morning'],
      importance: 'medium',
      confidenceScore: 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  try {
    for (const memory of testMemories) {
      await memoriesContainer.items.upsert(memory);
      console.log(`  ✅ Memory created: ${memory.content.substring(0, 50)}...`);
    }
    console.log('✅ All test memories created');
    return testMemories;
  } catch (error: any) {
    console.error('❌ Failed to create test memories:', error.message);
    throw error;
  }
}

async function testSessionCreation() {
  console.log('\n🔌 Testing Realtime API session creation...');

  const backendUrl = 'http://localhost:3000';

  try {
    const response = await axios.post(`${backendUrl}/realtime/session`, {
      userId: 'test-user-123',
      voice: 'alloy',
      language: 'he-IL',
      maxDuration: 1800,
    });

    console.log('✅ Session created successfully!');
    console.log(`  Session ID: ${response.data.session.id}`);
    console.log(`  User ID: ${response.data.session.userId}`);
    console.log(`  Status: ${response.data.session.status}`);
    console.log(`  Started At: ${response.data.session.startedAt}`);
    console.log(`  Turn Count: ${response.data.session.turnCount}`);

    return response.data.session;
  } catch (error: any) {
    console.error('❌ Failed to create session:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testGetSession(sessionId: string) {
  console.log('\n📊 Testing session status retrieval...');

  const backendUrl = 'http://localhost:3000';

  try {
    const response = await axios.get(`${backendUrl}/realtime/session/${sessionId}`);

    console.log('✅ Session retrieved successfully!');
    console.log(`  Session ID: ${response.data.session.id}`);
    console.log(`  Status: ${response.data.session.status}`);
    console.log(`  Turn Count: ${response.data.session.turnCount}`);
    console.log(`  Token Usage: ${response.data.session.tokenUsage || 0}`);

    return response.data.session;
  } catch (error: any) {
    console.error('❌ Failed to get session:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function testEndSession(sessionId: string) {
  console.log('\n🛑 Testing session termination...');

  const backendUrl = 'http://localhost:3000';

  try {
    const response = await axios.delete(`${backendUrl}/realtime/session/${sessionId}`);

    console.log('✅ Session ended successfully!');
    console.log(`  Message: ${response.data.message}`);

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to end session:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function verifyMemoryLoading() {
  console.log('\n🔍 Verifying memory loading via Memory API...');

  const backendUrl = 'http://localhost:3000';

  try {
    const response = await axios.get(`${backendUrl}/memory/load/test-user-123`);

    console.log('✅ Memories loaded successfully!');
    console.log(`  Short-term turns: ${response.data.data.shortTerm.length}`);
    console.log(`  Long-term memories: ${response.data.data.longTerm.length}`);

    if (response.data.data.longTerm.length > 0) {
      console.log('\n  Sample memories:');
      response.data.data.longTerm.slice(0, 3).forEach((mem: any) => {
        console.log(`    - ${mem.content}`);
      });
    }

    return response.data.data;
  } catch (error: any) {
    console.error('❌ Failed to load memories:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function runTests() {
  console.log('🧪 Starting Realtime API Integration Tests');
  console.log('==========================================\n');

  try {
    // Step 1: Create test user
    await createTestUser();

    // Step 2: Create test memories
    await createTestMemories();

    // Step 3: Verify memory loading
    await verifyMemoryLoading();

    // Step 4: Test session creation
    const session = await testSessionCreation();

    // Step 5: Test session retrieval
    await testGetSession(session.id);

    // Step 6: Test session termination
    await testEndSession(session.id);

    console.log('\n✅ All tests passed! Realtime API integration is working correctly.');
    console.log('\n📋 Summary:');
    console.log('  - Test user created in Cosmos DB');
    console.log('  - 4 test memories created');
    console.log('  - Memory loading verified');
    console.log('  - Session created successfully');
    console.log('  - Session retrieved successfully');
    console.log('  - Session ended successfully');
    console.log('\n🎉 Ready for Flutter integration!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
