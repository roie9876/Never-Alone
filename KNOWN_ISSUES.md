# 🐛 Known Issues - Never Alone MVP

**Last Updated:** November 11, 2025  
**Status:** Testing Phase (Task 7.1)

---

## 🔴 Critical Issues

*None found yet*

---

## 🟡 Medium Priority Issues

### Issue #1: Crisis Detection Uses Keyword Matching Only (Not Semantic)
**Discovered:** November 11, 2025 during onboarding review  
**Severity:** Medium-High (Safety feature limitation)  
**Component:** Safety System (Crisis Detection)

**Description:**
Current crisis detection uses **exact keyword matching** only. If patient expresses suicidal ideation using different words than configured keywords, the system will NOT trigger an alert.

**Example:**
- **Configured keyword:** "נמאס לי מהחיים" (I'm tired of life)
- **Patient says:** "התעייפתי מהחיים אשמח לא לקום בבוקר" (I'm exhausted from life, I'd be happy not to wake up in the morning)
- **Current behavior:** ❌ No alert triggered (keywords don't match exactly)
- **Expected behavior:** ✅ Alert should trigger (semantic meaning is identical - suicidal ideation)

**Root Cause:**
```typescript
// Current implementation in SafetyConfigService
const crisisTriggers = ["נמאס לי מהחיים", "רוצה למות"];
const transcript = "התעייפתי מהחיים אשמח לא לקום בבוקר";

// Simple string matching
const isMatch = crisisTriggers.some(trigger => 
  transcript.toLowerCase().includes(trigger.toLowerCase())
);
// Returns: false ❌ (even though intent is dangerous)
```

**Impact:**
- **Life-threatening:** Patient expressing suicidal thoughts may not trigger emergency alert
- **False sense of security:** Family believes system is monitoring, but it only catches exact phrases
- **Hebrew language complexity:** Many ways to express same dangerous intent ("עייף מהחיים", "התעבתי מהחיים", "לא רוצה להתעורר", "אין טעם לחיות", etc.)
- **Patient variation:** Dementia patients won't use exact phrases consistently

**Current Workaround:**
Add MANY keyword variations to crisis triggers during onboarding (exhaustive list):
```yaml
crisis_triggers:
  - "נמאס לי מהחיים"
  - "התעייפתי מהחיים"
  - "עייף מהחיים"
  - "לא רוצה להתעורר"
  - "אין טעם לחיות"
  - "עדיף למות"
  - "רוצה למות"
  # ... need 50+ variations to cover possibilities
```

**Proposed Solution (High Priority - Week 5):**
Implement **semantic crisis detection** using Realtime API function calling:

```typescript
// Add to Realtime API function tools
const crisisDetectionTool = {
  name: "detect_crisis",
  description: "Call IMMEDIATELY if user expresses suicidal thoughts, self-harm, or dangerous intentions in ANY form - understand INTENT, not just exact words",
  parameters: {
    type: "object",
    properties: {
      user_statement: { 
        type: "string",
        description: "What the user said that triggered concern"
      },
      crisis_type: {
        type: "string",
        enum: ["suicidal_ideation", "self_harm", "harm_to_others", "dangerous_activity"],
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
      },
      reasoning: {
        type: "string",
        description: "Why this statement is concerning"
      }
    },
    required: ["user_statement", "crisis_type", "severity"]
  }
};

// Update system prompt to include semantic detection
const systemPrompt = `
You are trained to detect crisis situations using semantic understanding.

Call detect_crisis() if user expresses ANY form of:
- Death wishes (direct or indirect)
- Suicidal ideation (active or passive)
- Self-harm intentions
- Hopelessness about life
- Desire not to wake up
- Feeling life has no meaning

Examples that SHOULD trigger alert:
✅ "נמאס לי מהחיים" (I'm tired of life)
✅ "התעייפתי מהחיים אשמח לא לקום בבוקר" (I'm exhausted, hope not to wake up)
✅ "אין טעם לחיות" (No point in living)
✅ "עדיף למות" (Better to die)
✅ "לא רוצה להתעורר" (Don't want to wake up)
✅ "הכל נגמר בשבילי" (Everything is over for me)

DO NOT wait for exact keywords. Understand INTENT and MEANING.
`;

// Backend handler
async handleCrisisDetection(userId: string, args: CrisisDetectionArgs) {
  const { user_statement, crisis_type, severity, reasoning } = args;
  
  // 1. Log immediately to Cosmos DB
  await this.saveSafetyIncident({
    userId,
    type: crisis_type,
    severity,
    userStatement: user_statement,
    detectionMethod: "ai_semantic", // vs. "keyword_matching"
    aiReasoning: reasoning,
    timestamp: new Date().toISOString()
  });
  
  // 2. Alert ALL emergency contacts immediately
  await this.alertAllEmergencyContacts(userId, {
    severity: "CRITICAL",
    alertType: "crisis_detected",
    message: `🚨 CRISIS DETECTED\n\nPatient said: "${user_statement}"\n\nType: ${crisis_type}\nSeverity: ${severity}\n\nAction: Call patient IMMEDIATELY`,
    crisisType: crisis_type,
    notificationMethods: ["sms", "push", "email"] // All channels
  });
  
  // 3. Keep patient engaged (prevent isolation)
  return {
    detected: true,
    ai_should_say: "אני מבין שאתה מרגיש קשה מאוד עכשיו. בוא נדבר על זה, אני כאן איתך. אני גם מתקשר למיכל עכשיו כדי שהיא תבוא."
    // Translation: "I understand you're feeling very difficult right now. Let's talk about it, I'm here with you. I'm also calling Michal now so she can come."
  };
}
```

**Additional Safety Layer (Defense in Depth):**
Keep keyword matching as backup - dual detection system:
```typescript
// Check both methods
const keywordMatch = checkKeywordTriggers(transcript, crisisTriggers);
const aiDetection = await checkAIFunctionCall('detect_crisis');

if (keywordMatch || aiDetection) {
  // Alert if EITHER method detects crisis
  await triggerEmergencyAlert(userId);
}
```

**Benefits:**
- ✅ **Catches variations:** "נמאס לי", "התעייפתי", "עייף" all detected
- ✅ **Hebrew nuances:** AI understands slang, metaphors, indirect language
- ✅ **Context-aware:** Can detect concerning statements in broader context
- ✅ **Lower false negatives:** Won't miss dangerous statements
- ✅ **Real-time:** Detection during conversation, not after
- ✅ **Cost-effective:** ~$0.002 per conversation (included in Realtime API)

**Test Cases:**
```typescript
// Should trigger alert ✅
testCrisis("נמאס לי מהחיים"); // Direct
testCrisis("התעייפתי מהחיים אשמח לא לקום בבוקר"); // Indirect
testCrisis("אין טעם לחיות"); // Hopelessness
testCrisis("הכל נגמר בשבילי"); // Despair

// Should NOT trigger alert ✅
testCrisis("עייף היום"); // Tired but normal
testCrisis("לא ישנתי טוב"); // Sleep complaint
testCrisis("כואב לי הראש"); // Physical pain
```

**Status:** 🟡 Documented as limitation, semantic detection implementation planned for Week 5  
**Priority:** HIGH (life-or-death safety feature)  
**GitHub Issue:** TBD  
**Estimated Fix Time:** 2-3 hours (function definition + handler + testing)  
**Dependencies:** Task 2.1 (Realtime API integration) - already complete ✅

---

### Issue #2: No Memory Update Mechanism
**Discovered:** November 11, 2025 during Test Scenario 1  
**Severity:** Medium (UX limitation, not blocker)  
**Component:** Memory System (Long-term memory)

**Description:**
When AI extracts information incorrectly (e.g., mishears "Enbal" as "Enbar"), users cannot correct these mistakes through conversation. The memory system only supports CREATE and READ operations, not UPDATE or DELETE.

**Example:**
1. User says: "רחלי עובדת בחברה בשם ענבל" (Racheli works at company called Enbal)
2. AI extracts: "רחלי עובדת בתעשייה אווירית ובניהול בחברה בשם ענבר" (incorrect company name)
3. User corrects AI in next conversation: "לא, החברה נקראת ענבל, לא ענבר" (No, the company is called Enbal, not Enbar)
4. **Problem:** AI acknowledges correction but cannot update the stored memory

**Root Cause:**
- Only `extract_important_memory()` function implemented (CREATE operation)
- No `update_important_memory()` function exists
- No `delete_memory()` function exists

**Impact:**
- Incorrect memories persist forever
- User frustration when corrections are ignored
- AI will continue using wrong information in future conversations
- Workaround requires manual database updates by developers

**Workaround (for MVP testing):**
```javascript
// Manual script to update memory in Cosmos DB
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});
const container = client.database('never-alone').container('memories');

await container.item('9d97a34a-d77a-44b0-b925-79280823e690', 'user-tiferet-001')
  .replace({
    id: '9d97a34a-d77a-44b0-b925-79280823e690',
    userId: 'user-tiferet-001',
    key: 'daughter_workplace',
    value: 'רחלי עובדת בתעשייה אווירית ובניהול בחברה בשם ענבל', // Corrected
    memoryType: 'family_info',
    extractedAt: '2025-11-11T18:01:06.326Z',
    updatedAt: new Date().toISOString() // Add timestamp
  });
```

**Proposed Solution (Post-MVP):**
Implement `update_important_memory()` and `delete_memory()` functions:

```typescript
// Add to Realtime API function tools
{
  name: "update_important_memory",
  description: "Update existing memory when user provides corrections or new information",
  parameters: {
    type: "object",
    properties: {
      memory_id: { type: "string", description: "ID of memory to update" },
      key: { type: "string", description: "Memory key (e.g., 'daughter_workplace')" },
      new_value: { type: "string", description: "Corrected or updated information" },
      reason: { type: "string", description: "Why this memory is being updated" }
    },
    required: ["key", "new_value", "reason"]
  }
}
```

**Status:** 🟡 Documented as known limitation, will implement in Post-MVP Phase  
**GitHub Issue:** TBD  
**Estimated Fix Time:** 6-8 hours (design + implementation + testing)

---

## 🟢 Low Priority Issues / Cosmetic

### Issue #3: Audio Transcript Delta Warnings
**Discovered:** November 11, 2025 during Test Scenario 1  
**Severity:** Low (cosmetic, no impact)  
**Component:** Realtime API WebSocket Events

**Description:**
Backend logs show repeated warnings:
```
⚠️ Warning: Skipping event type: response.audio_transcript.delta
⚠️ Warning: Skipping event type: response.audio_transcript.delta
```

**Root Cause:**
These are optional streaming events sent by Azure OpenAI Realtime API that provide partial transcripts as AI speaks. Current implementation only handles `response.audio_transcript.done` (complete transcripts).

**Impact:**
- No functional impact - full transcripts are captured correctly
- Log spam makes debugging harder
- Could confuse developers

**Workaround:**
- Ignore warnings, or
- Add handler to suppress these specific warnings in logs

**Proposed Solution:**
Either implement real-time transcript streaming in UI (nice-to-have feature), or suppress these warnings:

```typescript
// Option 1: Show real-time transcripts in UI
case 'response.audio_transcript.delta':
  this.handlePartialTranscript(event);
  break;

// Option 2: Suppress warnings
case 'response.audio_transcript.delta':
  // Intentionally ignored - we use response.audio_transcript.done instead
  break;
```

**Status:** 🟢 Low priority, will address in polish phase  
**GitHub Issue:** TBD  
**Estimated Fix Time:** 1 hour

---

## 📋 Testing Status

| Test Scenario | Status | Critical Issues | Medium Issues | Low Issues |
|---------------|--------|----------------|---------------|------------|
| 1. Memory Continuity | 🚧 50% | 0 | 1 | 0 |
| 2. Medication Reminders | ⏳ Pending | - | - | - |
| 3. Crisis Detection | ⏳ Pending | - | 1 | - |
| 4. Photo Triggering | ✅ Verified | 0 | 0 | 0 |
| 5. 50-Turn Window | ⏳ Pending | - | - | - |

---

## 🎯 Next Steps

1. **Complete Test Scenario 1** - Continue multi-day testing to verify 24-hour persistence
2. **Test Scenario 2** - Medication reminders scheduling and escalation
3. **Test Scenario 3** - Crisis detection and emergency alerts
4. **Test Scenario 5** - Memory window truncation and TTL expiration
5. **Log all issues** in GitHub Issues with severity labels
6. **Prioritize fixes** - Critical before launch, Medium for Post-MVP, Low for polish

---

## 📝 Issue Template

When adding new issues:
```markdown
### Issue #X: [Title]
**Discovered:** [Date] during [Test Scenario]
**Severity:** Critical | Medium | Low
**Component:** [System component]

**Description:** [What happens]
**Root Cause:** [Technical reason]
**Impact:** [Effect on users]
**Workaround:** [Temporary fix]
**Proposed Solution:** [Long-term fix]
**Status:** [Current state]
**GitHub Issue:** [Link]
**Estimated Fix Time:** [Hours]
```

---

**Document maintained by:** Testing Team  
**Review frequency:** Daily during testing phase
