#!/usr/bin/env node

/**
 * Add Tiferet's background story as long-term memories
 *
 * This script creates memory entries in the UserMemories container
 * so the AI can reference work history, life experiences, etc.
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const USER_ID = 'user-tiferet-001';

// Background story memories to add
const backgroundStory = [
  {
    memoryType: 'personal_history',
    key: 'career_engineer',
    value: 'Worked as an electrical engineer for 35 years at Israel Electric Corporation',
    importance: 'high',
    context: 'Career history - added during profile setup',
  },
  {
    memoryType: 'personal_history',
    key: 'career_retirement',
    value: 'Retired in 2004 at age 57 after successful career',
    importance: 'medium',
    context: 'Career history - added during profile setup',
  },
  {
    memoryType: 'personal_history',
    key: 'marriage_tzivia',
    value: 'Married to Tzivia for 55 years, met in university',
    importance: 'high',
    context: 'Personal history - added during profile setup',
  },
  {
    memoryType: 'family_info',
    key: 'children_two_daughters',
    value: 'Has two daughters: Michal (עובדת בהייטק בחיפה) and Racheli (מורה בתל אביב)',
    importance: 'high',
    context: 'Family structure - added during profile setup',
  },
  {
    memoryType: 'family_info',
    key: 'grandchildren_five',
    value: 'Has 5 grandchildren: Ofek, Eli, Gefen, Noam, Shaked, and Eliav - loves them dearly',
    importance: 'high',
    context: 'Family structure - added during profile setup',
  },
  {
    memoryType: 'preferences',
    key: 'hobby_gardening',
    value: 'Loves gardening, has a beautiful garden with roses and fruit trees',
    importance: 'medium',
    context: 'Hobbies - added during profile setup',
  },
  {
    memoryType: 'preferences',
    key: 'music_israeli_classics',
    value: 'Loves Israeli classic music from the 1960s-1970s, especially Naomi Shemer',
    importance: 'medium',
    context: 'Preferences - added during profile setup',
  },
  {
    memoryType: 'routine',
    key: 'morning_routine',
    value: 'Wakes up at 6:00 AM, has coffee in the garden, reads newspaper',
    importance: 'medium',
    context: 'Daily routine - added during profile setup',
  },
  {
    memoryType: 'personal_history',
    key: 'birthplace_haifa',
    value: 'Born in Haifa in 1947, lived there until moving to Rehovot after marriage',
    importance: 'medium',
    context: 'Personal history - added during profile setup',
  },
  {
    memoryType: 'preferences',
    key: 'favorite_food',
    value: 'Loves Tzivia\'s homemade jachnun and shakshuka on Shabbat mornings',
    importance: 'low',
    context: 'Food preferences - added during profile setup',
  },
];

async function addBackgroundStory() {
  console.log('🔧 Adding Tiferet\'s background story to database...\n');
  console.log('=' .repeat(60));

  try {
    // Initialize Cosmos DB client with Azure AD
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });

    const database = client.database(process.env.COSMOS_DATABASE || 'never-alone');
    const container = database.container('memories');

    console.log(`✅ Connected to Cosmos DB: ${process.env.COSMOS_ENDPOINT}`);
    console.log(`   Database: ${process.env.COSMOS_DATABASE || 'never-alone'}`);
    console.log(`   Container: memories\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const memory of backgroundStory) {
      try {
        const memoryDoc = {
          id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: USER_ID,
          type: 'user_memory',
          memoryType: memory.memoryType,
          key: memory.key,
          value: memory.value,
          extractedAt: new Date().toISOString(),
          context: memory.context,
          importance: memory.importance,
          confidence: 1.0, // Manual entry = 100% confidence
          accessCount: 0,
        };

        await container.items.create(memoryDoc);
        console.log(`✅ Added: [${memory.memoryType}] ${memory.key}`);
        console.log(`   "${memory.value.substring(0, 80)}..."\n`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to add memory ${memory.key}:`, error.message);
        errorCount++;
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n✅ COMPLETED!`);
    console.log(`   Successfully added: ${successCount} memories`);
    console.log(`   Errors: ${errorCount}`);

    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Create a NEW conversation in the Flutter app');
    console.log('   2. Ask: "איפה עבדתי?" (Where did I work?)');
    console.log('   3. AI should answer: "עבדת כמהנדס חשמל בחברת החשמל 35 שנים"');
    console.log('   4. Check backend logs to see memories were loaded');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addBackgroundStory();
