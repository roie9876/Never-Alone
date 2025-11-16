const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function checkUser() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: 'https://neveralone.documents.azure.com:443/',
      aadCredentials: credential
    });

    const database = client.database('never-alone');
    const container = database.container('users');

    // Check for user with email sarah@example.com
    const query = 'SELECT * FROM c WHERE c.email = @email';
    const { resources } = await container.items
      .query({
        query,
        parameters: [{ name: '@email', value: 'sarah@example.com' }]
      })
      .fetchAll();

    console.log(`\n🔍 Searching for user: sarah@example.com`);
    console.log(`📊 Found: ${resources.length} users\n`);

    if (resources.length > 0) {
      const user = resources[0];
      console.log('✅ User found:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Password hash exists: ${user.passwordHash ? 'Yes' : 'No'}`);
      console.log(`   - Created: ${user.createdAt}`);

      if (user.passwordHash) {
        console.log(`\n🔑 Password hash: ${user.passwordHash.substring(0, 20)}...`);
      }
    } else {
      console.log('❌ No user found with this email!');
      console.log('\n💡 Need to create this user?');
    }

    // Also list all users to see what exists
    console.log('\n📋 All users in database:');
    const { resources: allUsers } = await container.items
      .query('SELECT c.id, c.email, c.role FROM c')
      .fetchAll();

    allUsers.forEach((u, idx) => {
      console.log(`   ${idx + 1}. ${u.email} (role: ${u.role}, id: ${u.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUser();
