#!/usr/bin/env node

/**
 * Refresh System Prompt for Active Session
 *
 * Run this script after updating user profile/music preferences in the dashboard
 * to reload the system prompt without restarting the conversation.
 *
 * Usage:
 *   node refresh-active-session.js [sessionId]
 *
 * If no sessionId provided, will attempt to find active session for user-tiferet-001
 */

const http = require('http');

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3000;

async function findActiveSessions() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/realtime/sessions',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.sessions || []);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function refreshSession(sessionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: `/realtime/session/${sessionId}/refresh`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    console.log(`\n🔄 Sending refresh request to: http://${BACKEND_HOST}:${BACKEND_PORT}${options.path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);

        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  const sessionId = process.argv[2];

  console.log('🔄 Refresh System Prompt Script');
  console.log('================================\n');

  try {
    if (!sessionId) {
      console.log('No sessionId provided. Looking for active sessions...\n');

      const sessions = await findActiveSessions();

      if (sessions.length === 0) {
        console.log('❌ No active sessions found.');
        console.log('\nℹ️  Start a conversation in the Flutter app first, then run:');
        console.log('   node refresh-active-session.js <sessionId>');
        process.exit(1);
      }

      console.log(`Found ${sessions.length} active session(s):\n`);
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. Session ID: ${session.id}`);
        console.log(`   User ID: ${session.userId}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Started: ${new Date(session.startedAt).toLocaleString()}`);
        console.log('');
      });

      if (sessions.length === 1) {
        console.log(`Using session: ${sessions[0].id}\n`);
        const result = await refreshSession(sessions[0].id);
        console.log('\n✅ SUCCESS!');
        console.log(result.message);
      } else {
        console.log('Multiple sessions found. Please specify sessionId:');
        console.log(`node refresh-active-session.js <sessionId>`);
        process.exit(1);
      }
    } else {
      console.log(`Using provided session ID: ${sessionId}\n`);
      const result = await refreshSession(sessionId);
      console.log('\n✅ SUCCESS!');
      console.log(result.message);
    }

    console.log('\n💡 The AI will now use updated music preferences in the conversation.');
    console.log('   You can continue talking - the changes are already active!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nℹ️  Make sure:');
    console.error('   1. Backend server is running (npm run start:dev)');
    console.error('   2. There is an active conversation session');
    console.error('   3. The sessionId is correct');
    process.exit(1);
  }
}

main();
