/**
 * Add Test Medication for Reminder Testing
 *
 * This script adds a test medication scheduled for 5 minutes from now
 * to the safety-config for user-tiferet-001.
 *
 * Usage: node -r dotenv/config scripts/add-test-medication.js
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function addTestMedication() {
  console.log('🔔 Adding test medication for reminder testing...\n');

  // Initialize Cosmos DB client
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
  });

  const container = client.database('never-alone').container('safety-config');
  const userId = 'user-tiferet-001';

  // Calculate test medication time (5 minutes from now)
  const testTime = new Date(Date.now() + 5 * 60 * 1000);
  const timeStr = testTime.toTimeString().slice(0, 5); // HH:MM format

  console.log(`📅 Current time: ${new Date().toTimeString().slice(0, 5)}`);
  console.log(`⏰ Test medication scheduled for: ${timeStr}`);
  console.log(`⏱️  (5 minutes from now)\n`);

  try {
    // Fetch existing safety config
    const { resources } = await container.items.query({
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }]
    }).fetchAll();

    if (resources.length === 0) {
      console.error('❌ No safety config found for user-tiferet-001');
      console.log('Please run scripts/setup-tiferet-profile.js first');
      process.exit(1);
    }

    const config = resources[0];

    // Add test medication
    const testMedication = {
      name: 'Test Aspirin',
      dosage: '100mg',
      times: [timeStr]
    };

    // Initialize medications array if it doesn't exist
    if (!config.medications) {
      config.medications = [];
    }

    // Remove any existing test medications
    config.medications = config.medications.filter(m => m.name !== 'Test Aspirin');

    // Add the new test medication
    config.medications.push(testMedication);

    // Update the document
    await container.items.upsert(config);

    console.log('✅ Test medication added successfully!\n');
    console.log('📋 Current medications in config:');
    console.log(JSON.stringify(config.medications, null, 2));
    console.log('\n⏳ Reminder will fire at:', timeStr);
    console.log('🎧 Expected audio: "זה הזמן לתרופות שלך" (It\'s time for your medication)');
    console.log('\n🚀 Next steps:');
    console.log('1. Ensure backend is running (should auto-reload config)');
    console.log('2. Wait for reminder to fire in ~5 minutes');
    console.log('3. Test confirmation, snooze, or decline actions');
    console.log('4. Check reminder status in Cosmos DB (reminders container)');

  } catch (error) {
    console.error('❌ Error adding test medication:', error.message);
    process.exit(1);
  }
}

// Run the script
addTestMedication().catch(console.error);
