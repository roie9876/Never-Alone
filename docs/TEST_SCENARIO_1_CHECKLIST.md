# ✅ Test Scenario 1: Memory Continuity - Checklist

**Date:** November 11, 2025  
**Status:** 🚧 IN PROGRESS  
**Test User:** user-tiferet-001

---

## 🎯 Day 1 - Session 1 (Morning) - NOW

### Step 1: Start Conversation ⏳
- [ ] Flutter app is open (✅ DONE - app running)
- [ ] Press "התחל שיחה" (Start Conversation) button
- [ ] Microphone permission granted
- [ ] AI responds with greeting

### Step 2: Share Personal Information ⏳
**What to say:** "הנכדה שלי שרה עובדת מורה בתל אביב"  
(My granddaughter Sarah works as a teacher in Tel Aviv)

- [ ] Said the sentence clearly
- [ ] AI acknowledged and understood
- [ ] AI asked follow-up questions
- [ ] Transcript shows correctly in UI

### Step 3: Share More Details ⏳
**What to say:** "היא מלמדת היסטוריה בתיכון"  
(She teaches history in high school)

- [ ] AI connected this to previous statement about Sarah
- [ ] AI showed interest and engaged naturally
- [ ] Conversation felt natural

### Step 4: End Session ⏳
- [ ] Say goodbye: "להתראות" (Goodbye)
- [ ] AI responded with warm goodbye
- [ ] Session ended gracefully
- [ ] Wait 2 minutes for memory extraction

### Step 5: Verify Memory Storage ⏳
Run this command in terminal:
```bash
cd /Users/robenhai/Never\ Alone/backend

node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});
const container = client.database('never-alone').container('memories');

container.items.query({
  query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
  parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(result => {
  console.log('=== Long-term memories ===');
  result.resources.forEach(mem => {
    console.log(\`- [\${mem.category}] \${mem.content}\`);
  });
});
"
```

**Expected Results:**
- [ ] New memory contains "Sarah" or "שרה"
- [ ] Memory mentions "teacher" or "מורה"
- [ ] Memory mentions "Tel Aviv" or "תל אביב"
- [ ] Memory category is "family_info" or "family"

---

## 📊 Results - Day 1 Session 1

### What Worked:
- ✅ Memory extraction function called successfully
- ✅ AI understood conversation about granddaughter Racheli working at Enbal company
- ✅ Memory saved to Cosmos DB (id: 9d97a34a-d77a-44b0-b925-79280823e690)
- ✅ Transcript captured correctly in backend logs

### Issues Found:
- ⚠️ **CRITICAL LIMITATION DISCOVERED**: Memory extraction had minor error (company name "ענבר" instead of "ענבל")
- ⚠️ **NO UPDATE MECHANISM**: When user corrected AI in Session 2, there's no function to update existing memories
- ⚠️ Only CREATE and READ operations supported for memories, not UPDATE or DELETE
- ℹ️ Multiple "response.audio_transcript.delta" warnings in logs (harmless - streaming events)

### Notes:
- Memory document created: key="daughter_workplace", value="רחלי עובדת בתעשייה אווירית ובניהול בחברה בשם ענבר"
- **Post-MVP Enhancement Needed**: Implement update_important_memory() function
- Decision: Continue testing with known limitation, document as Medium severity bug

---

## ⏰ Day 1 - Session 2 (Evening - 6 hours later)

### Step 1: Start New Conversation ⏳
- [ ] Close and reopen Flutter app (or wait 6 hours)
- [ ] Press "התחל שיחה" again
- [ ] New session started

### Step 2: Test Long-Term Memory Recall ⏳
**What to say:** "איך היום שלי?" (How was my day?)

**Expected AI Behavior:**
- [ ] AI mentions Sarah naturally
- [ ] AI asks about Sarah or teaching
- [ ] AI shows it remembers from morning

### Step 3: Test Specific Memory ⏳
**What to say:** "תספר לי על המשפחה שלי" (Tell me about my family)

**Expected AI Behavior:**
- [ ] AI mentions Sarah by name
- [ ] AI mentions she's a teacher
- [ ] AI mentions Tel Aviv
- [ ] Shows good recall of morning conversation

---

## 📊 Results - Day 1 Session 2

### What Worked:
- ✅ AI successfully recalled information about Racheli from Session 1
- ✅ Long-term memory retrieval working correctly
- ✅ AI referenced family member naturally in conversation

### Issues Found:
- ⚠️ AI repeated incorrect company name from extracted memory
- ⚠️ User corrected AI but no mechanism to update the memory
- ⚠️ Confirms limitation: Memory system is read-only after creation

### Notes:
- This session validated that memory RECALL works correctly
- Memory system successfully loaded and used long-term facts
- UPDATE functionality confirmed as missing - not a MVP blocker but important for UX

---

## ⏰ Day 2 - Session 1 (Next Morning - 24 hours later)

### Step 1: Start Conversation After 24 Hours ⏳
- [ ] Restart backend (to clear any in-memory state)
- [ ] Open Flutter app
- [ ] Start conversation

### Step 2: Test Multi-Day Memory Persistence ⏳
**What to say:** "בוקר טוב! מה שלומך?" (Good morning! How are you?)

**Expected AI Behavior:**
- [ ] AI greets warmly
- [ ] AI may proactively mention Sarah
- [ ] OR wait for user to mention family

### Step 3: Confirm Long-Term Memory Still Intact ⏳
**What to say:** "מה את יודעת על המשפחה שלי?" (What do you know about my family?)

**Expected AI Behavior:**
- [ ] AI recalls Sarah is granddaughter
- [ ] AI recalls she's a teacher in Tel Aviv
- [ ] AI recalls she teaches history
- [ ] Memory persisted across 24 hours

---

## 📊 Results - Day 2 Session 1

### What Worked:
- 

### Issues Found:
- 

### Notes:
- 

---

## ✅ Test Scenario 1 - Final Summary

### Overall Result: ⏳ PENDING

**Pass Criteria:**
- [ ] Short-term memory cleared between sessions (30 min TTL)
- [ ] Long-term memory persisted for 24+ hours
- [ ] AI naturally recalls facts about Sarah
- [ ] Memory extraction function was called
- [ ] Cosmos DB contains correct memory documents

**Performance Notes:**
- Memory load time: _____ ms
- Memory extraction latency: _____ ms
- Total memories for user: _____

**Next Steps:**
- [ ] Fix any bugs found
- [ ] Document issues in GitHub
- [ ] Move to Test Scenario 2 (Medication Reminders)

---

**Testing completed by:** ___________  
**Date completed:** ___________
