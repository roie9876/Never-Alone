const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function createFamilyMember() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: 'https://neveralone.documents.azure.com:443/',
      aadCredentials: credential
    });

    const database = client.database('never-alone');
    const container = database.container('FamilyMembers');

    // Create family member document
    // NOTE: Using plaintext password for MVP (as Dashboard expects)
    const familyMember = {
      id: `family-${Date.now()}`,
      userId: 'user-tiferet-001', // Partition key - linked to patient
      email: 'sarah@example.com',
      password: 'demo123', // Plaintext for MVP (NOT production-grade!)
      name: 'Sarah Cohen',
      relationship: 'daughter',
      phone: '+972-50-123-4567',
      isPrimaryContact: true,
      canViewConversations: true,
      canEditSettings: true,
      receiveAlerts: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`\n👤 Creating family member in FamilyMembers container:`);
    console.log(`   - Email: ${familyMember.email}`);
    console.log(`   - Name: ${familyMember.name}`);
    console.log(`   - Relationship: ${familyMember.relationship}`);
    console.log(`   - Patient: ${familyMember.userId}`);
    console.log(`   - Password: ${familyMember.password} (plaintext for MVP)`);

    // Save to database
    await container.items.create(familyMember);

    console.log(`\n✅ Family member created successfully!`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: sarah@example.com`);
    console.log(`   Password: demo123`);
    console.log(`\n💡 You can now login to the Dashboard!`);

  } catch (error) {
    if (error.code === 409) {
      console.error('❌ Family member already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createFamilyMember();
