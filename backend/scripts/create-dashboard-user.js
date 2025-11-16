const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const crypto = require('crypto');

async function createUser() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: 'https://neveralone.documents.azure.com:443/',
      aadCredentials: credential
    });

    const database = client.database('never-alone');
    const container = database.container('users');

    // Simple SHA-256 hash for demo (NOT production-grade)
    // In production, use bcrypt or similar
    const passwordHash = crypto.createHash('sha256').update('demo123').digest('hex');
    console.log(`\n🔐 Password hashed successfully (SHA-256 for demo)`);

    // Create user document
    const user = {
      id: `user-${Date.now()}`,
      email: 'sarah@example.com',
      passwordHash: passwordHash,
      role: 'family',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Link to patient profile (Tiferet)
      patientUserId: 'user-tiferet-001',
      name: 'Sarah Cohen',
      relationship: 'daughter',
    };

    console.log(`\n👤 Creating user:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Patient: ${user.patientUserId}`);
    console.log(`   - Name: ${user.name}`);
    console.log(`   - Password Hash: ${passwordHash.substring(0, 16)}...`);

    // Save to database
    await container.items.create(user);

    console.log(`\n✅ User created successfully!`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: sarah@example.com`);
    console.log(`   Password: demo123`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUser();
