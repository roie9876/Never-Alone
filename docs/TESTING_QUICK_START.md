# 🚀 Quick Start - Manual Testing

**Start Date:** November 11, 2025  
**Estimated Time:** 10-15 hours over 2-3 days

---

## 📋 Before You Begin

### ✅ Prerequisites Checklist
- [ ] Backend running on port 3000
- [ ] Flutter app can build and run
- [ ] Test user `user-tiferet-001` exists
- [ ] Safety config exists
- [ ] Test photos uploaded
- [ ] Redis accessible
- [ ] Cosmos DB accessible

### 🔧 Quick Setup
```bash
cd /Users/robenhai/Never\ Alone

# 1. Start backend (if not running)
./start.sh

# 2. Run system check
cd backend
./scripts/run-all-tests.sh

# 3. Open logs in separate terminal
tail -f /tmp/never-alone-backend.log

# 4. Start Flutter app
cd ../frontend_flutter
flutter run -d macos
```

---

## 📖 Testing Order (Recommended)

### Day 1 - Foundation Tests (4-5 hours)
**Morning:**
1. ✅ **Photo Triggering** (30 min) - Already verified working!
2. **Memory Continuity - Session 1** (1 hour)
   - Open `TASK_7.1_TESTING_PLAN.md`
   - Follow "Test Scenario 1: Memory Continuity"
   - Record results in checklist

**Afternoon:**
3. **Memory Continuity - Session 2** (1 hour)
   - Wait 6 hours after Session 1
   - Test working memory persistence

**Evening:**
4. **Crisis Detection** (1.5 hours)
   - Test all 3 crisis scenarios
   - Verify family alerts

### Day 2 - Reminder Tests (4-5 hours)
**Morning:**
1. **Medication Reminders - Success** (1 hour)
   - Set reminder for 5 min from now
   - Test confirmation flow

2. **Medication Reminders - Snooze** (1.5 hours)
   - Test 10-minute snooze
   - Verify rescheduling

**Afternoon:**
3. **Medication Reminders - Escalation** (1.5 hours)
   - Test 3x decline scenario
   - Verify family alert

4. **50-Turn Memory Window** (1 hour)
   - Have extended conversation
   - Verify truncation

### Day 3 - Memory Continuity Day 2 (2 hours)
**Morning:**
1. **Memory Continuity - Day 2 Test**
   - Start fresh conversation
   - Verify Day 1 memories persist

2. **Final Results Compilation** (1 hour)
   - Update test checklist
   - Document bugs
   - Create completion report

---

## 🎯 Quick Test Commands

### Check System Status
```bash
# Backend health
curl http://localhost:3000/health

# Redis connection
redis-cli PING

# Cosmos DB connection
node -e "
const { CosmosClient } = require('@azure/cosmos');
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
client.getDatabaseAccount().then(() => console.log('✅ Connected'));
"
```

### Check Test User Data
```bash
cd /Users/robenhai/Never\ Alone/backend

# Check memories
node -e "
const { CosmosClient } = require('@azure/cosmos');
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database('never-alone').container('memories');
container.items.query({
  query: 'SELECT * FROM c WHERE c.userId = @userId',
  parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(r => console.log('Memories:', r.resources.length));
"

# Check reminders
node -e "
const { CosmosClient } = require('@azure/cosmos');
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database('never-alone').container('reminders');
container.items.query({
  query: 'SELECT TOP 5 * FROM c WHERE c.userId = @userId ORDER BY c.scheduledTime DESC',
  parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(r => console.log('Recent reminders:', JSON.stringify(r.resources, null, 2)));
"

# Check photos
node -e "
const { CosmosClient } = require('@azure/cosmos');
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database('never-alone').container('photos');
container.items.query({
  query: 'SELECT * FROM c WHERE c.userId = @userId',
  parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(r => console.log('Photos:', r.resources.length));
"
```

### Monitor Redis Memory
```bash
# Check all memory keys
redis-cli KEYS "memory:*"

# Get short-term memory
redis-cli GET "memory:short-term:user-tiferet-001" | jq

# Get working memory
redis-cli GET "memory:working:user-tiferet-001" | jq

# Check TTL
redis-cli TTL "memory:short-term:user-tiferet-001"
```

### Watch Backend Logs (Filtered)
```bash
# All memory operations
tail -f /tmp/never-alone-backend.log | grep MEMORY

# All reminder operations
tail -f /tmp/never-alone-backend.log | grep REMINDER

# All safety alerts
tail -f /tmp/never-alone-backend.log | grep "SAFETY ALERT"

# All photo operations
tail -f /tmp/never-alone-backend.log | grep PHOTO

# Everything important
tail -f /tmp/never-alone-backend.log | grep -E "MEMORY|REMINDER|SAFETY|PHOTO"
```

---

## 📝 Recording Results

### Use the Checklist in TASK_7.1_TESTING_PLAN.md

```markdown
| Scenario | Test | Status | Pass/Fail | Notes | Tester | Date |
|----------|------|--------|-----------|-------|--------|------|
| 1. Memory | Day 1 S1 | ✅ | PASS | Memories saved correctly | Roie | 11/11 |
```

### Bug Template
```markdown
## Bug #1: [Short Description]
**Severity:** Critical / High / Medium / Low
**Scenario:** Test Scenario X
**Steps to Reproduce:**
1. 
2. 

**Expected:** 
**Actual:** 
**Logs:** [Paste relevant logs]
```

---

## 🎓 Tips for Effective Testing

### 1. **Test One Scenario at a Time**
Don't rush - each test builds understanding of the system.

### 2. **Keep Logs Open**
Always have `tail -f /tmp/never-alone-backend.log` running in a separate terminal.

### 3. **Document Everything**
Even if a test passes, note any unexpected behavior.

### 4. **Test Happy Path First**
Start with success scenarios before testing failures.

### 5. **Clear State Between Tests**
If needed, clear Redis: `redis-cli FLUSHDB`

### 6. **Take Screenshots**
Capture UI bugs for later reference.

### 7. **Test in Hebrew**
Remember this is for Hebrew-speaking elderly users.

---

## 🚨 Known Issues to Watch For

Based on previous work, be alert for:

1. **Audio latency** - User reported "slow response" (Task 5.2.2)
2. **Schema mismatches** - taggedPeople vs manualTags (fixed in Task 5.3)
3. **Cosmos DB firewall** - May need to add IP (resolved)
4. **Duplicate transcripts** - Fixed, but watch for recurrence
5. **Echo issues** - Fixed, but verify in long conversations

---

## ✅ Success Criteria

At the end of testing, you should have:

- [ ] All 5 test scenarios executed
- [ ] Test results documented in checklist
- [ ] All critical bugs logged in GitHub Issues
- [ ] Screenshots of major bugs
- [ ] Performance metrics recorded
- [ ] TASK_7.1_COMPLETE.md created with summary

---

## 📞 Need Help?

**Stuck on a test?**
1. Check backend logs for errors
2. Verify test user data exists
3. Restart backend and try again
4. Document the issue and move to next test

**System not working?**
1. Run `./scripts/run-all-tests.sh` again
2. Check all services are running
3. Verify environment variables

---

## 📚 Reference Documents

- **Full Test Plan:** `/TASK_7.1_TESTING_PLAN.md`
- **Progress Tracker:** `/PROGRESS_TRACKER.md`
- **Memory Architecture:** `/docs/technical/memory-architecture.md`
- **Reminder System:** `/docs/technical/reminder-system.md`

---

**Good luck with testing! 🚀**

Remember: The goal is not just to check boxes, but to understand how the system works and find issues before real users do.
