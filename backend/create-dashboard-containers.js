require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: new DefaultAzureCredential()
});

async function createDashboardContainers() {
  try {
    const database = client.database('never-alone');

    // 1. Create Conversations container (PascalCase)
    console.log('📦 Creating Conversations container...');
    const { container: conversationsContainer } = await database.containers.createIfNotExists({
      id: 'Conversations',
      partitionKey: { paths: ['/userId'], version: 2 }
    });
    console.log('✅ Conversations container created!');

    // 2. Create Reminders container (PascalCase)
    console.log('📦 Creating Reminders container...');
    const { container: remindersContainer } = await database.containers.createIfNotExists({
      id: 'Reminders',
      partitionKey: { paths: ['/userId'], version: 2 }
    });
    console.log('✅ Reminders container created!');

    // 3. Add test data
    console.log('\n💬 Creating test conversations...');
    const today = new Date();
    const conversations = [
      {
        id: 'conv-001',
        userId: 'user-tiferet-001',
        sessionId: 'session-001',
        startedAt: new Date(today.setHours(9, 0, 0)).toISOString(),
        endedAt: new Date(today.setHours(9, 15, 0)).toISOString(),
        totalTurns: 24,
        durationSeconds: 900,
      },
      {
        id: 'conv-002',
        userId: 'user-tiferet-001',
        sessionId: 'session-002',
        startedAt: new Date(today.setHours(14, 30, 0)).toISOString(),
        endedAt: new Date(today.setHours(14, 42, 0)).toISOString(),
        totalTurns: 18,
        durationSeconds: 720,
      },
    ];

    for (const conv of conversations) {
      try {
        await conversationsContainer.items.create(conv);
        console.log(`✅ Created conversation: ${conv.id}`);
      } catch (err) {
        if (err.code === 409) {
          console.log(`ℹ️  Conversation ${conv.id} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n💊 Creating test reminders...');
    const todayStr = new Date().toISOString().split('T')[0];
    const reminders = [
      {
        id: 'reminder-001',
        userId: 'user-tiferet-001',
        type: 'medication',
        scheduledFor: `${todayStr}T08:00:00Z`,
        status: 'confirmed',
        completedAt: `${todayStr}T08:05:00Z`,
        metadata: {
          medicationName: 'Metformin 500mg',
          dosage: '1 tablet',
        },
        declineCount: 0,
      },
      {
        id: 'reminder-002',
        userId: 'user-tiferet-001',
        type: 'medication',
        scheduledFor: `${todayStr}T20:00:00Z`,
        status: 'pending',
        metadata: {
          medicationName: 'Aspirin 81mg',
          dosage: '1 tablet',
        },
        declineCount: 0,
      },
      {
        id: 'reminder-003',
        userId: 'user-tiferet-001',
        type: 'medication',
        scheduledFor: `${todayStr}T14:00:00Z`,
        status: 'missed',
        metadata: {
          medicationName: 'Vitamin D',
          dosage: '1 capsule',
        },
        declineCount: 2,
      },
    ];

    for (const reminder of reminders) {
      try {
        await remindersContainer.items.create(reminder);
        console.log(`✅ Created reminder: ${reminder.metadata.medicationName} - ${reminder.status}`);
      } catch (err) {
        if (err.code === 409) {
          console.log(`ℹ️  Reminder ${reminder.id} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All done! Dashboard should now show real data.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createDashboardContainers();
