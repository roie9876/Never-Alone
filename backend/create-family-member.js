require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: new DefaultAzureCredential()
});

async function createFamilyMembersContainer() {
  try {
    const database = client.database('never-alone');
    
    console.log('📦 Creating FamilyMembers container...');
    
    const { container } = await database.containers.createIfNotExists({
      id: 'FamilyMembers',
      partitionKey: {
        paths: ['/userId'],
        version: 2
      },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    });
    
    console.log('✅ FamilyMembers container created successfully!');
    
    // Now create the test family member
    console.log('\n👤 Creating test family member...');
    
    const familyMember = {
      id: 'family-sarah-001',
      userId: 'user-tiferet-001',
      email: 'sarah@example.com',
      password: 'demo123', // In production, use bcrypt!
      name: 'שרה כהן',
      phone: '+972501234567',
      relationship: 'daughter',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };
    
    await container.items.create(familyMember);
    console.log('✅ Family member created: sarah@example.com / demo123');
    
  } catch (err) {
    if (err.code === 409) {
      console.log('ℹ️  Container already exists, creating family member...');
      const container = client.database('never-alone').container('FamilyMembers');
      
      const familyMember = {
        id: 'family-sarah-001',
        userId: 'user-tiferet-001',
        email: 'sarah@example.com',
        password: 'demo123',
        name: 'שרה כהן',
        phone: '+972501234567',
        relationship: 'daughter',
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };
      
      try {
        await container.items.create(familyMember);
        console.log('✅ Family member created: sarah@example.com / demo123');
      } catch (createErr) {
        if (createErr.code === 409) {
          console.log('ℹ️  Family member already exists');
        } else {
          throw createErr;
        }
      }
    } else {
      console.error('❌ Error:', err.message);
      throw err;
    }
  }
}

createFamilyMembersContainer();
