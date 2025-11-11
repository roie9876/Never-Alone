/**
 * Add test photos to Cosmos DB for testing photo display feature
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.COSMOS_ENDPOINT) {
  console.error('❌ Error: COSMOS_ENDPOINT not found in .env file');
  process.exit(1);
}

// Use Azure AD authentication (same as backend)
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential,
});
const container = client.database('never-alone').container('photos');

// Sample photos for testing
const testPhotos = [
  {
    id: 'photo-test-001',
    userId: 'test-user-123',
    url: 'https://picsum.photos/800/600?random=1',
    thumbnailUrl: 'https://picsum.photos/200/150?random=1',
    caption: 'Sarah at the beach in Tel Aviv',
    taggedPeople: ['Sarah'],
    dateTaken: '2024-08-15T10:30:00Z',
    location: 'Tel Aviv Beach',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'family-member-001',
  },
  {
    id: 'photo-test-002',
    userId: 'test-user-123',
    url: 'https://picsum.photos/800/600?random=2',
    thumbnailUrl: 'https://picsum.photos/200/150?random=2',
    caption: 'Family gathering at Passover',
    taggedPeople: ['Sarah', 'Michael', 'Emma'],
    dateTaken: '2024-04-22T18:00:00Z',
    location: 'Home',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'family-member-001',
  },
  {
    id: 'photo-test-003',
    userId: 'test-user-123',
    url: 'https://picsum.photos/800/600?random=3',
    thumbnailUrl: 'https://picsum.photos/200/150?random=3',
    caption: 'Beautiful roses in the garden',
    taggedPeople: [],
    dateTaken: '2024-05-10T09:15:00Z',
    location: 'Home garden',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'family-member-001',
  },
  {
    id: 'photo-test-004',
    userId: 'test-user-123',
    url: 'https://picsum.photos/800/600?random=4',
    thumbnailUrl: 'https://picsum.photos/200/150?random=4',
    caption: 'Emma\'s birthday party',
    taggedPeople: ['Emma', 'Sarah'],
    dateTaken: '2024-06-15T16:00:00Z',
    location: 'Tel Aviv',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'family-member-001',
  },
  {
    id: 'photo-test-005',
    userId: 'test-user-123',
    url: 'https://picsum.photos/800/600?random=5',
    thumbnailUrl: 'https://picsum.photos/200/150?random=5',
    caption: 'Family vacation in the mountains',
    taggedPeople: ['Sarah', 'Michael', 'Emma'],
    dateTaken: '2024-07-20T12:00:00Z',
    location: 'Galilee Mountains',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'family-member-001',
  },
];

async function addTestPhotos() {
  console.log('📷 Adding test photos to Cosmos DB...\n');

  for (const photo of testPhotos) {
    try {
      const { resource } = await container.items.upsert(photo);
      console.log(`✅ Added: ${photo.caption}`);
      console.log(`   Tags: ${photo.taggedPeople.join(', ') || 'none'}`);
      console.log(`   URL: ${photo.url}\n`);
    } catch (error) {
      console.error(`❌ Error adding photo ${photo.id}:`, error.message);
    }
  }

  console.log('\n✅ All test photos added successfully!');
  console.log('\nTo test photo triggering, say phrases like:');
  console.log('  - "Tell me about Sarah"');
  console.log('  - "Show me family photos"');
  console.log('  - "I feel lonely" (should trigger happy family photos)');
  console.log('  - "Show me the garden"');
}

addTestPhotos().catch(console.error);
