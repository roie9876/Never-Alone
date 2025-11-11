#!/usr/bin/env node
require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

async function verifySafetyConfig() {
  try {
    const container = client.database('never-alone').container('safety-config');
    const { resource } = await container.item('user-tiferet-001', 'user-tiferet-001').read();

    console.log('\n===== 🔒 SAFETY CONFIG VERIFICATION =====\n');

    console.log('✅ Crisis Triggers:');
    (resource.boundaries?.crisisTriggers || []).forEach(trigger => {
      console.log(`   - "${trigger}"`);
    });

    console.log('\n✅ Forbidden Topics:');
    (resource.boundaries?.forbiddenTopics || []).forEach(topic => {
      console.log(`   - "${topic}"`);
    });

    console.log('\n✅ Emergency Contacts:');
    resource.emergencyContacts.forEach(contact => {
      console.log(`   - ${contact.name} (${contact.relationship}) - ${contact.phone}`);
    });

    console.log('\n✅ Never Allow Rules:');
    if (resource.safetyRules?.neverAllow) {
      resource.safetyRules.neverAllow.forEach(rule => {
        console.log(`   - ${rule.rule}: ${rule.reason}`);
      });
    }

    console.log('\n===== ✅ VERIFICATION COMPLETE =====\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySafetyConfig();
