/**
 * Test Data - Tiferet's Story
 * Pre-filled onboarding data for testing purposes
 * Based on: backend/scripts/setup-tiferet-profile.js
 */

import { OnboardingFormSchema } from './validation';
import { v4 as uuidv4 } from 'uuid';

export const TIFERET_TEST_DATA: OnboardingFormSchema = {
  // User ID (will be replaced with actual user ID in production)
  userId: 'user-tiferet-001',

  // Step 0: Patient Background (NEW - סיפור רקע)
  patientBackground: {
    fullName: 'תפארת נחמיה',
    age: 79,
    medicalCondition: 'דמנציה בשלב מוקדם, בריאות לב תקינה עם נטילת אספירין יומית. זיכרון קצר לטווח קצר נפגע, אך זיכרונות מהעבר חדים.',
    personality: 'אדם חם ומסביר פנים, אוהב לספר סיפורים על העבר. עבד בתעשיה אוורית במשך 40 שנה. מאוד גאה במשפחתו, במיוחד בנכדיו. נוטה להיות דאגן לגבי דברים קטנים.',
    hobbies: 'גינון - יש לו גינה קטנה עם ורדים שהוא מאוד גאה בהם. אוהב להאזין למוזיקה ישראלית קלאסית (נעמי שמר, אריק איינשטיין). נהנה לעבוד בגינה. .',
    familyContext: 'נשוי לצביה 51 שנה. שתי בנות: מיכל (בת 43) גרה בחיפה, רחלי (בת 49) גרה בתל אביב. 5 נכדים. צביה היא המטפלת העיקרית, והבנות מבקרות בסופי שבוע לסירוגין.',
    importantMemories: 'נולד בהודו, גדל בעלמה בצפון הארץ. פגש את צביה בבית בשירות הצבאי. זוכר בבירור את החתונה ב-1967. גאה מאוד בקריירה שלו בתעשיה אווירת.',
  },

  // Step 1: Emergency Contacts
  emergencyContacts: [
    {
      name: 'צביה נחמיה',
      phone: '+972-50-123-4567',
      relationship: 'אישה (Wife)',
    },
    {
      name: 'מיכל בן חיים',
      phone: '+972-50-234-5678',
      relationship: 'בת (Daughter)',
    },
    {
      name: 'רחלי גולבר',
      phone: '+972-50-345-6789',
      relationship: 'בת (Daughter)',
    },
  ],

  // Step 2: Medications
  medications: [
    {
      name: 'Metformin',
      dosage: '500mg',
      time: '08:00',
      specialInstructions: 'Take with food',
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      time: '20:00',
      specialInstructions: 'Take with dinner',
    },
    {
      name: 'Aspirin',
      dosage: '81mg',
      time: '08:00',
      specialInstructions: 'Take with breakfast for heart health',
    },
  ],

  // Step 3: Daily Routines
  routines: {
    wakeTime: '07:00',
    breakfastTime: '08:00',
    lunchTime: '13:00',
    dinnerTime: '19:00',
    sleepTime: '22:00',
  },

  // Step 4: Conversation Boundaries (Forbidden Topics)
  boundaries: {
    forbiddenTopics: [
      'פוליטיקה (Politics)',
      'סכסוך ישראלי-פלסטיני (Israeli-Palestinian Conflict)',
      'כסף ומצב כלכלי (Money and Financial Status)',
      'מוות ואובדן (Death and Loss)',
    ],
    notes: 'תפארת prefers positive, family-focused conversations. Avoid sensitive political topics that may cause distress.',
  },

  // Step 5: Crisis Triggers
  crisisTriggers: [
    // Physical Safety - Leaving home alone
    {
      keyword: 'לצאת החוצה',
      severity: 'critical' as const,
      action: 'Immediately alert family. Patient wants to leave home alone - high risk due to dementia.',
    },
    {
      keyword: 'אצא לטייל',
      severity: 'critical' as const,
      action: 'Alert family immediately. Patient planning to go for a walk alone.',
    },
    {
      keyword: 'ללכת החוצה לבד',
      severity: 'critical' as const,
      action: 'Critical alert - patient wants to go outside alone. Risk of disorientation.',
    },
    {
      keyword: 'לצאת לבד',
      severity: 'critical' as const,
      action: 'Alert family - patient planning to leave alone.',
    },
    {
      keyword: 'לטייל בחוץ',
      severity: 'high' as const,
      action: 'Notify family - patient discussing going outside.',
    },
    
    // Mental Health - Suicidal ideation
    {
      keyword: 'לא רוצה להיות כאן',
      severity: 'critical' as const,
      action: 'CRITICAL MENTAL HEALTH CRISIS. Immediate family contact required. Suicidal ideation detected.',
    },
    {
      keyword: 'לא בא לי לחיות',
      severity: 'critical' as const,
      action: 'CRITICAL MENTAL HEALTH CRISIS. Patient expressing desire not to live. Emergency family contact.',
    },
    {
      keyword: 'נמאס לי מהחיים',
      severity: 'critical' as const,
      action: 'CRITICAL MENTAL HEALTH CRISIS. Patient tired of life. Immediate intervention needed.',
    },
    {
      keyword: 'נמאס לי לחיות',
      severity: 'critical' as const,
      action: 'CRITICAL MENTAL HEALTH CRISIS. Suicidal ideation detected. Alert all emergency contacts.',
    },
    {
      keyword: 'להיפטר מהכאב',
      severity: 'critical' as const,
      action: 'CRITICAL. Patient wanting to get rid of pain. Potential suicidal ideation.',
    },
    {
      keyword: 'לפגוע בעצמי',
      severity: 'critical' as const,
      action: 'CRITICAL SELF-HARM RISK. Immediate family contact and potential emergency services.',
    },
    {
      keyword: 'לסיים את זה',
      severity: 'critical' as const,
      action: 'CRITICAL. Patient expressing desire to end things. Immediate crisis intervention.',
    },
    {
      keyword: 'למות',
      severity: 'critical' as const,
      action: 'CRITICAL MENTAL HEALTH CRISIS. Direct reference to death. Emergency response required.',
    },
    {
      keyword: 'רוצה למות',
      severity: 'critical' as const,
      action: 'CRITICAL. Patient expressing wish to die. Immediate family and potentially emergency services.',
    },
    
    // Self-harm
    {
      keyword: 'אני רוצה לפגוע',
      severity: 'critical' as const,
      action: 'CRITICAL SELF-HARM RISK. Patient wants to hurt self/others. Immediate intervention.',
    },
    {
      keyword: 'להזיק לעצמי',
      severity: 'critical' as const,
      action: 'CRITICAL SELF-HARM RISK. Patient expressing intent to harm self.',
    },
  ],

  // Step 6: Voice Calibration (deferred for MVP)
  voiceCalibration: {
    enabled: false,
  },

  // Step 7: Photos (Optional - empty for test data)
  photos: [],

  // Step 8: Music Preferences (Optional - NEW)
  musicPreferences: {
    enabled: true,
    preferredArtists: 'נעמי שמר, אריק איינשטיין, שלום חנוך',
    preferredSongs: 'ירושלים של זהב, אני ואתה, יושב על הגדר, שיר לשלום',
    preferredGenres: 'Israeli classics, 1960s Hebrew songs, שירי ארץ ישראל',
    allowAutoPlay: false,
    playOnSadness: true,
    maxSongsPerSession: 3,
  },

  // Metadata
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Empty form data (for starting fresh)
 */
export const EMPTY_FORM_DATA: OnboardingFormSchema = {
  userId: uuidv4(),
  patientBackground: {
    fullName: '',
    age: 70,
    medicalCondition: '',
    personality: '',
    hobbies: '',
    familyContext: '',
    importantMemories: '',
  },
  emergencyContacts: [{ name: '', phone: '', relationship: '' }],
  medications: [{ name: '', dosage: '', time: '', specialInstructions: '' }],
  routines: {
    wakeTime: '07:00',
    breakfastTime: '08:00',
    lunchTime: '12:00',
    dinnerTime: '18:00',
    sleepTime: '22:00',
  },
  boundaries: {
    forbiddenTopics: [],
    notes: '',
  },
  crisisTriggers: [],
  voiceCalibration: { enabled: false },
  photos: [],
  musicPreferences: {
    enabled: false,
    preferredArtists: '',
    preferredSongs: '',
    preferredGenres: '',
    allowAutoPlay: false,
    playOnSadness: false,
    maxSongsPerSession: 3,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Get test data based on environment or user preference
 */
export function getDefaultFormData(useTestData: boolean = false): OnboardingFormSchema {
  // In development, default to test data
  const shouldUseTestData = useTestData || process.env.NODE_ENV === 'development';
  
  return shouldUseTestData ? TIFERET_TEST_DATA : EMPTY_FORM_DATA;
}
