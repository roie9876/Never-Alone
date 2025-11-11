/**
 * Migration Script: Add Patient Background to Tiferet's Safety Config
 *
 * Adds patientBackground field to existing safety-config document
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || 'https://neveralone.documents.azure.com:443/';
const DATABASE_NAME = 'never-alone';
const CONTAINER_NAME = 'safety-config';
const USER_ID = 'user-tiferet-001';

async function migratePatientBackground() {
  console.log('🚀 Starting patient background migration...\n');

  try {
    // Initialize Cosmos DB client with Azure AD
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: COSMOS_ENDPOINT,
      aadCredentials: credential
    });

    const database = client.database(DATABASE_NAME);
    const container = database.container(CONTAINER_NAME);

    // 1. Query existing safety config
    console.log(`📖 Fetching safety config for user: ${USER_ID}`);
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: USER_ID }]
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    if (resources.length === 0) {
      console.error(`❌ No safety config found for user: ${USER_ID}`);
      process.exit(1);
    }

    const existingConfig = resources[0];
    console.log(`✅ Found existing config (ID: ${existingConfig.id})`);
    console.log(`   Created: ${existingConfig.createdAt}`);
    console.log(`   Has patientBackground: ${!!existingConfig.patientBackground}\n`);

    // 2. Check if patient background already exists
    if (existingConfig.patientBackground) {
      console.log('⚠️  Patient background already exists. Current data:');
      console.log(`   Name: ${existingConfig.patientBackground.fullName}`);
      console.log(`   Age: ${existingConfig.patientBackground.age}`);
      console.log('\n🤔 Do you want to overwrite? (Ctrl+C to cancel, or modify script)');
      // In production, add prompt here. For now, continue with update.
    }

    // 3. Add patient background
    const updatedConfig = {
      ...existingConfig,
      patientBackground: {
        fullName: 'תפארת נחמיה',
        age: 82,
        medicalCondition: 'דמנציה בשלב מוקדם, סוכרת מסוג 2 מאוזנת, בריאות לב תקינה עם נטילת אספירין יומית. זיכרון קצר לטווח קצר נפגע, אך זיכרונות מהעבר חדים.',
        personality: 'אדם חם ומסביר פנים, אוהב לספר סיפורים על העבר. היה מורה למתמטיקה במשך 40 שנה. מאוד גאה במשפחתו, במיוחד בנכדיו. נוטה להיות דאגן לגבי דברים קטנים.',
        hobbies: 'גינון - יש לו גינה קטנה עם ורדים שהוא מאוד גאה בהם. אוהב להאזין למוזיקה ישראלית קלאסית (נעמי שמר, אריק איינשטיין). נהנה לצפות בציפורים מחלון המטבח. אוהב לשחק שש-בש עם שכנים.',
        familyContext: 'נשוי לצביה 58 שנה. שתי בנות: מיכל (בת 52) גרה בחיפה, רחלי (בת 49) גרה בתל אביב. 5 נכדים. צביה היא המטפלת העיקרית, והבנות מבקרות בסופי שבוע לסירוגין.',
        importantMemories: 'נולד בירושלים, גדל בשכונת נחלאות. פגש את צביה בבית ספר תיכוני. זוכר בבירור את החתונה ב-1967. גאה מאוד בקריירה שלו כמורה - הרבה תלמידים לשעבר עדיין יוצרים איתו קשר.',
      },
      updatedAt: new Date().toISOString()
    };

    // 4. Replace document in Cosmos DB
    console.log('\n📝 Updating safety config with patient background...');
    const { resource: updated } = await container
      .item(existingConfig.id, USER_ID)
      .replace(updatedConfig);

    console.log('✅ Migration complete!\n');
    console.log('📋 Updated fields:');
    console.log(`   - patientBackground.fullName: ${updated.patientBackground.fullName}`);
    console.log(`   - patientBackground.age: ${updated.patientBackground.age}`);
    console.log(`   - patientBackground.medicalCondition: ${updated.patientBackground.medicalCondition.substring(0, 50)}...`);
    console.log(`   - patientBackground.personality: ${updated.patientBackground.personality.substring(0, 50)}...`);
    console.log(`   - patientBackground.hobbies: ${updated.patientBackground.hobbies.substring(0, 50)}...`);
    console.log(`   - patientBackground.familyContext: ${updated.patientBackground.familyContext.substring(0, 50)}...`);
    console.log(`   - patientBackground.importantMemories: ${updated.patientBackground.importantMemories.substring(0, 50)}...`);
    console.log(`   - updatedAt: ${updated.updatedAt}\n`);

    console.log('✨ Next steps:');
    console.log('   1. Restart backend to load new config');
    console.log('   2. Start a Realtime session');
    console.log('   3. Check system prompt includes patient background');
    console.log('   4. Verify AI uses patient context in responses\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Network error - check your internet connection');
    } else if (error.code === 401) {
      console.error('\n💡 Authentication error - ensure Azure AD credentials are configured');
      console.error('   Run: az login');
    }
    process.exit(1);
  }
}

// Run migration
migratePatientBackground();
