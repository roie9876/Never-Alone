#!/bin/bash
# Verify reminder was triggered by checking database status

cd /Users/robenhai/Never\ Alone/backend

echo "🔍 Checking reminder status in database..."
echo ""

timeout 5 node -r dotenv/config -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

(async () => {
  const container = client.database('never-alone').container('reminders');
  try {
    const { resource } = await container.item('8e2f7bbc-f1f2-4acf-ad92-d92396014912', 'user-tiferet-001').read();
    
    console.log('===== REMINDER STATUS =====');
    console.log('ID:', resource.id);
    console.log('Medication:', resource.metadata?.medicationName);
    console.log('Scheduled For:', resource.scheduledFor);
    console.log('Status:', resource.status);
    console.log('Triggered At:', resource.triggeredAt || 'NOT YET TRIGGERED');
    console.log('');
    
    if (resource.status === 'triggered') {
      console.log('✅ SUCCESS! Reminder was triggered by cron job');
    } else if (resource.status === 'pending') {
      console.log('⚠️  Still pending - cron job has not triggered it yet');
      console.log('   (Wait until 20:50 or check if cron job is running)');
    } else {
      console.log('Status:', resource.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
" 2>&1

echo ""
echo "Next: Check backend logs for cron job messages"
