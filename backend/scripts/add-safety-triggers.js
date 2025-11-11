#!/usr/bin/env node
require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

async function addSafetyTriggers() {
  try {
    const container = client.database('never-alone').container('safety-config');
    const { resource: existingConfig } = await container.item('user-tiferet-001', 'user-tiferet-001').read();

    console.log('📝 Adding crisis triggers and safety rules to config...\n');

    // Update the config with crisis triggers and safety rules
    const updatedConfig = {
      ...existingConfig,
      boundaries: {
        ...existingConfig.boundaries,
        crisisTriggers: [
          // Physical safety - leaving home alone
          "לצאת החוצה",          // Go outside
          "אצא לטייל",            // I'll go for a walk
          "ללכת החוצה לבד",       // Walk outside alone
          "לצאת לבד",             // Go out alone
          "לטייל בחוץ",           // Walk outside

          // Mental health - suicidal ideation (CRITICAL)
          "לא רוצה להיות כאן",    // Don't want to be here
          "לא בא לי לחיות",       // Don't want to live
          "נמאס לי מהחיים",       // Tired of life
          "נמאס לי לחיות",        // Tired of living
          "להיפטר מהכאב",         // Get rid of the pain
          "לפגוע בעצמי",          // Hurt myself
          "לסיים את זה",          // End this
          "סיום",                 // End
          "לעזוב",                // Leave
          "למות",                 // To die
          "רוצה למות"             // Want to die
        ],
        forbiddenTopics: [
          "פוליטיקה",  // Politics
          "ממשלה",      // Government
          "בחירות",     // Elections
          "מפלגות"      // Political parties
        ]
      },
      safetyRules: {
        neverAllow: [
          {
            rule: "leaving_home_alone",
            reason: "יציאה מהבית בלי ליווי - סכנת דרכים וסכנת אובדן"
          },
          {
            rule: "operating_dangerous_appliances",
            reason: "הפעלת מכשירי חשמל מסוכנים כמו תנור או כיריים"
          },
          {
            rule: "medication_changes",
            reason: "שינוי מינון תרופות ללא אישור רופא"
          }
        ],
        redirectToFamily: [
          "medical_questions",
          "financial_decisions",
          "leaving_home",
          "appliance_usage"
        ],
        approvedActivities: [
          "ישיבה בגינה",      // Sitting in garden
          "האזנה למוזיקה",     // Listening to music
          "צפייה בתמונות",     // Looking at photos
          "שיחה",              // Conversation
          "קריאה",             // Reading
          "צפייה בטלוויזיה"    // Watching TV
        ]
      }
    };

    await container.item('user-tiferet-001', 'user-tiferet-001').replace(updatedConfig);

    console.log('✅ Crisis Triggers Added:', updatedConfig.boundaries.crisisTriggers.length);
    console.log('✅ Forbidden Topics Added:', updatedConfig.boundaries.forbiddenTopics.length);
    console.log('✅ Never Allow Rules Added:', updatedConfig.safetyRules.neverAllow.length);
    console.log('✅ Approved Activities Added:', updatedConfig.safetyRules.approvedActivities.length);
    console.log('\n✅ Safety config updated successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSafetyTriggers();
