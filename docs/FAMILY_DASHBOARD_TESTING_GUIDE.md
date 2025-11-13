# 🧪 Family Dashboard - Testing Guide

**Created:** November 13, 2025  
**Purpose:** Step-by-step guide to test the complete Family Dashboard

---

## 🎯 Prerequisites

Before testing, ensure you have:
- ✅ Azure Cosmos DB set up with containers: `FamilyMembers`, `Reminders`, `SafetyIncidents`, `Conversations`
- ✅ Backend running on `http://localhost:3000`
- ✅ Dashboard running on `http://localhost:3001`
- ✅ Environment variables configured (`.env.local` in dashboard)

---

## 🚀 Quick Start

### Option 1: Start Everything with One Command

```bash
cd "/Users/robenhai/Never Alone"
./start.sh
```

This will:
1. Build Flutter app
2. Start backend (port 3000)
3. Start dashboard (port 3001)
4. Launch Flutter macOS app

### Option 2: Manual Start (Dashboard Only)

If you just want to test the **Family Dashboard** without Flutter:

```bash
# Terminal 1 - Backend
cd "/Users/robenhai/Never Alone/backend"
npm run start:dev

# Terminal 2 - Dashboard
cd "/Users/robenhai/Never Alone/dashboard"
npm run dev

# Open browser
open http://localhost:3001
```

---

## 📊 Step 1: Create Test Data in Cosmos DB

Before you can login, you need a family member account and some test data.

### 1.1 Create Family Member Account

Run this script to create a test family member:

```bash
cd "/Users/robenhai/Never Alone/backend"
node << 'EOF'
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

const database = client.database('never-alone');
const container = database.container('FamilyMembers');

const familyMember = {
  id: 'family-sarah-001',
  userId: 'user-tiferet-001',
  email: 'sarah@example.com',
  password: 'demo123', // In production, use bcrypt!
  name: 'שרה כהן',
  phone: '+972501234567',
  relationship: 'daughter',
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
};

container.items.create(familyMember)
  .then(() => console.log('✅ Family member created!'))
  .catch(err => console.error('❌ Error:', err));
EOF
```

### 1.2 Create Sample Reminders

```bash
node << 'EOF'
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

const database = client.database('never-alone');
const container = database.container('Reminders');

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const reminders = [
  {
    id: 'reminder-001',
    userId: 'user-tiferet-001',
    type: 'medication',
    scheduledFor: `${todayStr}T08:00:00Z`,
    status: 'confirmed',
    completedAt: `${todayStr}T08:05:00Z`,
    metadata: {
      medicationName: 'Metformin 500mg',
      dosage: '1 tablet',
    },
    declineCount: 0,
  },
  {
    id: 'reminder-002',
    userId: 'user-tiferet-001',
    type: 'medication',
    scheduledFor: `${todayStr}T20:00:00Z`,
    status: 'pending',
    metadata: {
      medicationName: 'Aspirin 81mg',
      dosage: '1 tablet',
    },
    declineCount: 0,
  },
  {
    id: 'reminder-003',
    userId: 'user-tiferet-001',
    type: 'medication',
    scheduledFor: `${todayStr}T14:00:00Z`,
    status: 'missed',
    metadata: {
      medicationName: 'Vitamin D',
      dosage: '1 capsule',
    },
    declineCount: 2,
  },
];

Promise.all(reminders.map(r => container.items.create(r)))
  .then(() => console.log('✅ Sample reminders created!'))
  .catch(err => console.error('❌ Error:', err));
EOF
```

### 1.3 Create Sample Safety Incidents

```bash
node << 'EOF'
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

const database = client.database('never-alone');
const container = database.container('SafetyIncidents');

const incidents = [
  {
    id: 'incident-001',
    userId: 'user-tiferet-001',
    timestamp: new Date().toISOString(),
    severity: 'critical',
    incidentType: 'leaving_home_alone',
    context: {
      userRequest: 'אני רוצה לצאת לחפש את צביה',
      aiResponse: 'אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם.',
    },
    safetyRule: {
      ruleName: 'Never allow leaving home alone',
      reason: 'Busy highway nearby, disorientation risk',
    },
    resolved: false,
    conversationId: 'conv-123',
  },
  {
    id: 'incident-002',
    userId: 'user-tiferet-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    severity: 'medium',
    incidentType: 'medication_refusal',
    context: {
      userRequest: 'אני לא רוצה לקחת את התרופה עכשיו',
      aiResponse: 'אני מבין, אבל התרופה חשובה לבריאותך.',
    },
    resolved: true,
    resolvedBy: 'שרה כהן',
    resolvedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

Promise.all(incidents.map(i => container.items.create(i)))
  .then(() => console.log('✅ Sample safety incidents created!'))
  .catch(err => console.error('❌ Error:', err));
EOF
```

### 1.4 Create Sample Conversations

```bash
node << 'EOF'
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

const database = client.database('never-alone');
const container = database.container('Conversations');

const today = new Date();
const conversations = [
  {
    id: 'conv-001',
    userId: 'user-tiferet-001',
    sessionId: 'session-001',
    startedAt: new Date(today.setHours(9, 0, 0)).toISOString(),
    endedAt: new Date(today.setHours(9, 15, 0)).toISOString(),
    totalTurns: 24,
    durationSeconds: 900,
  },
  {
    id: 'conv-002',
    userId: 'user-tiferet-001',
    sessionId: 'session-002',
    startedAt: new Date(today.setHours(14, 30, 0)).toISOString(),
    endedAt: new Date(today.setHours(14, 42, 0)).toISOString(),
    totalTurns: 18,
    durationSeconds: 720,
  },
];

Promise.all(conversations.map(c => container.items.create(c)))
  .then(() => console.log('✅ Sample conversations created!'))
  .catch(err => console.error('❌ Error:', err));
EOF
```

---

## 🧪 Step 2: Test Login Flow

1. **Open Dashboard:**
   ```bash
   open http://localhost:3001/login
   ```

2. **Login Credentials:**
   - Email: `sarah@example.com`
   - Password: `demo123`

3. **Expected Result:**
   - ✅ See gradient logo with purple-blue colors
   - ✅ Hebrew text: "כניסה למערכת"
   - ✅ Email and password fields
   - ✅ "התחבר" button

4. **Test Login:**
   - Enter credentials
   - Click "התחבר"
   - Should redirect to `/dashboard`

5. **Verify Authentication:**
   - Open browser DevTools → Application → Local Storage
   - Check for `authToken` (Base64 string)
   - Check for `familyMemberName` = "שרה כהן"

---

## 📊 Step 3: Test Dashboard Home

After successful login, you should see:

### 3.1 Navigation Bar
- ✅ "לא לבד" logo on right
- ✅ Greeting: "שלום, שרה כהן"
- ✅ "התנתק" (Logout) button

### 3.2 Stat Cards (4 cards)

**Card 1: Conversations Today (Blue)**
- Icon: Chat bubble
- Expected: "2" (two conversations created above)
- Label: "שיחות היום"

**Card 2: Medication Compliance (Green)**
- Icon: Checkmark
- Expected: "33%" (1 confirmed out of 3 total)
- Label: "תרופות נלקחו היום: 1/3"

**Card 3: Active Alerts (Red/Gray)**
- Icon: Warning bell
- Expected: "1" (one unresolved incident)
- Label: "התרעות פעילות!" or "אין התרעות"

**Card 4: Last Conversation (Purple)**
- Icon: Clock
- Expected: "14:42" (last conversation end time)
- Label: "שיחה אחרונה"

### 3.3 Quick Action Cards (3 cards)

**Card 1: Reminders (Blue)**
- Icon: Clipboard
- Text: "תרופות"
- Description: "צפה בהיסטוריית תרופות ואחוזי תקינות"
- Click → Should navigate to `/reminders`

**Card 2: Alerts (Red)**
- Icon: Bell
- Text: "התרעות"
- Description: "צפה בהתרעות בטיחות והודעות חשובות"
- Click → Should navigate to `/alerts`

**Card 3: Edit Profile (Gray)**
- Icon: Settings
- Text: "עריכת פרופיל"
- Description: "ערוך הגדרות בטיחות, תרופות ופרטי המטופל"
- Click → Should navigate to `/onboarding`

---

## 💊 Step 4: Test Reminders Page

Click "תרופות" card or navigate to `http://localhost:3001/reminders`

### 4.1 Header
- ✅ Back button: "← חזרה ללוח הבקרה"
- ✅ Title: "היסטוריית תרופות"

### 4.2 Compliance Stats Card
- ✅ Large percentage: "33%"
- ✅ Circular progress indicator (33% filled)
- ✅ Text: "1 מתוך 3 תרופות נלקחו"

### 4.3 Filter Tabs
- ✅ "היום" (today) - should show 3 medications
- ✅ "השבוע" (week) - should show all
- ✅ "כל ההיסטוריה" (all) - should show all

### 4.4 Medication Table

**Row 1: Metformin (Confirmed)**
- Date & Time: Today at 08:00
- Name: "Metformin 500mg"
- Status: 🟢 Green badge "נלקח"
- Completion: "08:05"

**Row 2: Aspirin (Pending)**
- Date & Time: Today at 20:00
- Name: "Aspirin 81mg"
- Status: 🟡 Yellow badge "ממתין"
- Completion: "—"

**Row 3: Vitamin D (Missed, Declined 2x)**
- Date & Time: Today at 14:00
- Name: "Vitamin D (נדחה 2 פעמים)"
- Status: 🔴 Red badge "לא נלקח"
- Completion: "—"

### 4.5 Test Filters
- Click "השבוע" → Should show same 3 medications
- Click "כל ההיסטוריה" → Should show all historical data

---

## 🚨 Step 5: Test Alerts Page

Click "התרעות" card or navigate to `http://localhost:3001/alerts`

### 5.1 Header
- ✅ Back button: "← חזרה ללוח הבקרה"
- ✅ Title: "התרעות בטיחות"
- ✅ Subtitle: "מעקב אחר אירועי בטיחות ומצבי משבר"

### 5.2 Filter Tabs
- ✅ "פעילות (1)" - should show 1 unresolved alert
- ✅ "טופלו" - should show 1 resolved alert
- ✅ "כל ההתרעות" - should show 2 alerts

### 5.3 Active Alert (Critical)

**Alert Card:**
- ✅ Severity badge: 🔴 "קריטי" (red)
- ✅ Timestamp: Today's date and time
- ✅ Title: "ניסיון לצאת מהבית לבד"
- ✅ Safety rule: "Never allow leaving home alone"
- ✅ Context box (gray background):
  - בקשת המשתמש: "אני רוצה לצאת לחפש את צביה"
  - תגובת המערכת: "אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם."
- ✅ Blue button: "אישור וסגירה"

### 5.4 Test Acknowledge Flow

1. Click "אישור וסגירה" button on critical alert
2. Alert should disappear from "פעילות" tab
3. Switch to "טופלו" tab
4. Alert should appear with:
   - ✅ "✓ טופל" badge (green)
   - ✅ Resolution info: "טופל על ידי שרה כהן בתאריך [timestamp]"
   - ✅ No "אישור וסגירה" button

### 5.5 Test Filter Tabs
- Click "פעילות" → Should show 0 alerts (all resolved)
- Click "טופלו" → Should show 2 alerts
- Click "כל ההתרעות" → Should show all 2 alerts

---

## ⚙️ Step 6: Test Edit Profile (Onboarding Form)

Click "עריכת פרופיל" card or navigate to `http://localhost:3001/onboarding`

### 6.1 Onboarding Wizard
- ✅ Should see multi-step form
- ✅ Progress indicator at top
- ✅ Hebrew labels (RTL)
- ✅ Testing mode toggle (load Tiferet data / empty form)

### 6.2 Test Pre-Fill
1. Click "Load Tiferet Data" button
2. All fields should populate with test data:
   - Patient name: תפארת לוי
   - Emergency contacts: 2-3 contacts
   - Medications: 3 medications
   - Crisis triggers: 6 triggers

### 6.3 Navigate Through Steps
- Click "הבא" (Next) to go through all steps
- Verify all data persists
- Step 7: Photo upload
- Step 8: Music preferences
- Step 9: Review & confirm

### 6.4 Test Save
1. Go to final review step
2. Click "שמור והמשך" (Save & Continue)
3. Should see success alert
4. Check browser console for API response

---

## 🔒 Step 7: Test Logout Flow

1. Click "התנתק" button in navigation bar
2. Should redirect to `/login`
3. Check DevTools → Local Storage
4. `authToken` and `familyMemberName` should be removed

---

## 📱 Step 8: Test Responsive Design

### Desktop (1920x1080)
- ✅ Stat cards: 2 columns on medium screens, 4 on large
- ✅ Quick action cards: 3 columns
- ✅ Medication table: Full width with all columns

### Tablet (768x1024)
- ✅ Stat cards: 2 columns
- ✅ Quick action cards: 2 columns, 1 row
- ✅ Medication table: Scrollable horizontally

### Mobile (375x667)
- ✅ Stat cards: 1 column, stacked vertically
- ✅ Quick action cards: 1 column, stacked
- ✅ Medication table: Scrollable with large touch targets

**Test responsive in Chrome DevTools:**
```
1. Open DevTools (F12)
2. Click device toggle icon (Ctrl+Shift+M)
3. Select different devices:
   - iPhone 12 Pro (390x844)
   - iPad Air (820x1180)
   - Desktop (1920x1080)
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Failed to load stats"
**Cause:** Backend not running or wrong port  
**Fix:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# If not, start it
cd backend && npm run start:dev
```

### Issue 2: "Unauthorized" error
**Cause:** Token expired or invalid  
**Fix:**
- Logout and login again
- Check if token is in localStorage
- Verify token format (Base64 JSON)

### Issue 3: No data showing
**Cause:** Test data not created in Cosmos DB  
**Fix:**
- Re-run Step 1 scripts to create test data
- Verify userId matches in all containers: `user-tiferet-001`

### Issue 4: Hebrew text not showing correctly
**Cause:** Missing `dir="rtl"` or wrong font  
**Fix:**
- Check browser: Hebrew should display right-to-left
- Verify font loading (Geist Sans should support Hebrew)

### Issue 5: Dashboard at wrong port
**Cause:** Environment variable not set  
**Fix:**
```bash
# Dashboard should run on port 3001
cd dashboard
PORT=3001 npm run dev
```

---

## 🎉 Success Checklist

After completing all tests, you should have verified:

- [x] Login with email/password works
- [x] Dashboard shows correct stats (2 conversations, 33% compliance, 1 alert)
- [x] Reminders page displays 3 medications with correct statuses
- [x] Alerts page shows 2 incidents (1 active, 1 resolved)
- [x] Acknowledge alert flow works
- [x] Edit profile links to onboarding form
- [x] Logout clears localStorage and redirects
- [x] Responsive design works on mobile, tablet, desktop
- [x] All Hebrew text displays correctly (RTL)
- [x] Navigation between pages works

---

## 📞 Need Help?

If you encounter issues:

1. **Check logs:**
   ```bash
   # Backend logs
   tail -f /tmp/never-alone-backend.log
   
   # Dashboard logs
   tail -f /tmp/never-alone-dashboard.log
   ```

2. **Check browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors (red text)

3. **Verify Azure connection:**
   ```bash
   cd backend
   node -e "
   const { CosmosClient } = require('@azure/cosmos');
   const { DefaultAzureCredential } = require('@azure/identity');
   const client = new CosmosClient({
     endpoint: process.env.COSMOS_ENDPOINT,
     aadCredentials: new DefaultAzureCredential()
   });
   client.database('never-alone').container('FamilyMembers').items.readAll().fetchAll()
     .then(() => console.log('✅ Cosmos DB connected!'))
     .catch(err => console.error('❌ Error:', err));
   "
   ```

4. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Reload page

---

**Happy Testing! 🎉**
