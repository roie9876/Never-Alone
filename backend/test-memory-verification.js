#!/usr/bin/env node

/**
 * Test script to verify profile/memory loading during session creation
 *
 * This will:
 * 1. Create a Realtime session for user-tiferet-001
 * 2. Show detailed logs of what profile data was loaded
 * 3. Display the system prompt content to verify memories are included
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';
const USER_ID = 'user-tiferet-001';

async function testMemoryVerification() {
  console.log('🔍 Testing Memory/Profile Loading Verification\n');
  console.log('=' .repeat(60));
  console.log(`User: ${USER_ID}`);
  console.log('=' .repeat(60));

  try {
    // Create a Realtime session
    console.log('\n📡 Creating Realtime session...\n');

    const response = await axios.post(`${BACKEND_URL}/realtime/session`, {
      userId: USER_ID,
      language: 'he',
    });

    if (response.data.success) {
      console.log('\n✅ Session created successfully!');
      console.log(`   Session ID: ${response.data.sessionId}`);
      console.log(`   Conversation ID: ${response.data.conversationId}`);

      console.log('\n' + '='.repeat(60));
      console.log('📄 NOW CHECK THE BACKEND LOGS FOR VERIFICATION:');
      console.log('='.repeat(60));
      console.log('\nRun this command to see what was loaded:');
      console.log('\n   tail -100 /tmp/never-alone-backend.log | grep -A 50 "Memory loaded"');
      console.log('\nLook for these sections:');
      console.log('   📚 Memory loaded - Shows how many memories were found');
      console.log('   👤 User profile loaded - Shows name, age, gender, family');
      console.log('   🛡️  Safety config loaded - Shows medications, triggers');
      console.log('   📄 System prompt generated - Shows prompt length and content preview');
      console.log('   📝 Memories section preview - Shows actual memory text');

      console.log('\n⚠️  KEY THINGS TO CHECK:');
      console.log('   1. "Long-term: X memories" - Should be > 0 if profile was saved');
      console.log('   2. Long-term memories preview - Should show work history, family info');
      console.log('   3. System prompt contains memory section - Should be ✅');
      console.log('   4. Memories section preview - Should show actual profile facts');

    } else {
      console.error('❌ Failed to create session:', response.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testMemoryVerification();
