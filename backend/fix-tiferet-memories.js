#!/usr/bin/env node

/**
 * Fix Tiferet's Memories - Replace fake demo data with real profile data
 *
 * Problem: Script created demo/fake memories (Israel Electric Corporation)
 * Solution: Delete fake memories and create correct ones from actual profile
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const USER_ID = 'user-tiferet-001';

async function main() {
  console.log('🔧 Fixing Tiferet\'s memories...\n');

  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({
    endpoint: 'https://neveralone.documents.azure.com:443/',
    aadCredentials: credential
  });

  const memoriesContainer = client.database('never-alone').container('memories');
  const configContainer = client.database('never-alone').container('safety-config');

  // Step 1: Load actual profile
  console.log('📖 Loading actual profile from safety-config...');
  const { resources: profiles } = await configContainer.items.query({
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: USER_ID }]
  }).fetchAll();

  if (profiles.length === 0) {
    console.error('❌ Profile not found!');
    process.exit(1);
  }

  const profile = profiles[0];
  const bg = profile.patientBackground;
  console.log('✅ Profile loaded\n');

  // Step 2: Delete ALL existing memories
  console.log('🗑️  Deleting old fake memories...');
  const { resources: oldMemories } = await memoriesContainer.items.query({
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: USER_ID }]
  }).fetchAll();

  for (const mem of oldMemories) {
    await memoriesContainer.item(mem.id, USER_ID).delete();
    console.log(`   ❌ Deleted: ${mem.key}`);
  }
  console.log(`✅ Deleted ${oldMemories.length} old memories\n`);

  // Step 3: Create correct memories from actual profile
  console.log('📝 Creating correct memories from actual profile...\n');

  const correctMemories = [
    // Career - CORRECT INFO
    {
      memoryType: 'personal_history',
      key: 'career_aerospace',
      value: 'Worked in the Aerospace Industry (תעשיה אווירית) for 40 years. Very proud of this career.',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'personal_history',
      key: 'military_service',
      value: 'Served in the Israeli Air Force as an aircraft electrician (חשמלאי מטוסים)',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'personal_history',
      key: 'retirement',
      value: 'Retired from Aerospace Industry after 40 years of service',
      context: 'From patient background story',
      importance: 'medium'
    },

    // Early life
    {
      memoryType: 'personal_history',
      key: 'birthplace_india',
      value: 'Born in India (נולד בהודו), immigrated to Israel at age 4 with mother and 3 siblings. Father passed away in India.',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'personal_history',
      key: 'childhood_moshav',
      value: 'Grew up in Moshav Alma (מושב עלמה) in northern Israel, then moved to Moshav Givat Koach (גבעת כח)',
      context: 'From patient background story',
      importance: 'medium'
    },

    // Marriage & Family
    {
      memoryType: 'personal_history',
      key: 'met_tzivia',
      value: 'Met Tzivia (צביה) in 1970 when he was a soldier in the army',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'personal_history',
      key: 'wedding_1972',
      value: 'Married Tzivia in 1972. Remembers the wedding clearly. Married for 72 years total.',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'family_info',
      key: 'daughters_two',
      value: 'Has two daughters: Michal (43) lives in Rishon LeZion, married to Roi Ben Chaim; Racheli (46) lives in Rishon LeZion, married to Moshe',
      context: 'From patient background story',
      importance: 'high'
    },
    {
      memoryType: 'family_info',
      key: 'grandchildren_five',
      value: 'Has 5 grandchildren: Shaked (16), Noam (14), Gefen (9) - daughters of Michal; Ofek (22), Eli (19) - sons of Racheli. Total 4 grandchildren visit on weekends.',
      context: 'From patient background story',
      importance: 'high'
    },

    // Personality & Hobbies
    {
      memoryType: 'preferences',
      key: 'personality_warm',
      value: 'Warm and friendly person, loves telling stories about the past. Very proud of family, especially grandchildren.',
      context: 'From patient background story',
      importance: 'medium'
    },
    {
      memoryType: 'preferences',
      key: 'hobby_gardening',
      value: 'Loves gardening - has a small garden with flowers. Has ongoing battle with pigeons (מלחמה קבועה עם גירוש היונים מהגינה והבית)',
      context: 'From patient background story',
      importance: 'medium'
    },
    {
      memoryType: 'preferences',
      key: 'music_mediterranean',
      value: 'Loves listening to Mediterranean music (מוזיקה ים תיכונית). Used to be cantor (חזן) at synagogue.',
      context: 'From patient background story',
      importance: 'medium'
    },
    {
      memoryType: 'preferences',
      key: 'hobby_birdwatching',
      value: 'Enjoys watching birds from kitchen window. Likes playing backgammon (שש-בש) with neighbors.',
      context: 'From patient background story',
      importance: 'low'
    },
    {
      memoryType: 'preferences',
      key: 'religious_traditional',
      value: 'Religious and traditional, goes to synagogue. Loves studying the weekly Torah portion (פרשת השבוע)',
      context: 'From patient background story',
      importance: 'medium'
    },

    // Routine & Current Life
    {
      memoryType: 'routine',
      key: 'day_club',
      value: 'Attends day club 3 times a week in Ramat Eliahu neighborhood, Rishon LeZion. Does arts, sports, lectures.',
      context: 'From patient background story',
      importance: 'medium'
    },
    {
      memoryType: 'routine',
      key: 'daily_activities',
      value: 'Likes working in garden, shopping at supermarket. Tzivia is primary caregiver.',
      context: 'From patient background story',
      importance: 'medium'
    },

    // Health
    {
      memoryType: 'medical_info',
      key: 'condition_dementia',
      value: 'Early-stage dementia. Short-term memory impaired but long-term memories sharp. Heart health normal, takes daily aspirin.',
      context: 'From patient background story',
      importance: 'high'
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const memory of correctMemories) {
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
        confidence: 1.0, // Manual entry = 100% confident
        accessCount: 0,
      };

      await memoriesContainer.items.create(memoryDoc);
      console.log(`✅ Added: [${memory.memoryType}] ${memory.key}`);
      console.log(`   "${memory.value.substring(0, 80)}..."`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to add ${memory.key}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ COMPLETED!');
  console.log(`   Successfully added: ${successCount} memories`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
