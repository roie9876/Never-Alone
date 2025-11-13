const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

async function testAPILogic() {
  try {
    console.log('\n🧪 Testing Conversations API Logic\n');
    
    // Simulate the API flow
    const userEmail = 'sarah@example.com';
    console.log('1️⃣ Simulating request with email:', userEmail);
    
    // Connect to Cosmos DB
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });

    const database = client.database('never-alone');
    
    // Step 1: Find family member
    console.log('\n2️⃣ Querying FamilyMembers container...');
    const familyMembersContainer = database.container('FamilyMembers');
    
    const { resources: familyMembers } = await familyMembersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: userEmail }],
      })
      .fetchAll();

    console.log('   📋 Family members found:', familyMembers.length);
    
    if (familyMembers.length === 0) {
      console.log('   ❌ NO FAMILY MEMBER FOUND!');
      console.log('   This explains the 404 error');
      return;
    }
    
    console.log('   ✅ Family member found:');
    console.log('      Email:', familyMembers[0].email);
    console.log('      User ID:', familyMembers[0].userId);
    console.log('      Name:', familyMembers[0].name);
    
    const userId = familyMembers[0].userId;
    
    // Step 2: Query conversations
    console.log('\n3️⃣ Querying conversations container...');
    const conversationsContainer = database.container('conversations');
    
    const { resources: conversations } = await conversationsContainer.items
      .query({
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.startTime DESC
        `,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    console.log('   📊 Conversations found:', conversations.length);
    
    if (conversations.length > 0) {
      console.log('   ✅ Sample conversation:');
      console.log('      ID:', conversations[0].id);
      console.log('      Start time:', conversations[0].startTime);
      console.log('      Turns:', conversations[0].turns?.length || 0);
    }
    
    console.log('\n✅ API Logic Test Complete!');
    console.log('   Would return:', conversations.length, 'conversations');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testAPILogic();
