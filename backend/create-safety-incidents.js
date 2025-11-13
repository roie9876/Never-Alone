require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: new DefaultAzureCredential()
});

async function createSafetyIncidents() {
  try {
    const database = client.database('never-alone');

    console.log('📦 Creating SafetyIncidents container...');

    const { container } = await database.containers.createIfNotExists({
      id: 'SafetyIncidents',
      partitionKey: {
        paths: ['/userId'],
        version: 2
      }
    });

    console.log('✅ SafetyIncidents container created!');

    // Create 2 test incidents
    console.log('\n🚨 Creating test safety incidents...');

    const incidents = [
      {
        id: 'alert-001',
        userId: 'user-tiferet-001',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        incidentType: 'leaving_home_alone',
        context: {
          userRequest: 'אני רוצה לצאת לחפש את צביה',
          aiResponse: 'בוא נשאל את מיכל קודם',
        },
        safetyRule: { ruleName: 'Never allow leaving home alone' },
        resolved: false,
      },
      {
        id: 'alert-002',
        userId: 'user-tiferet-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: 'medium',
        incidentType: 'medication_refusal',
        context: {
          userRequest: 'לא רוצה תרופה',
          aiResponse: 'זה חשוב לבריאותך',
        },
        resolved: true,
        resolvedBy: 'שרה כהן',
        resolvedAt: new Date().toISOString(),
      },
    ];

    for (const incident of incidents) {
      try {
        await container.items.create(incident);
        console.log(`✅ Created ${incident.severity} alert: ${incident.incidentType}`);
      } catch (err) {
        if (err.code === 409) {
          console.log(`ℹ️  Alert ${incident.id} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All done! Test data ready.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createSafetyIncidents();
