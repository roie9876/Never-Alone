# ⚡ Quick Test - Family Dashboard (5 Minutes)

**For immediate testing without reading full guide**

---

## 1️⃣ Start Services (30 seconds)

```bash
cd "/Users/robenhai/Never Alone"
./start.sh
```

Wait for:
- ✅ Backend: `http://localhost:3000`
- ✅ Dashboard: `http://localhost:3001`

---

## 2️⃣ Create Test Account (2 minutes)

Copy-paste this entire block:

```bash
cd "/Users/robenhai/Never Alone/backend"

# Create family member
node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: new DefaultAzureCredential()
});
const db = client.database('never-alone');

(async () => {
  // Family member
  await db.container('FamilyMembers').items.create({
    id: 'family-sarah-001',
    userId: 'user-tiferet-001',
    email: 'sarah@example.com',
    password: 'demo123',
    name: 'שרה כהן',
    phone: '+972501234567',
    relationship: 'daughter',
    createdAt: new Date().toISOString(),
  });

  // 1 Critical Alert (Active)
  await db.container('SafetyIncidents').items.create({
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
  });

  // 1 Medium Alert (Resolved)
  await db.container('SafetyIncidents').items.create({
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
  });

  console.log('✅ Test data created!');
})();
"
```

---

## 3️⃣ Test Login (1 minute)

1. Open: `http://localhost:3001/login`
2. Enter:
   - Email: `sarah@example.com`
   - Password: `demo123`
3. Click: "התחבר"
4. Should redirect to dashboard ✅

---

## 4️⃣ Quick Feature Check (1 minute)

### Dashboard Home
- ✅ See 4 stat cards (conversations, medication, alerts, last chat)
- ✅ See "1 התרעות פעילות!" (1 active alert)

### Alerts Page
1. Click "התרעות" card
2. Should see 1 critical alert: "ניסיון לצאת מהבית לבד"
3. Click "אישור וסגירה" button
4. Alert disappears ✅
5. Click "טופלו" tab → Should see 2 resolved alerts ✅

### Edit Profile
1. Go back to dashboard
2. Click "עריכת פרופיל" card
3. Should navigate to onboarding form ✅

---

## ✅ Success!

If all 4 steps worked, your Family Dashboard is fully functional!

**For detailed testing:** See `FAMILY_DASHBOARD_TESTING_GUIDE.md`
