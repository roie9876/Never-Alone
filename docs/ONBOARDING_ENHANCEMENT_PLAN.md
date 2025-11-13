# 🚀 Family Onboarding Enhancement Plan

**Date:** November 11, 2025  
**Goal:** Transform static Tiferet profile → Dynamic multi-family onboarding system  
**Priority:** HIGH (Core feature for scalability)

---

## 🎯 Vision

**Current State:**
- ✅ Dashboard with 7-part onboarding form (Task 4.1 complete)
- ✅ Safety config saved to Cosmos DB
- ❌ **PROBLEM:** Backend uses hardcoded Tiferet profile
- ❌ **PROBLEM:** System prompt is static (lines 447-530 in realtime.service.ts)
- ❌ **PROBLEM:** Cannot onboard multiple families

**Target State:**
- ✅ Family signs up → Creates patient profile
- ✅ Fills comprehensive onboarding form (10-15 minutes)
- ✅ System prompt **dynamically generated** from their data
- ✅ Photos uploaded + tagged with family member names
- ✅ Music preferences configured (Spotify/YouTube)
- ✅ Medications → Auto-generate reminder schedule
- ✅ Multiple families supported (each with own config)

---

## 📋 Current Architecture Analysis

### What We Have (Working)

1. **Dashboard Onboarding Form** (`dashboard/` folder)
   - 7 steps already built
   - Saves to Cosmos DB `safety-config` container
   - Validation with Zod schemas
   - YAML generation working

2. **Backend Safety Config Loading** (`backend/src/services/realtime.service.ts`)
   - `loadSafetyConfig()` method (line ~425)
   - `loadUserProfile()` method (line ~410)
   - `buildSystemPrompt()` method (lines 447-530)
   - Crisis triggers working (16 triggers tested)

3. **Database Containers** (Cosmos DB)
   - `safety-config` - Crisis triggers, forbidden topics, never-allow rules
   - `users` - (exists but not fully utilized)
   - `photos` - Manual tags, blob URLs
   - `user-music-preferences` - (planned, not implemented)

### What's Missing (Blockers)

1. **User Profile Schema** - No comprehensive user document structure
2. **Photo Upload Flow** - Dashboard can't upload photos yet
3. **Music Integration** - Dashboard has no music preferences form
4. **Medication Scheduling** - Dashboard collects meds, backend doesn't schedule
5. **Multi-Family Support** - No authentication/user management

---

## 🏗️ Implementation Plan

### Phase 1: User Profile System (Week 1) ⚡

#### 1.1 Create Comprehensive User Profile Schema

**New Container:** `user-profiles` (or expand existing `users`)

```typescript
interface UserProfile {
  // Identity
  id: string;                    // "profile_user-abc123"
  userId: string;                // Partition key (same as safety-config)
  createdAt: string;
  updatedAt: string;
  
  // Patient Information (from onboarding Part 1)
  personalInfo: {
    firstName: string;           // "תפארת"
    lastName?: string;           // "נחמיה"
    fullName: string;            // "תפארת נחמיה"
    age: number;                 // 82
    gender: 'male' | 'female' | 'other' | 'not-specified';
    primaryLanguage: 'he' | 'en'; // Default: 'he'
    timezone: string;            // "Asia/Jerusalem"
    
    // Cognitive condition
    cognitiveCondition: 'dementia' | 'alzheimers' | 'mci' | 'none' | 'other';
    cognitiveStage?: 'mild' | 'moderate' | 'severe';
    otherCondition?: string;
  };
  
  // Family Members (from onboarding)
  familyMembers: Array<{
    id: string;                  // "fam_abc123"
    name: string;                // "מיכל"
    relationship: string;        // "בת" (daughter)
    phone: string;               // "+972-50-xxx-xxxx"
    email?: string;
    isPrimaryContact: boolean;   // True for emergency contact #1
    canReceiveAlerts: boolean;   // SMS/email notifications
    photoIds: string[];          // Photos they're tagged in
  }>;
  
  // Medical Information (from onboarding Part 2)
  medical: {
    allergies: {
      medications: string[];     // ["Penicillin"]
      foods: string[];           // ["Peanuts"]
      other: string[];
    };
    conditions: string[];        // ["Diabetes", "Heart condition"]
    mobilityIssues: string[];    // ["Uses walker", "Fall risk"]
    dietaryRestrictions: string[]; // ["Low sodium", "Diabetic diet"]
  };
  
  // Medications (from onboarding - used for reminders)
  medications: Array<{
    id: string;                  // "med_abc123"
    name: string;                // "Metformin"
    dosage: string;              // "500mg"
    times: string[];             // ["08:00", "20:00"]
    instructions: string;        // "Take with food"
    critical: boolean;           // True for life-critical meds
  }>;
  
  // Daily Routines (from onboarding Part 3)
  routines: {
    wakeTime: string;            // "07:00"
    breakfastTime: string;       // "08:00"
    lunchTime: string;           // "13:00"
    dinnerTime: string;          // "19:00"
    sleepTime: string;           // "22:00"
    
    // Check-in schedule
    checkInTimes: string[];      // ["10:00", "15:00", "19:00"]
    checkInFrequency: 'hourly' | '2-hours' | '4-hours' | 'custom';
  };
  
  // Interests & Hobbies (for conversation topics)
  interests: {
    hobbies: string[];           // ["Gardening", "Reading", "Cooking"]
    favoriteTopics: string[];    // ["Family stories", "Recipes", "Garden"]
    avoidTopics: string[];       // ["Politics", "Death", "Money"]
  };
  
  // Music Preferences (NEW - optional)
  music?: {
    enabled: boolean;
    preferredArtists: string[];  // ["Naomi Shemer", "Arik Einstein"]
    preferredSongs: string[];    // ["ירושלים של זהב"]
    preferredGenres: string[];   // ["Israeli classics", "1960s folk"]
    musicService: 'youtube-music' | 'spotify' | 'apple-music';
    
    // Behavior rules
    allowAutoPlay: boolean;      // Can AI suggest music without asking?
    playOnSadness: boolean;      // Auto-play when sad?
    maxSongsPerSession: number;  // 1-5
  };
  
  // Photos (managed separately, but referenced here)
  photos: {
    totalCount: number;
    lastUploadedAt?: string;
    storageContainer: string;    // "user-photos"
  };
  
  // AI Behavior Settings
  aiSettings: {
    aiName: string;              // "נורה" or custom name
    voiceId: string;             // "alloy" (Azure OpenAI voice)
    responseStyle: 'concise' | 'detailed' | 'storytelling';
    maxConversationMinutes: number; // Auto-end after X minutes
  };
}
```

**Backend Changes:**

1. **Update `loadUserProfile()` method** (realtime.service.ts):
```typescript
private async loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { resource } = await this.azureConfig.userProfilesContainer.items
      .query(`SELECT * FROM c WHERE c.userId = "${userId}"`)
      .fetchAll();
    
    if (resource.length === 0) {
      this.logger.warn(`No profile found for user: ${userId}`);
      return null;
    }
    
    return resource[0] as UserProfile;
  } catch (error) {
    this.logger.error(`Failed to load user profile: ${error.message}`);
    return null;
  }
}
```

2. **Update `buildSystemPrompt()` to use profile** (realtime.service.ts):
```typescript
private buildSystemPrompt(context: SystemPromptContext): string {
  const profile = context.userProfile; // Now passed in
  
  return `You are ${profile.aiSettings.aiName || 'נורה'}, a warm, empathetic AI companion.

# CRITICAL LANGUAGE INSTRUCTION
${profile.personalInfo.primaryLanguage === 'he' ? 
  'אתה חייב לדבר בעברית בלבד! תמיד תענה בעברית.' : 
  'Always speak in English.'}

# USER CONTEXT
Name: ${profile.personalInfo.fullName}
Age: ${profile.personalInfo.age}
Cognitive Condition: ${profile.personalInfo.cognitiveCondition}
Stage: ${profile.personalInfo.cognitiveStage || 'N/A'}

# FAMILY MEMBERS
${profile.familyMembers.map(fm => 
  `- ${fm.name} (${fm.relationship}${fm.isPrimaryContact ? ' - PRIMARY CONTACT' : ''})`
).join('\n')}

# MEDICAL INFORMATION
Allergies: ${profile.medical.allergies.medications.join(', ') || 'None'}
Conditions: ${profile.medical.conditions.join(', ') || 'None'}
Dietary Restrictions: ${profile.medical.dietaryRestrictions.join(', ') || 'None'}

# MEDICATIONS
${profile.medications.map(med => 
  `- ${med.name} (${med.dosage}) at ${med.times.join(', ')}${med.critical ? ' ⚠️ CRITICAL' : ''}`
).join('\n')}

# HOBBIES & INTERESTS
Loves to talk about: ${profile.interests.favoriteTopics.join(', ')}
Hobbies: ${profile.interests.hobbies.join(', ')}
AVOID these topics: ${profile.interests.avoidTopics.join(', ')}

# DAILY ROUTINE
Wake: ${profile.routines.wakeTime}
Meals: ${profile.routines.breakfastTime}, ${profile.routines.lunchTime}, ${profile.routines.dinnerTime}
Sleep: ${profile.routines.sleepTime}

${profile.music?.enabled ? `
# MUSIC PREFERENCES
Favorite artists: ${profile.music.preferredArtists.join(', ')}
Favorite songs: ${profile.music.preferredSongs.join(', ')}
${profile.music.playOnSadness ? '⚠️ When user is sad, you can suggest playing music' : ''}
` : ''}

# SAFETY RULES
${this.formatSafetyRules(context.safetyRules)}

# MEMORY & PHOTOS
[... rest of system prompt ...]
`;
}
```

#### 1.2 Database Schema Setup

**Action:** Create script `backend/scripts/migrate-user-profiles.ts`

```typescript
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

async function migrateUserProfiles() {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: new DefaultAzureCredential()
  });
  
  const database = client.database('never-alone');
  
  // 1. Create user-profiles container (if not exists)
  try {
    await database.containers.createIfNotExists({
      id: 'user-profiles',
      partitionKey: '/userId',
      indexingPolicy: {
        automatic: true,
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_etag/?' }]
      }
    });
    console.log('✅ user-profiles container created');
  } catch (error) {
    console.log('Container already exists or error:', error.message);
  }
  
  // 2. Migrate Tiferet's data from old format to new UserProfile schema
  const tifertProfile: UserProfile = {
    id: 'profile_user-tiferet-001',
    userId: 'user-tiferet-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    personalInfo: {
      firstName: 'תפארת',
      lastName: 'נחמיה',
      fullName: 'תפארת נחמיה',
      age: 82,
      gender: 'male',
      primaryLanguage: 'he',
      timezone: 'Asia/Jerusalem',
      cognitiveCondition: 'dementia',
      cognitiveStage: 'moderate',
    },
    
    familyMembers: [
      {
        id: 'fam_tzviya',
        name: 'צביה',
        relationship: 'אישה',
        phone: '+972-50-123-4567',
        email: 'tzviya@example.com',
        isPrimaryContact: true,
        canReceiveAlerts: true,
        photoIds: ['photo_001', 'photo_002', 'photo_003']
      },
      {
        id: 'fam_michal',
        name: 'מיכל',
        relationship: 'בת',
        phone: '+972-50-234-5678',
        email: 'michal@example.com',
        isPrimaryContact: false,
        canReceiveAlerts: true,
        photoIds: ['photo_001', 'photo_004']
      },
      {
        id: 'fam_racheli',
        name: 'רחלי',
        relationship: 'בת',
        phone: '+972-50-345-6789',
        isPrimaryContact: false,
        canReceiveAlerts: true,
        photoIds: ['photo_005', 'photo_006']
      }
    ],
    
    medical: {
      allergies: {
        medications: ['Penicillin'],
        foods: [],
        other: []
      },
      conditions: ['Diabetes', 'Dementia'],
      mobilityIssues: ['Uses walker occasionally'],
      dietaryRestrictions: ['Low sodium']
    },
    
    medications: [
      {
        id: 'med_metformin',
        name: 'Metformin',
        dosage: '500mg',
        times: ['08:00', '20:00'],
        instructions: 'Take with food',
        critical: true
      },
      {
        id: 'med_aspirin',
        name: 'Aspirin',
        dosage: '81mg',
        times: ['08:00'],
        instructions: 'Take with breakfast',
        critical: false
      }
    ],
    
    routines: {
      wakeTime: '07:00',
      breakfastTime: '08:00',
      lunchTime: '13:00',
      dinnerTime: '19:00',
      sleepTime: '22:00',
      checkInTimes: ['10:00', '15:00', '19:00'],
      checkInFrequency: '4-hours'
    },
    
    interests: {
      hobbies: ['Gardening', 'Watching birds', 'Family stories'],
      favoriteTopics: ['Family', 'Garden', 'Old recipes'],
      avoidTopics: ['Politics', 'Israeli-Palestinian conflict']
    },
    
    music: {
      enabled: true,
      preferredArtists: ['Naomi Shemer', 'Arik Einstein', 'Shalom Hanoch'],
      preferredSongs: ['ירושלים של זהב', 'אני ואתה'],
      preferredGenres: ['Israeli classics', '1960s Hebrew songs'],
      musicService: 'youtube-music',
      allowAutoPlay: false,
      playOnSadness: true,
      maxSongsPerSession: 3
    },
    
    photos: {
      totalCount: 6,
      lastUploadedAt: '2025-11-10T12:00:00Z',
      storageContainer: 'user-photos'
    },
    
    aiSettings: {
      aiName: 'נורה',
      voiceId: 'alloy',
      responseStyle: 'concise',
      maxConversationMinutes: 30
    }
  };
  
  // Save to database
  const container = database.container('user-profiles');
  await container.items.upsert(tifertProfile);
  console.log('✅ Tiferet profile migrated to new schema');
}

migrateUserProfiles().catch(console.error);
```

**Run migration:**
```bash
cd backend
node -r ts-node/register scripts/migrate-user-profiles.ts
```

---

### Phase 2: Dashboard Enhancements (Week 2) 🎨

#### 2.1 Expand Onboarding Form (8 → 12 Steps)

**New Steps to Add:**

**Step 8: Music Preferences** (OPTIONAL) 🎵
- Already documented in music-integration.md
- Form fields:
  - [ ] Enable music playback
  - Preferred artists (comma-separated)
  - Preferred songs (comma-separated)
  - Music genres
  - [ ] Allow AI to suggest music automatically
  - [ ] Play calming music when sad/anxious
  - Max songs per session (1-5 slider)

**Step 9: Interests & Conversation Topics** (NEW)
- Hobbies (tags: Gardening, Reading, Cooking, etc.)
- Favorite conversation topics (free text + suggested tags)
- Topics to AVOID (e.g., Politics, Money, Health)

**Step 10: Photo Upload & Tagging** (NEW - CRITICAL)
- Upload photos from computer/phone
- Auto-upload to Azure Blob Storage
- Manual tagging interface:
  - "Who is in this photo?" (checkboxes for family members)
  - Date taken (optional)
  - Location (optional)
  - Caption (optional)
- Drag-to-reorder for priority

**Step 11: Daily Routine Configuration** (NEW)
- Wake time, meal times, sleep time
- Check-in frequency (every 2 hours, 4 hours, etc.)
- Best times for conversations (avoid nap times)

**Step 12: Review & Launch**
- Show summary of all configuration
- "Start First Conversation" button
- Email confirmation sent to family

#### 2.2 Photo Upload Component

**New Component:** `dashboard/components/PhotoUpload.tsx`

```typescript
import { useState } from 'react';
import { uploadPhotoToBlob } from '@/lib/azure-blob';

export function PhotoUpload({ userId, familyMembers }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    
    for (const file of Array.from(files)) {
      // 1. Upload to Azure Blob Storage
      const blobUrl = await uploadPhotoToBlob(file, userId);
      
      // 2. Create photo metadata document
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const photoDoc = {
        id: photoId,
        userId: userId,
        blobUrl: blobUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        manualTags: [], // Will be filled in next step
        taggedPeople: [], // Will be filled in tagging UI
        capturedDate: null,
        location: null,
        caption: ''
      };
      
      // 3. Save to Cosmos DB photos container
      await savePhotoMetadata(photoDoc);
      
      setPhotos(prev => [...prev, photoDoc]);
    }
    
    setUploading(false);
  };
  
  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept="image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      
      {uploading && <p>Uploading...</p>}
      
      <div className="photo-grid">
        {photos.map(photo => (
          <PhotoTaggingCard 
            key={photo.id}
            photo={photo}
            familyMembers={familyMembers}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoTaggingCard({ photo, familyMembers }) {
  const [tags, setTags] = useState(photo.taggedPeople || []);
  
  const toggleTag = (name: string) => {
    setTags(prev => 
      prev.includes(name) 
        ? prev.filter(t => t !== name)
        : [...prev, name]
    );
  };
  
  const saveTagsToDatabase = async () => {
    await updatePhotoTags(photo.id, tags);
  };
  
  return (
    <div className="photo-card">
      <img src={photo.blobUrl} alt={photo.fileName} />
      
      <div className="tagging-section">
        <p>Who is in this photo?</p>
        {familyMembers.map(member => (
          <label key={member.id}>
            <input 
              type="checkbox"
              checked={tags.includes(member.name)}
              onChange={() => toggleTag(member.name)}
            />
            {member.name} ({member.relationship})
          </label>
        ))}
      </div>
      
      <button onClick={saveTagsToDatabase}>Save Tags</button>
    </div>
  );
}
```

#### 2.3 Music Preferences Form

**New Component:** `dashboard/components/MusicPreferences.tsx`

```typescript
export function MusicPreferencesForm({ userId, onSave }) {
  const [enabled, setEnabled] = useState(false);
  const [artists, setArtists] = useState('');
  const [songs, setSongs] = useState('');
  const [allowAutoPlay, setAllowAutoPlay] = useState(false);
  
  const handleSave = async () => {
    const musicPrefs = {
      enabled,
      preferredArtists: artists.split(',').map(s => s.trim()),
      preferredSongs: songs.split(',').map(s => s.trim()),
      preferredGenres: [], // Can add later
      musicService: 'youtube-music',
      allowAutoPlay,
      playOnSadness: true,
      maxSongsPerSession: 3
    };
    
    await saveMusicPreferences(userId, musicPrefs);
    onSave(musicPrefs);
  };
  
  return (
    <div>
      <h2>🎵 Music Preferences (Optional)</h2>
      
      <label>
        <input 
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable music playback
      </label>
      
      {enabled && (
        <>
          <label>
            Preferred Artists (comma-separated)
            <input 
              type="text"
              placeholder="e.g., Naomi Shemer, Arik Einstein"
              value={artists}
              onChange={(e) => setArtists(e.target.value)}
            />
          </label>
          
          <label>
            Preferred Songs (comma-separated)
            <input 
              type="text"
              placeholder="e.g., ירושלים של זהב, אני ואתה"
              value={songs}
              onChange={(e) => setSongs(e.target.value)}
            />
          </label>
          
          <label>
            <input 
              type="checkbox"
              checked={allowAutoPlay}
              onChange={(e) => setAllowAutoPlay(e.target.checked)}
            />
            Allow AI to suggest music automatically
          </label>
        </>
      )}
      
      <button onClick={handleSave}>Save Music Preferences</button>
    </div>
  );
}
```

---

### Phase 3: Backend Integration (Week 3) ⚙️

#### 3.1 Update Realtime Service

**Changes needed in `backend/src/services/realtime.service.ts`:**

1. **Replace hardcoded profile with dynamic loading:**

```typescript
async createSession(config: RealtimeSessionConfig): Promise<RealtimeSession> {
  this.logger.log(`Creating Realtime session for user: ${config.userId}`);

  // 1. Load user profile (NEW comprehensive schema)
  const userProfile = await this.loadUserProfile(config.userId);
  if (!userProfile) {
    throw new Error(`No profile found for user: ${config.userId}`);
  }

  // 2. Load all memory tiers
  const memories = await this.memoryService.loadMemory(config.userId);

  // 3. Load safety config
  const safetyConfig = await this.loadSafetyConfig(config.userId);

  // 4. Build dynamic system prompt from profile
  const systemPrompt = this.buildSystemPrompt({
    userProfile,       // Pass entire profile object
    safetyRules: safetyConfig,
    memories,
  });

  // ... rest of session creation
}
```

2. **Update `buildSystemPrompt()` signature:**

```typescript
private buildSystemPrompt(context: {
  userProfile: UserProfile;
  safetyRules: any;
  memories: any;
}): string {
  const profile = context.userProfile;
  
  // Generate prompt dynamically from profile
  // See Phase 1.1 for full implementation
}
```

#### 3.2 Medication Reminder Auto-Scheduling

**New Method:** `scheduleMedicationReminders()`

```typescript
// backend/src/services/reminder.service.ts

async scheduleMedicationRemindersForUser(userId: string) {
  // 1. Load user profile
  const profile = await this.loadUserProfile(userId);
  
  // 2. For each medication, create reminders
  for (const med of profile.medications) {
    for (const time of med.times) {
      await this.createReminder({
        userId,
        type: 'medication',
        medicationId: med.id,
        medicationName: med.name,
        scheduledTime: time, // "08:00"
        critical: med.critical,
        instructions: med.instructions
      });
    }
  }
  
  this.logger.log(`✅ Created ${profile.medications.length} medication reminders`);
}
```

**Call this after onboarding complete:**
```typescript
// After saving user profile in dashboard
await reminderService.scheduleMedicationRemindersForUser(userId);
```

---

### Phase 4: Multi-Family Support (Week 4) 👥

#### 4.1 Authentication System

**Options:**
1. **Azure AD B2C** (recommended for production)
2. **Simple email/password** (MVP - faster)

**MVP Approach: NextAuth.js**

```bash
cd dashboard
npm install next-auth @auth/core
```

**Create:** `dashboard/lib/auth.ts`

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // TODO: Verify credentials against Cosmos DB users container
        const user = await verifyUser(credentials.email, credentials.password);
        return user || null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.userId = token.userId;
      return session;
    }
  }
});
```

**Protect routes:**
```typescript
// dashboard/app/onboarding/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  
  return <OnboardingForm userId={session.user.userId} />;
}
```

#### 4.2 Family Member Management

**New Container:** `family-accounts`

```typescript
interface FamilyAccount {
  id: string;                    // "account_abc123"
  email: string;                 // Primary key for login
  passwordHash: string;          // bcrypt hash
  name: string;
  phone: string;
  relationship: string;          // "Daughter", "Son", etc.
  
  // Patients they manage
  patients: Array<{
    userId: string;              // References user-profiles
    role: 'primary' | 'secondary'; // Primary = full access
    addedAt: string;
  }>;
  
  createdAt: string;
  lastLoginAt: string;
}
```

---

## 🚀 Quick Start (This Week)

### Priority 1: User Profile Migration (1-2 days)

1. **Create UserProfile interface** - `backend/src/interfaces/user-profile.interface.ts`
2. **Create migration script** - `backend/scripts/migrate-user-profiles.ts`
3. **Run migration** - Convert Tiferet's data to new schema
4. **Update `loadUserProfile()`** - Load from `user-profiles` container
5. **Update `buildSystemPrompt()`** - Use profile data dynamically
6. **Test** - Verify Tiferet's sessions still work

### Priority 2: Photo Upload (2-3 days)

1. **Create PhotoUpload component** - Dashboard React component
2. **Azure Blob SDK** - Upload photos to `user-photos` container
3. **Photo metadata** - Save to Cosmos DB `photos` container
4. **Tagging UI** - Checkboxes for family members
5. **Test** - Upload 5 photos, tag them, verify `show_photos()` works

### Priority 3: Music Preferences (1 day)

1. **MusicPreferences component** - Add Step 8 to onboarding
2. **Save to user profile** - Update `music` field
3. **Backend integration** - Pass to `buildSystemPrompt()`
4. **Test** - Enable music, add songs, verify AI can call `play_music()`

---

## 📊 Success Metrics

After Phase 1-3 complete:
- ✅ Onboarding takes 10-15 minutes
- ✅ Family can upload 10+ photos with tags
- ✅ System prompt dynamically generated (no hardcoded Tiferet)
- ✅ Medication reminders auto-scheduled
- ✅ Music preferences integrated
- ✅ Can onboard 2nd family (test multi-family support)

---

## 🎯 Recommendation: Start Now

**This week's focus:**
1. **Day 1-2:** User profile migration script + test
2. **Day 3-4:** Photo upload component + Azure Blob integration
3. **Day 5:** Music preferences form + backend integration

**Next week:**
- Expand onboarding form (Steps 8-12)
- Authentication system (NextAuth.js)
- Multi-family support

This transforms Never Alone from **single-family prototype** → **scalable multi-family platform**.

---

**Ready to start? I recommend beginning with the User Profile migration script. Should I create that file now?**
