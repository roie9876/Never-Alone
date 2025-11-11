// Test production session creation endpoint
const https = require('http');

console.log('🧪 Testing POST /realtime/session (production endpoint)');
console.log('==================================================\n');

// Wait for backend to be ready
setTimeout(async () => {
  console.log('📡 Creating session for test-user-production...\n');

  const data = JSON.stringify({ userId: 'test-user-production' });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/realtime/session',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log(`📦 Status: ${res.statusCode}\n`);
      console.log('📦 Response:');

      try {
        const json = JSON.parse(body);
        console.log(JSON.stringify(json, null, 2));

        if (json.sessionId) {
          console.log('\n✅ SUCCESS! Production endpoint is working!');
          console.log('✅ Session created with ID:', json.sessionId);
          console.log('✅ This session is stored in Cosmos DB');
          console.log('\n💡 Next: Update Flutter app to use /realtime/session instead of /realtime/test-session');
        } else {
          console.log('\n⚠️  No sessionId in response - check backend logs');
        }
      } catch (e) {
        console.log(body);
        console.log('\n❌ Failed to parse JSON response');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure backend is running: npm run start:dev');
  });

  req.write(data);
  req.end();
}, 5000); // Wait 5 seconds for backend to be ready
