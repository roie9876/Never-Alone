/**
 * Setup real profile for Tiferet Nehemiah
 * Patient profile, family members, medications, and test photos
 */

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function setupTiferetProfile() {
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential,
  });

  const database = client.database('never-alone');

  console.log('🏥 Setting up Tiferet Nehemiah profile...\n');

  // ===================================================================
  // 1. USER PROFILE
  // ===================================================================
  console.log('👤 Creating user profile...');

  const userProfile = {
    id: 'user-tiferet-001',
    userId: 'user-tiferet-001',
    type: 'user_profile',
    personalInfo: {
      firstName: 'תפארת',
      lastName: 'נחמיה',
      fullName: 'תפארת נחמיה',
      age: 78,
      dateOfBirth: '1947-01-15',
      gender: 'male',
      language: 'he-IL',
      timezone: 'Asia/Jerusalem',
    },
    cognitiveMode: 'dementia-mild', // Dementia קלה
    medicalInfo: {
      conditions: ['dementia-mild', 'hypertension'],
      allergies: [],
      notes: 'יש דמנציה קלה. נמצא לבד בבית מספר פעמים בשבוע כאשר צביה הולכת למתנ"ס.',
    },
    lifestyle: {
      religiousObservance: 'שומר שבת',
      synagogueAttendance: 'קבוע - מתפלל בבית כנסת, לעיתים משמש כחזן',
      hobbies: ['עבודה בגינה', 'תפילה בבית כנסת', 'פעילות חברתית במתנ"ס'],
      dailyActivities: [
        'הולך 3 פעמים בשבוע למתנ"ס (חצי יום)',
        'עובד בגינה',
        'מתפלל בבית כנסת',
      ],
      socialSituation: 'נמצא לבד בבית מספר פעמים בשבוע',
    },
    familyMembers: [
      {
        id: 'family-001',
        name: 'צביה',
        nameEnglish: 'Tzvia',
        relationship: 'אישה',
        relationshipEnglish: 'wife',
        phone: '+972-50-1234567',
        isEmergencyContact: true,
        contactPriority: 1,
        notes: 'הולכת למתנ"ס לפעילויות חברתיות',
      },
      {
        id: 'family-002',
        name: 'מיכל',
        nameEnglish: 'Michal',
        relationship: 'בת',
        relationshipEnglish: 'daughter',
        phone: '+972-50-2345678',
        isEmergencyContact: true,
        contactPriority: 2,
      },
      {
        id: 'family-003',
        name: 'רחלי',
        nameEnglish: 'Racheli',
        relationship: 'בת',
        relationshipEnglish: 'daughter',
        phone: '+972-50-3456789',
        isEmergencyContact: true,
        contactPriority: 3,
      },
      {
        id: 'family-004',
        name: 'אופק',
        nameEnglish: 'Ofek',
        relationship: 'נכד',
        relationshipEnglish: 'grandson',
      },
      {
        id: 'family-005',
        name: 'אילי',
        nameEnglish: 'Ayli',
        relationship: 'נכד',
        relationshipEnglish: 'grandson',
      },
      {
        id: 'family-006',
        name: 'גפן',
        nameEnglish: 'Gefen',
        relationship: 'נכדה',
        relationshipEnglish: 'granddaughter',
      },
      {
        id: 'family-007',
        name: 'נועם',
        nameEnglish: 'Noam',
        relationship: 'נכד',
        relationshipEnglish: 'grandson',
      },
      {
        id: 'family-008',
        name: 'שקד',
        nameEnglish: 'Shaked',
        relationship: 'נכדה',
        relationshipEnglish: 'granddaughter',
      },
      {
        id: 'family-009',
        name: 'אליאב',
        nameEnglish: 'Eliav',
        relationship: 'נכד',
        relationshipEnglish: 'grandson',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await database.container('users').items.upsert(userProfile);
  console.log('   ✅ User profile created');

  // ===================================================================
  // 2. SAFETY CONFIGURATION
  // ===================================================================
  console.log('\n🛡️ Creating safety configuration...');

  const safetyConfig = {
    id: 'user-tiferet-001',
    userId: 'user-tiferet-001',
    type: 'safety_config',
    emergencyContacts: [
      {
        name: 'צביה',
        nameEnglish: 'Tzvia',
        phone: '+972-50-1234567',
        relationship: 'אישה',
        priority: 1,
      },
      {
        name: 'מיכל',
        nameEnglish: 'Michal',
        phone: '+972-50-2345678',
        relationship: 'בת',
        priority: 2,
      },
      {
        name: 'רחלי',
        nameEnglish: 'Racheli',
        phone: '+972-50-3456789',
        relationship: 'בת',
        priority: 3,
      },
    ],
    neverAllow: [
      {
        rule: 'לצאת מהבית לבד',
        reason: 'סיכון התמצאות בגלל הדמנציה',
      },
      {
        rule: 'להשתמש בכיריים או בתנור',
        reason: 'סיכון שריפה - דורש השגחה',
      },
      {
        rule: 'לשנות מינון תרופות',
        reason: 'רק רופא יכול לשנות מינון',
      },
    ],
    crisisTriggers: [
      'אני רוצה לצאת מהבית',
      'אני לא יודע איפה אני',
      'אני רוצה להפסיק לקחת תרופות',
      'אני רוצה לפגוע',
      'איפה צביה',
    ],
    redirectToFamily: [
      'תכנון טיולים',
      'פגישות עם רופאים',
      'שינויים בתרופות',
      'יציאה מהבית',
    ],
    approvedActivities: [
      'לשבת בגינה',
      'לקרוא ספר',
      'להקשיב למוזיקה',
      'להתפלל',
      'לצפות בתמונות משפחתיות',
      'לדבר עם המשפחה בטלפון',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await database.container('safety-config').items.upsert(safetyConfig);
  console.log('   ✅ Safety configuration created');

  // ===================================================================
  // 3. MEDICATIONS SCHEDULE
  // ===================================================================
  console.log('\n💊 Creating medication reminders...');

  const medications = [
    {
      id: 'med-tiferet-001',
      userId: 'user-tiferet-001',
      type: 'medication_reminder',
      medicationName: 'אמלודיפין (Amlodipine) 5mg',
      purpose: 'להורדת לחץ דם',
      dosage: 'כדור אחד',
      scheduledTimes: ['08:00'], // בוקר
      status: 'active',
      startDate: '2024-01-01',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-tiferet-002',
      userId: 'user-tiferet-001',
      type: 'medication_reminder',
      medicationName: 'מטפורמין (Metformin) 500mg',
      purpose: 'לאיזון סוכר בדם',
      dosage: 'כדור אחד',
      scheduledTimes: ['08:00', '20:00'], // בוקר וערב
      status: 'active',
      startDate: '2024-01-01',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-tiferet-003',
      userId: 'user-tiferet-001',
      type: 'medication_reminder',
      medicationName: 'אספירין (Aspirin) 100mg',
      purpose: 'למניעת קרישי דם',
      dosage: 'כדור אחד',
      scheduledTimes: ['20:00'], // ערב
      status: 'active',
      startDate: '2024-01-01',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-tiferet-004',
      userId: 'user-tiferet-001',
      type: 'medication_reminder',
      medicationName: 'אקסלון (Exelon) 4.6mg',
      purpose: 'לטיפול בדמנציה',
      dosage: 'מדבקה אחת',
      scheduledTimes: ['09:00'], // בוקר
      instructions: 'להחליף את המדבקה מדי יום',
      status: 'active',
      startDate: '2024-01-01',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const med of medications) {
    await database.container('reminders').items.upsert(med);
  }
  console.log(`   ✅ Created ${medications.length} medication reminders`);

  // ===================================================================
  // 4. DAILY ROUTINES
  // ===================================================================
  console.log('\n📅 Creating daily routine reminders...');

  const routines = [
    {
      id: 'routine-tiferet-001',
      userId: 'user-tiferet-001',
      type: 'daily_checkin',
      title: 'בדיקת מצב רוח בוקר',
      scheduledTime: '10:00',
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'routine-tiferet-002',
      userId: 'user-tiferet-001',
      type: 'daily_checkin',
      title: 'בדיקת מצב אחר הצהריים',
      scheduledTime: '15:00',
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'routine-tiferet-003',
      userId: 'user-tiferet-001',
      type: 'daily_checkin',
      title: 'בדיקת מצב ערב',
      scheduledTime: '19:00',
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const routine of routines) {
    await database.container('reminders').items.upsert(routine);
  }
  console.log(`   ✅ Created ${routines.length} daily check-in routines`);

  // ===================================================================
  // 5. FAMILY PHOTOS WITH HEBREW TAGS
  // ===================================================================
  console.log('\n📷 Creating family photos...');

  const photos = [
    {
      id: 'photo-tiferet-001',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=10',
      thumbnailUrl: 'https://picsum.photos/200/150?random=10',
      caption: 'תפארת וצביה בחתונה',
      manualTags: ['תפארת', 'צביה', 'Tiferet', 'Tzvia'],
      dateTaken: '1970-06-15T10:30:00Z',
      location: 'ירושלים',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-001',
    },
    {
      id: 'photo-tiferet-002',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=11',
      thumbnailUrl: 'https://picsum.photos/200/150?random=11',
      caption: 'כל המשפחה בפסח',
      manualTags: ['תפארת', 'צביה', 'מיכל', 'רחלי', 'אופק', 'אילי', 'גפן', 'נועם', 'שקד', 'אליאב',
                     'Tiferet', 'Tzvia', 'Michal', 'Racheli', 'Ofek', 'Ayli', 'Gefen', 'Noam', 'Shaked', 'Eliav'],
      dateTaken: '2024-04-22T18:00:00Z',
      location: 'בית',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-002',
    },
    {
      id: 'photo-tiferet-003',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=12',
      thumbnailUrl: 'https://picsum.photos/200/150?random=12',
      caption: 'תפארת עובד בגינה',
      manualTags: ['תפארת', 'Tiferet'],
      dateTaken: '2024-05-10T09:00:00Z',
      location: 'הגינה בבית',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-001',
    },
    {
      id: 'photo-tiferet-004',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=13',
      thumbnailUrl: 'https://picsum.photos/200/150?random=13',
      caption: 'מיכל ורחלי עם הילדים',
      manualTags: ['מיכל', 'רחלי', 'אופק', 'אילי', 'גפן', 'נועם', 'שקד', 'אליאב',
                     'Michal', 'Racheli', 'Ofek', 'Ayli', 'Gefen', 'Noam', 'Shaked', 'Eliav'],
      dateTaken: '2024-07-20T14:00:00Z',
      location: 'פארק',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-002',
    },
    {
      id: 'photo-tiferet-005',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=14',
      thumbnailUrl: 'https://picsum.photos/200/150?random=14',
      caption: 'תפארת בבית הכנסת',
      manualTags: ['תפארת', 'Tiferet'],
      dateTaken: '2024-09-15T10:00:00Z',
      location: 'בית הכנסת',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-003',
    },
    {
      id: 'photo-tiferet-006',
      userId: 'user-tiferet-001',
      url: 'https://picsum.photos/800/600?random=15',
      thumbnailUrl: 'https://picsum.photos/200/150?random=15',
      caption: 'צביה במתנ"ס',
      manualTags: ['צביה', 'Tzvia'],
      dateTaken: '2024-08-10T11:00:00Z',
      location: 'מתנ"ס',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'family-member-001',
    },
  ];

  for (const photo of photos) {
    await database.container('photos').items.upsert(photo);
  }
  console.log(`   ✅ Created ${photos.length} family photos with Hebrew tags`);

  // ===================================================================
  // 6. INITIAL MEMORIES
  // ===================================================================
  console.log('\n🧠 Creating initial long-term memories...');

  const memories = [
    {
      id: 'memory-tiferet-001',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'family_info',
      category: 'family',
      key: 'wife_name',
      value: 'אישתו של תפארת היא צביה',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-002',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'family_info',
      category: 'family',
      key: 'daughters',
      value: 'לתפארת יש שתי בנות: מיכל ורחלי',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-003',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'family_info',
      category: 'family',
      key: 'grandchildren',
      value: 'לתפארת יש 6 נכדים: אופק, אילי, גפן, נועם, שקד ואליאב',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-004',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'preference',
      category: 'hobbies',
      key: 'garden_hobby',
      value: 'תפארת אוהב לעבוד בגינה שלו',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-005',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'routine',
      category: 'religious',
      key: 'religious_observance',
      value: 'תפארת הוא אדם דתי ששומר שבת, מתפלל בבית כנסת ולעיתים משמש כחזן',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-006',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'routine',
      category: 'social',
      key: 'matnas_routine',
      value: 'תפארת הולך 3 פעמים בשבוע למתנ"ס ומבלה שם חצי יום',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'medium',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
    {
      id: 'memory-tiferet-007',
      userId: 'user-tiferet-001',
      type: 'user_memory',
      memoryType: 'health',
      category: 'medical',
      key: 'dementia_condition',
      value: 'תפארת יש דמנציה קלה. הוא בן 78 ובפנסיה',
      source: 'onboarding',
      confidenceScore: 1.0,
      importance: 'high',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    },
  ];

  for (const memory of memories) {
    await database.container('memories').items.upsert(memory);
  }
  console.log(`   ✅ Created ${memories.length} initial memories`);

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ הפרופיל של תפארת נחמיה הוקם בהצלחה!');
  console.log('='.repeat(60));
  console.log('\n📊 סיכום:');
  console.log(`   • פרופיל משתמש: תפארת נחמיה, בן 78`);
  console.log(`   • בני משפחה: צביה (אישה), מיכל ורחלי (בנות), 6 נכדים`);
  console.log(`   • תרופות: ${medications.length} תרופות לתזכורות יומיות`);
  console.log(`   • שגרה: ${routines.length} בדיקות יומיות`);
  console.log(`   • תמונות: ${photos.length} תמונות משפחתיות`);
  console.log(`   • זיכרונות: ${memories.length} זיכרונות ראשוניים`);
  console.log('\n🎯 המזהה למשתמש: user-tiferet-001');
  console.log('\nעכשיו אפשר לבדוק בפלאטר עם המשתמש user-tiferet-001');
}

setupTiferetProfile().catch(error => {
  console.error('❌ שגיאה:', error.message);
  console.error(error.stack);
  process.exit(1);
});
