# 🐛 Bug Fixes: Test Scenario 2 Issues

**Date:** November 11, 2025  
**Issues Found During:** Test Scenario 2 (Medication Reminders)  
**Status:** ✅ FIXED

---

## Issues Identified

### Issue #1: AI Uses Wrong Name ("יקר" instead of "תפארת")

**Severity:** Medium  
**Description:** The AI addresses the user as "יקר" (dear/generic) instead of using the actual user's name "תפארת" (Tiferet).

**Root Cause:**
- User profile in Cosmos DB has `personalInfo.fullName = "תפארת נחמיה"` (new schema)
- But the code was reading `userProfile.name` (old schema) which doesn't exist
- Falls back to default "User" → AI uses generic greeting

**Conversation Example:**
```json
{
  "role": "assistant",
  "transcript": "שלום יקר, נעים לשמוע אותך. איך אתה מרגיש הערב?"
}
```
Expected: "שלום תפארת, נעים לשמוע אותך..."

**Fix Applied:**
Updated `backend/src/services/realtime.service.ts` to handle both old and new schema:
```typescript
// Extract user name from profile (handle both old and new schema)
const userName = userProfile?.name || 
                 userProfile?.personalInfo?.fullName || 
                 userProfile?.personalInfo?.firstName || 
                 'User';

const userAge = userProfile?.age || 
                userProfile?.personalInfo?.age || 
                70;
```

**Files Changed:**
- `backend/src/services/realtime.service.ts` (lines 56-68)

---

### Issue #2: AI Doesn't Know About Medications

**Severity:** High  
**Description:** When user asks about their medication, the AI doesn't provide specific information even though medications exist in the safety-config.

**Conversation Example:**
```json
{
  "role": "user",
  "transcript": "אני חושב שאני צריכה לקחת תרופה אבל אני לא בטוח איזה ומתי"
},
{
  "role": "assistant",
  "transcript": "הכול בסדר, בוא ננסה לזכור. אתה בדרך כלל לוקח תרופה בבוקר או בערב?"
}
```

Expected: "אתה צריך לקחת Test Aspirin (100mg) בשעה 20:21"

**Root Cause:**
- Medications exist in `safety-config` container: `Test Aspirin 100mg at 20:21`
- But medications were NOT being passed to the system prompt
- AI had no knowledge of the medication schedule

**Fix Applied:**

1. **Added medications to SystemPromptContext interface:**
```typescript
// backend/src/interfaces/realtime.interface.ts
export interface SystemPromptContext {
  userName: string;
  userAge: number;
  language: string;
  cognitiveMode: string;
  familyMembers: Array<{ name: string; relationship: string }>;
  safetyRules: any;
  medications: Array<{ name: string; dosage: string; times: string[] }>; // NEW
  memories: {
    shortTerm: any[];
    working: any;
    longTerm: any[];
  };
}
```

2. **Pass medications from safety-config:**
```typescript
// backend/src/services/realtime.service.ts (line 78)
const systemPrompt = this.buildSystemPrompt({
  userName,
  userAge,
  language: config.language || userProfile?.personalInfo?.language || 'he',
  cognitiveMode: userProfile?.cognitiveMode || 'standard',
  familyMembers: userProfile?.familyMembers || [],
  safetyRules: safetyConfig,
  medications: safetyConfig?.medications || [], // NEW
  memories,
});
```

3. **Include medications in system prompt:**
```typescript
// backend/src/services/realtime.service.ts (buildSystemPrompt method)
const medicationsFormatted = medications && medications.length > 0
  ? medications.map((med) => `- ${med.name} (${med.dosage}) - taken at: ${med.times.join(', ')}`).join('\n')
  : 'No medications configured';

// Added to prompt:
# MEDICATIONS
${medicationsFormatted}
When user asks about medications, refer to the list above. Help them remember when to take medications.
```

**Files Changed:**
- `backend/src/interfaces/realtime.interface.ts` (line 37)
- `backend/src/services/realtime.service.ts` (lines 78, 427-431, 449-451)

---

## Testing the Fixes

### Test 1: Verify Name Fix

**Command to check:**
```bash
# Start a new conversation and check if AI uses "תפארת"
# Expected: "שלום תפארת" instead of "שלום יקר"
```

**Expected Behavior:**
- AI greets user by name: "שלום תפארת"
- System prompt includes: `Name: תפארת נחמיה`

### Test 2: Verify Medication Fix

**Command to check:**
```bash
# Ask: "אני לא זוכר מתי אני צריך לקחת את התרופות"
# (I don't remember when I need to take my medications)
```

**Expected Behavior:**
- AI responds with specific medication: "אתה צריך לקחת Test Aspirin (100mg) בשעה 20:21"
- System prompt includes medication list

---

## Verification Steps

1. **Restart backend** (to reload code changes):
   ```bash
   cd /Users/robenhai/Never\ Alone
   ./start.sh
   ```

2. **Start new conversation** in Flutter app

3. **Test name greeting:**
   - Say: "שלום" (Hello)
   - Expected: AI says "שלום תפארת" not "שלום יקר"

4. **Test medication knowledge:**
   - Say: "אני לא זוכר מתי אני צריך לקחת את התרופות שלי"
   - Expected: AI tells you "Test Aspirin 100mg at 20:21"

---

## Impact Assessment

### Before Fix:
- ❌ Impersonal greeting ("יקר" = dear/generic)
- ❌ AI doesn't know medication schedule
- ❌ User confused about when to take meds

### After Fix:
- ✅ Personal greeting using actual name ("תפארת")
- ✅ AI knows medication schedule
- ✅ AI can remind user about medications
- ✅ Better user experience (feels more personal)

---

## Related Issues

### Potential Additional Fix Needed:
- **Family members**: Check if `familyMembers` array is being loaded correctly from profile
- **Current finding**: Profile schema might have changed, need to verify familyMembers path

### Follow-up Actions:
1. ✅ Fix applied and documented
2. ⏳ Restart backend to apply changes
3. ⏳ Test both fixes in new conversation
4. ⏳ Update TEST_SCENARIO_2_CHECKLIST.md with results
5. ⏳ Continue Test Scenario 2 (medication reminder flow)

---

## Lessons Learned

1. **Always check schema compatibility:** When profile schema changes (old vs new), handle both cases
2. **System prompt is critical:** If data isn't in the system prompt, AI won't know about it
3. **Test with actual conversations:** Only way to catch these issues is through end-to-end testing
4. **Document data structures:** Need better documentation of expected profile schema

---

**Fixes Complete:** November 11, 2025, 20:30  
**Next Step:** Restart backend and re-test with new conversation
