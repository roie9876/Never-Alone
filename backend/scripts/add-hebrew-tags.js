/**
 * Add Hebrew tags to existing test photos
 * This allows photo search to work with Hebrew names
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function addHebrewTags() {
  // Use Azure AD authentication
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential,
  });

  const container = client.database('never-alone').container('photos');

  // Mapping of English names to Hebrew names
  const nameMapping = {
    'Sarah': 'שרה',
    'Michael': 'מיכל',
    'Emma': 'אמה',
  };

  console.log('🔄 Updating photos with Hebrew tags...\n');

  // Get all test photos
  const { resources: photos } = await container.items.query({
    query: 'SELECT * FROM p WHERE p.userId = @userId',
    parameters: [{ name: '@userId', value: 'test-user-123' }]
  }).fetchAll();

  for (const photo of photos) {
    const originalTags = photo.taggedPeople || [];
    const hebrewTags = originalTags.map(tag => nameMapping[tag] || tag);

    // Combine English and Hebrew tags
    const updatedTags = [...originalTags, ...hebrewTags];

    // Update the photo
    photo.taggedPeople = updatedTags;

    await container.item(photo.id, photo.userId).replace(photo);

    console.log(`✅ Updated: ${photo.caption}`);
    console.log(`   Tags: ${updatedTags.join(', ')}`);
    console.log('');
  }

  console.log('✅ All photos updated with Hebrew tags!');
  console.log('\nNow try saying: "תראה לי תמונות של שרה" (Show me photos of Sarah)');
}

addHebrewTags().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
