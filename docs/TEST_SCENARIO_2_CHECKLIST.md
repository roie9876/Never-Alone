# 🔔 Test Scenario 2: Medication Reminders - Checklist

**Test Started:** November 11, 2025  
**Tester:** [Your Name]  
**Test User:** `user-tiferet-001`  
**Status:** 🚧 IN PROGRESS

---

## 📋 Prerequisites Check

- [x] Backend running on port 3000
- [ ] Flutter Mac app running
- [ ] Safety config exists for test user
- [ ] Pre-recorded audio files in Blob Storage
- [ ] Test environment ready

---

## 🧪 Test 2.1: Successful Medication Confirmation

### Setup
- [ ] Create test medication (5 minutes from now)
- [ ] Update Cosmos DB safety-config
- [ ] Restart backend (optional if config loaded dynamically)

**Time Scheduled:** `_____:_____` (HH:MM)  
**Current Time:** `_____:_____` (HH:MM)

### Execution Steps

1. **Wait for Reminder**
   - [ ] Reminder fires at scheduled time (±30 seconds)
   - [ ] Pre-recorded Hebrew audio plays
   - [ ] Audio says: "זה הזמן לתרופות שלך" (It's time for your medication)
   - **Actual time fired:** `_____:_____`
   - **Variance:** `_____ seconds`

2. **Confirm via Button/Voice**
   - [ ] UI shows confirmation options
   - [ ] Clicked "אני לוקח עכשיו" (Taking now) OR said it verbally
   - [ ] Realtime API session starts
   - [ ] AI asks for verbal confirmation

3. **Verbal Confirmation**
   - [ ] Said: "כן, אני לוקח את התרופות עכשיו"
   - [ ] AI acknowledges: "מצוין! אני רושם שלקחת את התרופות"
   - [ ] Conversation can continue or end gracefully

4. **Verify in Database**
   - [ ] Ran verification query
   - [ ] Reminder status = "completed" or "confirmed"
   - [ ] Timestamp recorded correctly
   - [ ] No duplicate entries

**Query used:**
```bash
cd /Users/robenhai/Never\ Alone/backend
node -e "
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

### Results
- **Status:** ⏳ NOT STARTED / ✅ PASS / ❌ FAIL
- **Notes:**

---

## 🕐 Test 2.2: Snooze Functionality

### Setup
- [ ] Create another test medication (3 minutes from now)

**Time Scheduled:** `_____:_____` (HH:MM)  
**Current Time:** `_____:_____` (HH:MM)

### Execution Steps

1. **Wait for Reminder**
   - [ ] Reminder fires at scheduled time
   - [ ] Pre-recorded audio plays
   - **Actual time fired:** `_____:_____`

2. **Snooze Action**
   - [ ] Clicked "הזכר לי בעוד 10 דקות" (Remind me in 10 minutes) OR said it verbally
   - [ ] Confirmation audio plays: "אזכיר לך שוב בעוד 10 דקות"
   - [ ] UI shows snooze confirmation

3. **Verify Snooze Scheduling**
   - [ ] New reminder scheduled for +10 minutes
   - [ ] Original reminder marked as "snoozed"
   - [ ] Snooze counter incremented
   - **Expected snooze time:** `_____:_____`

4. **Wait for Snoozed Reminder**
   - [ ] Waited 10 minutes
   - [ ] Snoozed reminder fires
   - **Actual time fired:** `_____:_____`
   - **Variance:** `_____ seconds`

5. **Verify in Database**
   - [ ] Snooze counter = 1
   - [ ] New reminder created with correct time
   - [ ] Original reminder status updated

### Results
- **Status:** ⏳ NOT STARTED / ✅ PASS / ❌ FAIL
- **Notes:**

---

## 🚨 Test 2.3: Escalation (3 Declines → Family Alert)

### Setup
- [ ] Create test medication (3 minutes from now)
- [ ] Ensure emergency contact configured in safety-config
- [ ] Prepare to monitor backend logs

**Time Scheduled:** `_____:_____` (HH:MM)  
**Current Time:** `_____:_____` (HH:MM)

### Execution Steps

1. **Decline #1**
   - [ ] Reminder fires
   - [ ] Clicked "לא עכשיו" (Not now) OR said it verbally
   - [ ] Decline counter = 1
   - [ ] No alert sent yet

2. **Decline #2**
   - [ ] Reminder fires again (or snoozed reminder)
   - [ ] Clicked "לא עכשיו" again
   - [ ] Decline counter = 2
   - [ ] AI might escalate to conversation
   - [ ] Still no family alert

3. **Decline #3 (Triggers Alert)**
   - [ ] Reminder fires third time
   - [ ] Clicked "לא עכשיו" third time
   - [ ] Decline counter = 3
   - [ ] **FAMILY ALERT TRIGGERED**

4. **Verify Family Alert**
   - [ ] Backend logs show "FAMILY ALERT" or "SAFETY ALERT"
   - [ ] SMS sent to emergency contact (check logs)
   - [ ] Alert logged in Cosmos DB (`safety-incidents` container)
   - [ ] Alert severity = "medium" or "high"

**Backend logs check:**
```bash
tail -f /tmp/never-alone-backend.log | grep -i "alert"
```

5. **Verify in Database**
   - [ ] Ran query to check safety-incidents
   - [ ] Found alert with correct details
   - [ ] Alert includes: timestamp, user request, severity

**Query used:**
```bash
node -e "
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

### Results
- **Status:** ⏳ NOT STARTED / ✅ PASS / ❌ FAIL
- **Notes:**

---

## 📊 Test Results Summary

| Test | Status | Pass/Fail | Time | Notes |
|------|--------|-----------|------|-------|
| 2.1: Successful Confirmation | ⏳ | - | - | - |
| 2.2: Snooze Functionality | ⏳ | - | - | - |
| 2.3: 3x Decline Escalation | ⏳ | - | - | - |

---

## 🐛 Issues Found

### Issue #1: AI Uses Wrong Name ("יקר" instead of "תפארת")
- **Severity:** Medium
- **Description:** AI addresses user as "יקר" (generic) instead of actual name "תפארת"
- **Steps to Reproduce:** Start conversation, say "שלום"
- **Expected:** AI says "שלום תפארת"
- **Actual:** AI said "שלום יקר"
- **Root Cause:** Profile has `personalInfo.fullName` but code reads `name` (doesn't exist)
- **Fix:** ✅ Updated code to handle both old and new profile schemas
- **See:** BUG_FIXES_TEST_SCENARIO_2.md

### Issue #2: AI Doesn't Know About Medications
- **Severity:** High
- **Description:** When user asks about medications, AI doesn't provide specific information
- **Steps to Reproduce:** Say "אני לא זוכר מתי אני צריך לקחת את התרופות"
- **Expected:** AI says "Test Aspirin 100mg at 20:21"
- **Actual:** AI gives generic response "בוא ננסה לזכור"
- **Root Cause:** Medications not included in system prompt
- **Fix:** ✅ Added medications to SystemPromptContext and system prompt
- **See:** BUG_FIXES_TEST_SCENARIO_2.md

### Issue #3: Reminders Not Firing Proactively
- **Severity:** CRITICAL
- **Description:** App doesn't play audio at scheduled time; user must initiate conversation
- **Steps to Reproduce:** Add medication at 20:21, wait, no audio plays
- **Expected:** At 20:21, audio plays proactively: "זה הזמן לתרופות שלך"
- **Actual:** No audio, user must ask about medications
- **Root Cause:** Reminder documents not created in `reminders` container (only in `safety-config`)
- **Fix:** ✅ Call API endpoint `/reminder/daily/medications` to create reminder documents
- **Test Results:** 
  - ✅ Cron job detects and triggers reminders correctly
  - ✅ Database status updates from 'pending' to 'triggered'
  - ✅ Event JSON prepared with audio URL and buttons
  - ⚠️ WebSocket integration to Flutter app not yet implemented (separate task)
- **See:** BUG_3_REMINDERS_NOT_FIRING.md

---

## ✅ Pass Criteria Checklist

- [ ] Audio plays at correct time (±30 seconds)
- [ ] Verbal confirmation detected and logged
- [ ] Snooze counter increments correctly
- [ ] Family alert sent after 3 declines
- [ ] Reminder status updated in database
- [ ] No errors in backend logs
- [ ] UI responds correctly to all actions

---

## 📝 Notes & Observations

**General Observations:**


**Performance Notes:**


**Recommendations:**


---

## 🎯 Next Steps

After completing Test Scenario 2:
1. [ ] Update TEST_SCENARIO_2_CHECKLIST.md with results
2. [ ] Log any bugs in GitHub Issues
3. [ ] Update PROGRESS_TRACKER.md
4. [ ] Move to Test Scenario 3 (Crisis Detection)

---

**Test Completed:** _______________  
**Total Time:** _______________  
**Overall Status:** ⏳ IN PROGRESS / ✅ PASS / ❌ FAIL
