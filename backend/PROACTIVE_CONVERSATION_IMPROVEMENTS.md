# 🎯 Proactive Conversation Improvements

**Date:** November 15, 2025  
**Purpose:** Make AI more proactive and conversation-initiating for dementia patients

---

## Problem Statement

People with dementia typically do NOT volunteer information or start conversations on their own. They are more reactive - they respond to questions rather than initiate dialogue.

**Previous behavior:**
- AI waited for user to speak first
- AI asked passive questions: "איך אני יכול לעזור לך היום?" (How can I help you today?)
- Conversations were shallow and didn't engage the patient effectively

**Required behavior:**
- AI should LEAD the conversation
- AI should ask SPECIFIC questions about daily life
- AI should proactively introduce topics
- AI should follow up relentlessly on every response

---

## Changes Made

### 1. Updated System Prompt (realtime.service.ts)

**Location:** `buildSystemPrompt()` method

**Added comprehensive section: "YOUR ROLE AND CONVERSATION STYLE"**

Key principles:
- ✅ **BE PROACTIVE, NOT REACTIVE** - AI initiates topics, doesn't wait
- ✅ **ASK OPEN-ENDED QUESTIONS** - Encourage storytelling
- ✅ **FOLLOW-UP RELENTLESSLY** - Every user response triggers 2-3 follow-up questions
- ✅ **USE MEMORIES TO START CONVERSATIONS** - Reference past topics
- ✅ **INITIATE SPECIFIC ACTIVITIES** - Suggest photos, music, reminiscing
- ✅ **TIME-APPROPRIATE STARTERS** - Different questions for morning/afternoon/evening

**Example improvements:**

❌ **OLD (Passive):**
```
"שלום! איך אני יכול לעזור לך היום?"
(Hello! How can I help you today?)
```

✅ **NEW (Proactive):**
```
"בוקר טוב! איך היה השינה הלילה? מה אכלת לארוחת בוקר?"
(Good morning! How was your sleep last night? What did you eat for breakfast?)
```

### 2. AI Speaks First (Session Initialization)

**Location:** `createWebSocket()` method in `realtime.service.ts`

**Added automatic initial greeting:**
- AI now speaks FIRST when conversation starts (after 1.5 second delay)
- Greeting is time-appropriate based on current hour
- Greeting includes SPECIFIC question, not generic "how are you"

**Code added:**
```typescript
setTimeout(() => {
  ws.send(JSON.stringify({
    type: 'response.create',
    response: {
      modalities: ['audio', 'text'],
      instructions: `This is the START of a new conversation. You MUST speak first!
      
Generate a time-appropriate greeting with a SPECIFIC question...
      
CRITICAL: Do NOT say "How can I help you today?" or wait for user to start!`,
    },
  }));
}, 1500);
```

**Time-based greetings:**
- **Morning (5-12):** "בוקר טוב! איך היה השינה הלילה? מה אכלת לארוחת בוקר?"
- **Afternoon (12-17):** "שלום! מה עשית הבוקר? יצאת החוצה?"
- **Evening (17-22):** "ערב טוב! איך עבר היום? מה היה הדבר הכי טוב שקרה?"
- **Night (22-5):** "שלום! עדיין ער? איך אתה מרגיש עכשיו?"

---

## Conversation Flow Examples

### Example 1: Morning Conversation

**AI (proactive start):**
> "בוקר טוב! איך היה השינה הלילה? קמת מרגיע או עייף?"
> (Good morning! How was your sleep last night? Did you wake up refreshed or tired?)

**User:**
> "טוב, ישנתי בסדר"
> (Good, I slept fine)

**AI (follow-up):**
> "נהדר! מה אכלת לארוחת בוקר? הכנת משהו מיוחד?"
> (Great! What did you eat for breakfast? Did you make something special?)

**User:**
> "קפה ולחם"
> (Coffee and bread)

**AI (deeper follow-up):**
> "נשמע טוב. אתה אוהב לשבת בחוץ עם הקפה? יש לך מקום אהוב לשתות את הקפה בבוקר?"
> (Sounds good. Do you like to sit outside with your coffee? Do you have a favorite spot to drink coffee in the morning?)

### Example 2: Afternoon Conversation

**AI (proactive start):**
> "שלום! מה עשית הבוקר? יצאת לאוויר הצח?"
> (Hello! What did you do this morning? Did you go outside for fresh air?)

**User:**
> "כן, הלכתי לגינה"
> (Yes, I went to the garden)

**AI (specific follow-up):**
> "כמה יפה! מה ראית בגינה? הפרחים כבר פורחים?"
> (How nice! What did you see in the garden? Are the flowers blooming?)

**User:**
> "כן, יש ורדים"
> (Yes, there are roses)

**AI (memory + photos suggestion):**
> "אני זוכר שאתה אוהב את הוורדים! רוצה לראות תמונות של הגינה שלך מהשנים הקודמות?"
> (I remember you love roses! Want to see photos of your garden from previous years?)

---

## System Prompt - Key Instructions Added

### Conversation Principles (עקרונות שיחה)

```
1. BE PROACTIVE, NOT REACTIVE (יוזם, לא מגיב)
   ✅ Ask SPECIFIC questions about their life
   ✅ Don't wait for user to start topics
   
2. ASK OPEN-ENDED QUESTIONS (שאלות פתוחות)
   ✅ "ספר לי על..." (Tell me about...)
   ✅ "איך הרגשת כשהיית..." (How did you feel when you were...)
   
3. FOLLOW-UP RELENTLESSLY (עקוב אחר התשובות)
   ✅ Every user response triggers 2-3 follow-up questions
   ✅ Don't accept one-word answers - dig deeper
   
4. USE MEMORIES TO START CONVERSATIONS (השתמש בזיכרונות)
   ✅ Reference past conversations
   ✅ Build on previous topics
   
5. INITIATE SPECIFIC ACTIVITIES (יזום פעילויות ספציפיות)
   ✅ Suggest photos: "בוא נדבר על התמונות של המשפחה שלך!"
   ✅ Suggest music: "רוצה לשמוע שיר אהוב?"
   ✅ Suggest reminiscing: "ספר לי על היום שבו נישאת"
```

### Mandatory Rules

```
❌ NEVER say: "איך אני יכול לעזור לך?" (How can I help you?)
❌ NEVER wait passively for user to volunteer information
❌ NEVER accept one-word answers - always follow up with "ספר לי יותר..." (Tell me more...)

✅ ALWAYS start responses with a question or topic starter
✅ ALWAYS ask 2-3 follow-up questions if user gives short answer
✅ ALWAYS reference family members by name
✅ ALWAYS suggest activities proactively (photos, music, reminiscing)
```

---

## Testing Instructions

### 1. Start New Conversation

**Expected behavior:**
1. Open Flutter app and create new session
2. Wait ~2 seconds
3. AI should speak FIRST with time-appropriate greeting + specific question
4. User should NOT need to say "hello" first

**Test times:**
- Morning (9 AM): Should ask about sleep + breakfast
- Afternoon (2 PM): Should ask about morning activities
- Evening (7 PM): Should ask about how the day went

### 2. Test Follow-Up Questions

**User says:** "הלכתי לגינה" (I went to the garden)

**Expected AI behavior:**
1. Acknowledge: "כמה יפה!"
2. IMMEDIATELY follow up: "מה ראית שם? הפרחים פורחים?"
3. If user answers with 1-2 words, ask MORE questions
4. Don't stop until user provides 3-4 sentences of engagement

### 3. Test Topic Initiation

**After 2-3 exchanges, AI should introduce NEW topic:**

Expected examples:
- "ספר לי על הנכדים שלך - מה שמם?"
- "הילדים שלך התקשרו אליך השבוע?"
- "רוצה לראות תמונות של המשפחה?"
- "אולי נשמע קצת מוזיקה שאתה אוהב?"

---

## Monitoring & Metrics

### Key Indicators of Success

1. **Conversation initiation rate:** AI speaks first in 100% of new sessions
2. **Follow-up question rate:** AI asks ≥2 questions per user response
3. **Topic diversity:** AI introduces ≥3 different topics per 10-minute conversation
4. **User engagement:** Average response length increases (measure words per response)
5. **Passive phrases:** Zero instances of "איך אני יכול לעזור לך" in transcripts

### Log Monitoring

```bash
# Check if AI speaks first
tail -f /tmp/never-alone-backend.log | grep "🎯 Triggering AI to speak first"

# Check for proactive greetings
tail -f /tmp/never-alone-backend.log | grep "Sending proactive initial greeting"

# Monitor conversation transcript for passive phrases (should be ZERO)
tail -f /tmp/never-alone-backend.log | grep "איך אני יכול לעזור"
```

---

## Technical Details

### Files Modified

1. **`backend/src/services/realtime.service.ts`**
   - `buildSystemPrompt()`: Added comprehensive proactive conversation instructions
   - `createWebSocket()`: Added automatic initial greeting trigger after session ready

### Configuration

No configuration changes needed - behavior is automatic based on system prompt.

### Dependencies

No new dependencies added.

---

## Future Enhancements (Post-MVP)

1. **Contextual memory-based starters:** Use long-term memories to ask about specific past events
   - "איך שרה? היא התקשרה אליך השבוע?" (How's Sarah? Did she call you this week?)
   
2. **Mood-based topic selection:** If user seems sad, ask about happy memories
   
3. **Family member integration:** Allow family to suggest conversation topics via dashboard
   
4. **Activity reminders:** "זוכר שרצית לשתול פרחים? עשית את זה?" (Remember you wanted to plant flowers? Did you do it?)

---

## Acceptance Criteria

✅ AI speaks first in 100% of new conversations  
✅ AI asks time-appropriate specific questions (not generic "how can I help")  
✅ AI follows up with 2-3 questions per user response  
✅ Zero instances of passive phrases like "איך אני יכול לעזור לך"  
✅ Average conversation length increases by 30%+  
✅ User provides longer responses (measured by word count)  
✅ Family members report patient is more engaged in conversations

---

**Status:** ✅ IMPLEMENTED  
**Testing:** Ready for manual testing  
**Deployment:** Restart backend to activate changes

```bash
# Restart backend to apply changes
cd /Users/robenhai/Never\ Alone/backend
npm run start:dev
```
