# 🔔 Test Scenario 2: Medication Reminders - Setup Complete

**Test Started:** November 11, 2025, 20:16  
**Test User:** `user-tiferet-001`  
**Status:** ✅ READY TO TEST

---

## ✅ Setup Complete

- ✅ Backend running on port 3000
- ✅ Test medication added to safety-config
- ✅ Reminder scheduled for: **20:21** (5 minutes from now)
- ✅ Pre-recorded audio files ready in Blob Storage
- ✅ Checklist created: `TEST_SCENARIO_2_CHECKLIST.md`

---

## ⏰ Test Timeline

| Time | Action |
|------|--------|
| **20:16** | Test setup completed |
| **20:21** | 🔔 Test Medication Reminder will fire |
| **20:21-20:23** | Test 2.1: Successful Confirmation |
| **20:26** (approx) | 🔔 Test 2.2: Snooze Reminder (add another medication) |
| **20:30** (approx) | 🔔 Test 2.3: Decline 3x Escalation |

---

## 🎯 Test 2.1: Successful Medication Confirmation

### What Will Happen at 20:21:
1. **Backend** will detect it's time for medication reminder
2. **Audio** will play: "זה הזמן לתרופות שלך" (It's time for your medication)
3. **UI** should display confirmation options (or voice prompt)

### Your Actions:
1. ✅ **Wait for reminder at 20:21**
2. ✅ **Listen for audio** (confirm it plays)
3. ✅ **Confirm taking medication:**
   - Option A: Click "אני לוקח עכשיו" button (if UI has it)
   - Option B: Say verbally: "כן, אני לוקח את התרופות עכשיו"
4. ✅ **Verify AI response:**
   - AI should acknowledge: "מצוין! אני רושם שלקחת את התרופות"
5. ✅ **Check database** (after test):
   ```bash
   cd /Users/robenhai/Never\ Alone/backend
   node -r dotenv/config -e "
   const { CosmosClient } = require('@azure/cosmos');
   const { DefaultAzureCredential } = require('@azure/identity');
   const credential = new DefaultAzureCredential();
   const client = new CosmosClient({
     endpoint: process.env.COSMOS_ENDPOINT,
     aadCredentials: credential
   });
   const container = client.database('never-alone').container('reminders');
   
   container.items.query({
     query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.scheduledTime DESC OFFSET 0 LIMIT 5',
     parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
   }).fetchAll().then(result => {
     console.log('Recent reminders:', JSON.stringify(result.resources, null, 2));
   });
   "
   ```

### Expected Results:
- ✅ Audio plays at 20:21 (±30 seconds)
- ✅ Confirmation detected and logged
- ✅ Reminder status = "completed" in Cosmos DB
- ✅ Timestamp recorded correctly

---

## 📝 During the Test

### Monitor Backend Logs:
```bash
# In a separate terminal
tail -f /tmp/never-alone-backend.log | grep -i "reminder"
```

### Watch for These Log Messages:
- `🔔 Medication reminder triggered for user-tiferet-001`
- `✅ Reminder confirmed by user`
- `💾 Saving reminder completion to database`

---

## 🧪 Test 2.2: Snooze Functionality (After Test 2.1)

To test snooze, you'll need to add **another** test medication:

```bash
cd /Users/robenhai/Never\ Alone/backend
node -r dotenv/config scripts/add-test-medication.js
```

This will schedule a new reminder for +5 minutes from when you run it.

### Your Actions:
1. Wait for reminder to fire
2. **Snooze** instead of confirming:
   - Click "הזכר לי בעוד 10 דקות" (Remind me in 10 minutes)
   - OR say: "הזכר לי בעוד 10 דקות"
3. Verify confirmation audio: "אזכיר לך שוב בעוד 10 דקות"
4. Wait 10 minutes for snoozed reminder
5. Confirm it fires again

---

## 🚨 Test 2.3: Escalation (3 Declines)

To test escalation, add another test medication and decline it 3 times:

### Your Actions:
1. Wait for reminder to fire
2. **Decline 1:** Say "לא עכשיו" (Not now)
3. Wait for reminder again (or snooze fires)
4. **Decline 2:** Say "לא עכשיו" again
5. Wait for third reminder
6. **Decline 3:** Say "לא עכשיו" third time
7. **Verify family alert:**
   ```bash
   tail -f /tmp/never-alone-backend.log | grep -i "alert"
   ```
8. Check safety-incidents in Cosmos DB:
   ```bash
   node -r dotenv/config -e "
   const { CosmosClient } = require('@azure/cosmos');
   const { DefaultAzureCredential } = require('@azure/identity');
   const credential = new DefaultAzureCredential();
   const client = new CosmosClient({
     endpoint: process.env.COSMOS_ENDPOINT,
     aadCredentials: credential
   });
   const container = client.database('never-alone').container('safety-incidents');
   
   container.items.query({
     query: 'SELECT TOP 5 * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC',
     parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
   }).fetchAll().then(result => {
     console.log('Recent safety incidents:', JSON.stringify(result.resources, null, 2));
   });
   "
   ```

---

## 📋 Checklist to Fill Out

As you complete each test, update: **`TEST_SCENARIO_2_CHECKLIST.md`**

Mark each checkbox as you go:
- [ ] → ✅ (when completed successfully)
- [ ] → ❌ (if failed or issues found)

---

## 🐛 If Issues Found

Document in `TEST_SCENARIO_2_CHECKLIST.md` under "Issues Found":
- **Title:** Brief description
- **Severity:** Critical / High / Medium / Low
- **Steps to Reproduce:** What you did
- **Expected:** What should happen
- **Actual:** What actually happened
- **Logs/Screenshots:** Copy relevant backend logs

---

## 🎯 Success Criteria

Test 2 is considered **PASS** if:
- ✅ Audio plays at scheduled time (±30 seconds)
- ✅ Verbal confirmation detected and logged
- ✅ Snooze reschedules correctly (+10 minutes)
- ✅ Family alert sent after 3 declines
- ✅ All actions logged to Cosmos DB
- ✅ No errors in backend logs

---

## 🚀 Ready to Start!

**Current time:** 20:16  
**Reminder will fire at:** 20:21  
**Time until test:** ~5 minutes

### What to Do Now:
1. ✅ **Open Flutter app** (if not already running)
2. ✅ **Start monitoring backend logs:**
   ```bash
   tail -f /tmp/never-alone-backend.log
   ```
3. ✅ **Keep checklist open:** `TEST_SCENARIO_2_CHECKLIST.md`
4. ✅ **Wait for 20:21** ⏰

---

**Good luck with the test!** 🎉

---

## 📞 Quick Reference Commands

### Add Another Test Medication:
```bash
cd /Users/robenhai/Never\ Alone/backend
node -r dotenv/config scripts/add-test-medication.js
```

### Check Recent Reminders:
```bash
cd /Users/robenhai/Never\ Alone/backend
node -r dotenv/config -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});
const container = client.database('never-alone').container('reminders');

container.items.query({
  query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.scheduledTime DESC OFFSET 0 LIMIT 5',
  parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(result => {
  console.log(JSON.stringify(result.resources, null, 2));
});
"
```

### Monitor Backend Logs:
```bash
tail -f /tmp/never-alone-backend.log | grep -i "reminder\|alert"
```

---

**Document Created:** November 11, 2025, 20:16  
**Test Window:** 20:21 - 21:00 (approx. 40 minutes for all 3 sub-tests)
