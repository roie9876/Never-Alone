# 🔔 Reminder System - Technical Specification

## Overview

The Never Alone reminder system enables **proactive AI interactions** despite Azure OpenAI Realtime API's limitation that it cannot initiate conversations. This document specifies the hybrid architecture that combines **pre-recorded audio** (for scheduled events) with **Realtime API sessions** (for conversational confirmation).

**Key Innovation:** Pre-recorded audio plays without user action → User responds via button → Realtime API activates with context

---

## Problem Statement

### Azure Realtime API Limitation
The Azure OpenAI Realtime API **always waits for user input** before responding. It cannot:
- Initiate conversations ("Hello, how are you feeling today?")
- Proactively check in at scheduled times
- Speak medication reminders without user pressing a button first

### Business Requirement
Dementia Mode requires:
- **Medication reminders** at scheduled times (e.g., 9:00 AM, 9:00 PM)
- **Daily check-ins** every 2-4 hours
- **Appointment reminders** 30 minutes before scheduled events
- **Photo viewing prompts** to maintain engagement

### Solution Architecture
**Hybrid approach:** Scheduled backend events trigger pre-recorded TTS audio → User interaction → Realtime API session with context

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Orchestrator (Node.js)               │
│  • Cron scheduler (medication, check-ins, appointments)         │
│  • Event queue (Azure Service Bus or Redis)                     │
│  • Pre-recorded audio library (Azure Blob Storage)              │
│  • Reminder state management (Cosmos DB)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Tablet Application (Flutter)                  │
│  • Receives scheduled event notifications via WebSocket         │
│  • Plays pre-recorded audio immediately (no user action)        │
│  • Displays response buttons (large, high contrast)             │
│  • Initiates Realtime API session when user responds            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                Azure OpenAI Realtime API                         │
│  • Activates AFTER user button press                            │
│  • Receives context about scheduled event from backend          │
│  • Confirms action verbally + logs transcript                   │
│  • Can extend into full conversation if user engages            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reminder Types

### 1. Medication Reminders (Highest Priority)

**Frequency:** Daily, multiple times (e.g., 9:00 AM, 9:00 PM)  
**Criticality:** HIGH - Missed medications = family alert  
**Legal requirement:** Verbal confirmation + transcript logging

#### Flow Diagram

```
[9:00 AM - Backend Cron Job Fires]
        ↓
[Backend sends event to tablet via WebSocket]
        ↓
[Tablet plays pre-recorded audio IMMEDIATELY]
🔊 "תפארת, הגיע הזמן לקחת את התרופות שלך"
   (Tiferet, it's time to take your medication)
        ↓
[Screen displays 3 large buttons]
┌─────────────────────────────────────────┐
│   [אני לוקח עכשיו]                      │  ← "Taking now"
│   (I'm taking them now)                 │
│                                         │
│   [הזכר לי בעוד 10 דקות]               │  ← "Remind in 10 min"
│   (Remind me in 10 minutes)             │
│                                         │
│   [דבר איתי]                            │  ← "Talk to me"
│   (Talk to me)                          │
└─────────────────────────────────────────┘
        ↓
[User presses button] → [Different paths based on selection]
```

#### Path 1: "I'm Taking Them Now"

```javascript
// User presses "אני לוקח עכשיו"
async function handleTakingNow(userId, reminderId) {
  // 1. Log acknowledgment timestamp
  await logReminderAcknowledgment(userId, reminderId, {
    acknowledgedAt: new Date().toISOString(),
    action: "taking_now"
  });
  
  // 2. Start Realtime API session with medication context
  const session = await startRealtimeAPISession(userId, {
    systemPrompt: `
User just acknowledged their 9:00 AM medication reminder.
Your job: Confirm they're taking it RIGHT NOW, then offer support.

1. Confirm: "נהדר! אתה לוקח את התרופות עכשיו?" (Great! You're taking the medication now?)
2. Wait for verbal confirmation
3. When confirmed, say: "מצוין! אני רושם שלקחת את התרופות ב-[TIME]. רוצה לדבר קצת?" 
   (Excellent! I'm logging that you took your medication at [TIME]. Want to talk a bit?)
4. If user wants to talk, continue naturally
5. If user says no/goodbye, end session gracefully
`,
    context: {
      reminderType: "medication",
      scheduledTime: "09:00",
      acknowledgedAt: new Date().toISOString(),
      medications: await getMedicationList(userId)
    },
    maxDuration: 300 // 5 minutes max for this session
  });
  
  // 3. Listen for verbal confirmation
  session.on('conversation.item.input_audio_transcription.completed', async (event) => {
    const userText = event.transcript.toLowerCase();
    
    // Confirmation keywords in Hebrew
    const confirmationKeywords = ['כן', 'לוקח', 'לקחתי', 'טוב', 'בסדר', 'אוקיי'];
    const hasConfirmation = confirmationKeywords.some(kw => userText.includes(kw));
    
    if (hasConfirmation) {
      // Log verbal confirmation
      await logMedicationConfirmation(userId, reminderId, {
        verbalConfirmationTime: new Date().toISOString(),
        transcript: event.transcript,
        audioUrl: null // Audio deleted per privacy decision
      });
      
      // Clear any pending alerts
      await clearFamilyAlert(userId, reminderId);
    }
  });
  
  return session;
}
```

**Cosmos DB Document (Conversations Container):**

```json
{
  "id": "conv_abc123",
  "userId": "user_xyz",
  "type": "medication_confirmation",
  "scheduledTime": "2025-11-09T09:00:00Z",
  "acknowledgedTime": "2025-11-09T09:01:30Z",
  "verbalConfirmationTime": "2025-11-09T09:03:15Z",
  "turns": [
    {
      "role": "assistant",
      "timestamp": "2025-11-09T09:01:35Z",
      "transcript": "נהדר! אתה לוקח את התרופות עכשיו?",
      "audioUrl": null
    },
    {
      "role": "user",
      "timestamp": "2025-11-09T09:03:15Z",
      "transcript": "כן, אני לוקח אותם עכשיו",
      "audioUrl": null
    },
    {
      "role": "assistant",
      "timestamp": "2025-11-09T09:03:20Z",
      "transcript": "מצוין! אני רושם שלקחת את התרופות ב-9:03. רוצה לדבר קצת?",
      "audioUrl": null
    }
  ],
  "metadata": {
    "medicationReminder": {
      "medications": ["Metformin 500mg", "Aspirin 81mg"],
      "scheduledTime": "09:00",
      "confirmed": true
    }
  },
  "ttl": 7776000 // 90 days
}
```

#### Path 2: "Remind Me in 10 Minutes"

```javascript
async function handleSnooze(userId, reminderId, delayMinutes = 10) {
  // 1. Log snooze action
  await logReminderSnooze(userId, reminderId, {
    snoozedAt: new Date().toISOString(),
    delayMinutes: delayMinutes
  });
  
  // 2. Schedule new reminder
  const newReminderTime = new Date(Date.now() + delayMinutes * 60 * 1000);
  await scheduleReminder(userId, {
    type: "medication",
    originalReminderId: reminderId,
    scheduledFor: newReminderTime,
    isSnooze: true,
    snoozeCount: await getSnoozeCount(reminderId) + 1
  });
  
  // 3. If snooze count > 3, alert family
  const snoozeCount = await getSnoozeCount(reminderId);
  if (snoozeCount >= 3) {
    await sendFamilyAlert(userId, {
      type: "medication_reminder_snoozed_multiple_times",
      severity: "medium",
      message: `תפארת has snoozed their 9:00 AM medication reminder ${snoozeCount} times. Last snooze: ${new Date().toLocaleTimeString('he-IL')}`,
      scheduledTime: "09:00",
      currentTime: new Date().toISOString()
    });
  }
  
  // 4. Confirm snooze with pre-recorded audio
  await playPrerecordedAudio(userId, "reminder-snoozed-10min-hebrew.mp3");
  // Audio: "בסדר, אזכיר לך בעוד 10 דקות" (Okay, I'll remind you in 10 minutes)
}
```

#### Path 3: "Talk to Me"

```javascript
async function handleTalkFirst(userId, reminderId) {
  // 1. Start natural conversation WITHOUT mentioning medication immediately
  const session = await startRealtimeAPISession(userId, {
    systemPrompt: `
User has a medication reminder at 9:00 AM but pressed "Talk to me" instead of confirming.
This suggests they want connection first, medication discussion second.

1. Start with warm greeting: "שלום תפארת! איך אתה מרגיש הבוקר?" (Hello Tiferet! How are you feeling this morning?)
2. Have natural conversation for 1-2 minutes
3. After engagement, GENTLY remind: "בדרך אגב, אתה זוכר שצריך לקחת את התרופות?" 
   (By the way, do you remember you need to take your medication?)
4. Don't force - if they deflect, try again after 1 more minute
5. If they still don't take it after 5 minutes, suggest calling family member

IMPORTANT: Don't make conversation feel transactional. They need companionship first.
`,
    context: {
      reminderType: "medication",
      scheduledTime: "09:00",
      userPressedTalkFirst: true
    }
  });
  
  // 2. Set 5-minute timer - if no confirmation by then, alert family
  setTimeout(async () => {
    const confirmed = await checkMedicationConfirmed(userId, reminderId);
    if (!confirmed) {
      await sendFamilyAlert(userId, {
        type: "medication_not_confirmed_after_conversation",
        severity: "high",
        message: `תפארת had a conversation but did not confirm taking 9:00 AM medication`,
        scheduledTime: "09:00",
        currentTime: new Date().toISOString()
      });
    }
  }, 5 * 60 * 1000);
  
  return session;
}
```

---

### 2. Daily Check-In Reminders

**Frequency:** Every 2-4 hours (configurable per user)  
**Purpose:** Combat loneliness, maintain engagement  
**Criticality:** MEDIUM - No alert if missed, but tracked for family dashboard

#### Flow

```
[2:00 PM - Backend Cron Job Fires]
        ↓
[Tablet plays pre-recorded audio]
🔊 "שלום תפארת! זה זמן טוב לדבר קצת?" 
   (Hello Tiferet! Is this a good time to talk a bit?)
        ↓
[Screen displays buttons]
┌─────────────────────────────────────────┐
│   [בוא נדבר]                            │  ← "Let's talk"
│   (Let's talk)                          │
│                                         │
│   [עסוק עכשיו]                          │  ← "Busy now"
│   (Busy now)                            │
└─────────────────────────────────────────┘
```

**If "Let's talk":**
```javascript
async function handleCheckInAccepted(userId) {
  const session = await startRealtimeAPISession(userId, {
    systemPrompt: `
This is a daily check-in conversation. User accepted your invitation to talk.

1. Start warmly: "נהדר! איך היה לך היום?" (Great! How has your day been?)
2. Ask about recent activities, feelings, memories
3. If they mention family, consider offering to show photos (context-aware trigger)
4. Aim for 5-10 minute conversation
5. End gracefully: "תודה על השיחה המקסימה! אני כאן תמיד אם תרצה לדבר." 
   (Thank you for the lovely conversation! I'm always here if you want to talk.)

TOPICS TO EXPLORE:
- How they're feeling today
- What they had for meals
- Weather, garden, hobbies
- Family members (recent calls, visits)
- Upcoming appointments or events
`,
    context: {
      reminderType: "daily_check_in",
      scheduledTime: "14:00",
      lastCheckIn: await getLastCheckInTime(userId)
    }
  });
  
  return session;
}
```

**If "Busy now":**
```javascript
async function handleCheckInDeclined(userId, checkInId) {
  // Log declined check-in (for dashboard metrics)
  await logCheckInDeclined(userId, checkInId, {
    declinedAt: new Date().toISOString(),
    reason: "user_busy"
  });
  
  // Schedule next check-in in 2 hours
  const nextCheckIn = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await scheduleReminder(userId, {
    type: "daily_check_in",
    scheduledFor: nextCheckIn
  });
  
  // Play confirmation audio
  await playPrerecordedAudio(userId, "check-in-declined-hebrew.mp3");
  // Audio: "בסדר גמור! נדבר מאוחר יותר." (No problem! We'll talk later.)
}
```

---

### 3. Appointment Reminders

**Frequency:** 30 minutes before scheduled appointment  
**Purpose:** Help user prepare for doctor visit, family call, etc.  
**Criticality:** MEDIUM-HIGH - Alert family if not acknowledged

#### Flow

```
[10:30 AM - 30 minutes before 11:00 AM doctor appointment]
        ↓
[Tablet plays pre-recorded audio]
🔊 "תפארת, תזכורת: יש לך פגישה עם הרופא בעוד חצי שעה בשעה 11:00"
   (Tiferet, reminder: You have a doctor appointment in 30 minutes at 11:00)
        ↓
[Screen displays buttons]
┌─────────────────────────────────────────┐
│   [אני זוכר, תודה]                      │  ← "I remember, thanks"
│   (I remember, thanks)                  │
│                                         │
│   [תזכיר לי שוב בעוד 10 דקות]          │  ← "Remind again in 10"
│   (Remind me again in 10 minutes)       │
│                                         │
│   [איזו פגישה?]                         │  ← "What appointment?"
│   (What appointment?)                   │
└─────────────────────────────────────────┘
```

**If "I remember, thanks":**
```javascript
async function handleAppointmentAcknowledged(userId, appointmentId) {
  await logAppointmentAcknowledgment(userId, appointmentId, {
    acknowledgedAt: new Date().toISOString()
  });
  
  // Brief Realtime API confirmation
  const session = await startRealtimeAPISession(userId, {
    systemPrompt: `
User acknowledged their 11:00 AM doctor appointment.
Say: "נהדר! מיכל תבוא לאסוף אותך בשעה 10:50. צריך משהו לפני שאתה יוצא?"
(Great! Michal will pick you up at 10:50. Need anything before you leave?)

Keep it SHORT - they need to prepare, not chat.
`,
    maxDuration: 120 // 2 minutes max
  });
  
  return session;
}
```

**If "What appointment?":**
```javascript
async function handleAppointmentConfusion(userId, appointmentId) {
  const appointment = await getAppointmentDetails(appointmentId);
  
  const session = await startRealtimeAPISession(userId, {
    systemPrompt: `
User doesn't remember their appointment. Gently remind them with details:

"יש לך פגישה עם ${appointment.doctorName} בשעה ${appointment.time}. 
${appointment.familyMember} תבוא לאסוף אותך בעוד חצי שעה. 
זה לבדיקה שגרתית, שום דבר לדאוג עליו."

(You have an appointment with ${appointment.doctorName} at ${appointment.time}.
${appointment.familyMember} will pick you up in 30 minutes.
It's a routine checkup, nothing to worry about.)

Then ask: "מבין? יש לך שאלות על הפגישה?" (Understand? Any questions about the appointment?)
`,
    context: {
      appointment: appointment
    }
  });
  
  // Alert family that user was confused about appointment
  await sendFamilyAlert(userId, {
    type: "appointment_confusion",
    severity: "medium",
    message: `תפארת didn't remember ${appointment.time} appointment with ${appointment.doctorName}`,
    appointmentDetails: appointment
  });
  
  return session;
}
```

---

## Pre-Recorded Audio Library

### Audio Files Storage

**Location:** Azure Blob Storage  
**Format:** MP3, 128 kbps, mono (optimized for elderly hearing)  
**Language:** Hebrew (MVP), English (future)

### Required Audio Files

| File Name | Hebrew Text | English Translation | Use Case |
|-----------|-------------|---------------------|----------|
| `medication-reminder-hebrew.mp3` | "תפארת, הגיע הזמן לקחת את התרופות שלך" | "Tiferet, it's time to take your medication" | Medication reminder trigger |
| `check-in-hebrew.mp3` | "שלום תפארת! זה זמן טוב לדבר קצת?" | "Hello Tiferet! Is this a good time to talk?" | Daily check-in trigger |
| `reminder-snoozed-10min-hebrew.mp3` | "בסדר, אזכיר לך בעוד 10 דקות" | "Okay, I'll remind you in 10 minutes" | Snooze confirmation |
| `check-in-declined-hebrew.mp3` | "בסדר גמור! נדבר מאוחר יותר" | "No problem! We'll talk later" | Check-in declined |
| `appointment-30min-hebrew.mp3` | "תפארת, תזכורת: יש לך פגישה בעוד חצי שעה" | "Tiferet, reminder: You have an appointment in 30 minutes" | Appointment reminder |

### Dynamic Audio Generation (Future)

For user-specific reminders (e.g., "Time for your walk in the garden"), use Azure Text-to-Speech API to generate audio on-the-fly:

```javascript
async function generatePersonalizedAudio(userId, reminderText) {
  const audioBuffer = await azureTTS.synthesizeSpeech({
    text: reminderText,
    voice: "he-IL-AvriNeural", // Hebrew male voice
    outputFormat: "audio-16khz-128kbitrate-mono-mp3"
  });
  
  const audioUrl = await uploadToBlob(audioBuffer, `reminders/${userId}/${Date.now()}.mp3`);
  return audioUrl;
}
```

---

## Context-Aware Photo Triggering

### AI Function Calling

When AI detects appropriate moment to show photos during conversation, it calls this function:

```javascript
// Function definition (passed to Realtime API session)
const photoTriggerTool = {
  name: "trigger_show_photos",
  description: "Show family photos to user when contextually appropriate during conversation",
  parameters: {
    type: "object",
    properties: {
      trigger_reason: {
        type: "string",
        enum: [
          "user_mentioned_family",      // User said name like "Sarah", "מיכל"
          "user_expressed_sadness",      // User said "בודד", "עצוב", "לבד"
          "long_conversation_engagement", // 10+ minutes of engaged conversation
          "user_requested_photos"        // User explicitly asked to see photos
        ],
        description: "Why are we showing photos now?"
      },
      mentioned_names: {
        type: "array",
        items: { type: "string" },
        description: "Names of family members mentioned (if applicable)"
      },
      context: {
        type: "string",
        description: "Brief explanation of conversation context"
      },
      emotional_state: {
        type: "string",
        enum: ["neutral", "sad", "happy", "confused", "anxious"],
        description: "User's current emotional state (if detectable)"
      }
    },
    required: ["trigger_reason", "context"]
  }
};
```

### Backend Handler

```javascript
// When AI calls trigger_show_photos() function
async function handleShowPhotos(userId, args) {
  const { trigger_reason, mentioned_names, context, emotional_state } = args;
  
  // 1. Query relevant photos from Cosmos DB
  const photos = await queryPhotos(userId, {
    taggedPeople: mentioned_names,
    excludeRecentlyShown: true,     // Last 7 days
    sortBy: "relevance_and_recency",
    limit: 5
  });
  
  if (photos.length === 0) {
    // No photos available - return result to AI
    return {
      success: false,
      reason: "no_photos_available",
      message: "No photos match the criteria or all recent photos already shown"
    };
  }
  
  // 2. Send photos to tablet UI
  await sendToTablet(userId, {
    type: "display_photos",
    photos: photos.map(p => ({
      url: p.blobUrl,
      caption: p.caption || "",
      taggedPeople: p.taggedPeople || [],
      dateTaken: p.dateTaken || null,
      location: p.location || null
    })),
    context: context,
    displayMode: "slideshow" // Auto-advance every 10 seconds
  });
  
  // 3. Update last_shown timestamp for each photo
  for (const photo of photos) {
    await updatePhotoMetadata(photo.id, {
      last_shown_at: new Date().toISOString(),
      shown_count: (photo.shown_count || 0) + 1
    });
  }
  
  // 4. Log photo viewing event
  await logPhotoViewingEvent(userId, {
    trigger_reason: trigger_reason,
    photos_shown: photos.map(p => p.id),
    mentioned_names: mentioned_names,
    emotional_state: emotional_state,
    timestamp: new Date().toISOString()
  });
  
  // 5. Return result to AI for natural response
  return {
    success: true,
    photos_shown: photos.length,
    photo_descriptions: photos.map(p => 
      `Photo of ${p.taggedPeople.join(", ")} taken on ${formatDate(p.dateTaken)} at ${p.location || "unknown location"}`
    )
  };
}
```

### AI Response After Photos Shown

```javascript
// AI receives function result and responds naturally

// Example 1: User mentioned family
// AI called: trigger_show_photos({ trigger_reason: "user_mentioned_family", mentioned_names: ["מיכל"] })
// Result: { success: true, photos_shown: 3, photo_descriptions: ["Photo of מיכל taken on 2024-08-15 at Tel Aviv beach"] }

AI response: "הנה כמה תמונות יפות של מיכל! זאת מהחוף בתל אביב באוגוסט. 
              את זוכר את היום הזה? נראה שהיה יום מקסים."
              (Here are some beautiful photos of מיכל! This is from the Tel Aviv beach in August. 
              Do you remember that day? It looks like it was a lovely day.)

// Example 2: User is sad
// AI called: trigger_show_photos({ trigger_reason: "user_expressed_sadness", emotional_state: "sad" })

AI response: "אני מבין שאתה מרגיש בודד. הנה תמונות של כל המשפחה ביחד מהפסח. 
              כולם אוהבים אותך מאוד. ספר לי, מי כאן בתמונה הזאת?"
              (I understand you feel lonely. Here are photos of the whole family together from Passover. 
              Everyone loves you very much. Tell me, who is in this photo?)
```

### Photo Query Logic

```javascript
async function queryPhotos(userId, filters) {
  // Build query based on filters
  let query = `
    SELECT * FROM Photos p
    WHERE p.userId = @userId
      AND p.deleted = false
  `;
  
  const params = { userId };
  
  // Filter by tagged people (if names mentioned)
  if (filters.taggedPeople && filters.taggedPeople.length > 0) {
    query += ` AND ARRAY_CONTAINS(p.taggedPeople, @taggedPerson, true)`;
    params.taggedPerson = filters.taggedPeople[0]; // Match first name
  }
  
  // Exclude recently shown photos (last 7 days)
  if (filters.excludeRecentlyShown) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query += ` AND (p.last_shown_at IS NULL OR p.last_shown_at < @sevenDaysAgo)`;
    params.sevenDaysAgo = sevenDaysAgo;
  }
  
  // Sort by relevance (tagged people match) + least recently shown
  query += `
    ORDER BY 
      (ARRAY_LENGTH(p.taggedPeople) > 0 ? 1 : 0) DESC,  -- Photos with tags first
      p.last_shown_at ASC,                               -- Least recently shown
      p.uploadedAt DESC                                  -- Newest first
    OFFSET 0 LIMIT @limit
  `;
  
  params.limit = filters.limit || 5;
  
  const results = await cosmosDB.query(query, params);
  return results;
}
```

---

## Family Dashboard Integration

### Reminder Activity Widget

```javascript
// Family dashboard displays reminder metrics

{
  "todayReminders": {
    "medication": {
      "scheduled": 2,           // 9:00 AM, 9:00 PM
      "acknowledged": 1,        // 9:00 AM taken
      "confirmed": 1,           // Verbal confirmation logged
      "missed": 0,              // None missed
      "snoozed": 0              // No snoozes
    },
    "checkIns": {
      "scheduled": 3,           // 10:00 AM, 2:00 PM, 6:00 PM
      "completed": 2,           // 10:00 AM, 2:00 PM
      "declined": 1,            // 6:00 PM declined
      "averageDuration": "6 minutes"
    },
    "appointments": {
      "upcoming": 1,            // 11:00 AM doctor
      "acknowledged": true,     // User confirmed
      "confusion": false        // No confusion detected
    }
  },
  "weekTrend": {
    "medicationCompliance": "95%",  // 19/20 doses taken
    "conversationMinutes": 42,      // Total conversation time
    "photoViewingSessions": 3       // Times photos were shown
  }
}
```

### Alert Log

```javascript
// Alerts sent to family (SMS + push notification)

[
  {
    "timestamp": "2025-11-09T09:25:00Z",
    "type": "medication_snoozed_3_times",
    "severity": "medium",
    "message": "תפארת has snoozed morning medication 3 times",
    "actions_taken": ["SMS sent to Sarah", "Push notification sent"],
    "resolved": false
  },
  {
    "timestamp": "2025-11-09T10:30:00Z",
    "type": "appointment_confusion",
    "severity": "medium",
    "message": "תפארת didn't remember 11:00 AM doctor appointment",
    "actions_taken": ["AI explained appointment details", "SMS sent to Sarah"],
    "resolved": true
  }
]
```

---

## Technical Implementation (Node.js/NestJS)

### Cron Scheduler Service

```typescript
// reminder-scheduler.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from './reminder.service';
import { CosmosDBService } from './cosmos-db.service';

@Injectable()
export class ReminderSchedulerService {
  constructor(
    private reminderService: ReminderService,
    private cosmosDB: CosmosDBService
  ) {}

  // Check every minute for due reminders
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueReminders() {
    const now = new Date();
    
    // Query all users with reminders due in next 60 seconds
    const dueReminders = await this.cosmosDB.queryReminders({
      scheduledFor: {
        $gte: now.toISOString(),
        $lt: new Date(now.getTime() + 60000).toISOString()
      },
      status: 'pending'
    });
    
    for (const reminder of dueReminders) {
      await this.reminderService.triggerReminder(reminder);
    }
  }
}
```

### Reminder Service

```typescript
// reminder.service.ts

import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { AudioService } from './audio.service';
import { RealtimeAPIService } from './realtime-api.service';

@Injectable()
export class ReminderService {
  constructor(
    private wsGateway: WebSocketGateway,
    private audioService: AudioService,
    private realtimeAPI: RealtimeAPIService
  ) {}

  async triggerReminder(reminder: Reminder) {
    const { userId, type, scheduledFor } = reminder;
    
    // 1. Get pre-recorded audio URL based on reminder type
    const audioUrl = this.getAudioForReminderType(type);
    
    // 2. Send event to tablet via WebSocket
    await this.wsGateway.sendToUser(userId, {
      type: 'scheduled_reminder',
      reminderId: reminder.id,
      reminderType: type,
      audioUrl: audioUrl,
      scheduledFor: scheduledFor,
      buttons: this.getButtonsForReminderType(type),
      metadata: reminder.metadata
    });
    
    // 3. Update reminder status
    await this.cosmosDB.updateReminder(reminder.id, {
      status: 'triggered',
      triggeredAt: new Date().toISOString()
    });
    
    // 4. Set timeout for family alert if not acknowledged
    setTimeout(() => {
      this.checkReminderAcknowledgment(reminder.id);
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  async handleUserResponse(reminderId: string, action: string) {
    const reminder = await this.cosmosDB.getReminder(reminderId);
    
    switch (action) {
      case 'taking_now':
        return await this.handleTakingNow(reminder);
      case 'snooze_10min':
        return await this.handleSnooze(reminder, 10);
      case 'talk_first':
        return await this.handleTalkFirst(reminder);
      case 'check_in_accept':
        return await this.handleCheckInAccepted(reminder);
      case 'check_in_decline':
        return await this.handleCheckInDeclined(reminder);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
  
  private getAudioForReminderType(type: string): string {
    const audioMap = {
      'medication': 'medication-reminder-hebrew.mp3',
      'daily_check_in': 'check-in-hebrew.mp3',
      'appointment': 'appointment-30min-hebrew.mp3'
    };
    
    return `https://storage.blob.core.windows.net/audio/${audioMap[type]}`;
  }
  
  private getButtonsForReminderType(type: string): Button[] {
    if (type === 'medication') {
      return [
        { id: 'taking_now', label: 'אני לוקח עכשיו', style: 'primary' },
        { id: 'snooze_10min', label: 'הזכר לי בעוד 10 דקות', style: 'secondary' },
        { id: 'talk_first', label: 'דבר איתי', style: 'secondary' }
      ];
    }
    
    if (type === 'daily_check_in') {
      return [
        { id: 'check_in_accept', label: 'בוא נדבר', style: 'primary' },
        { id: 'check_in_decline', label: 'עסוק עכשיו', style: 'secondary' }
      ];
    }
    
    // ... other reminder types
  }
}
```

---

## MVP Simplifications

### For Mac Desktop POC:

1. **No background notifications** - App runs in foreground (kiosk mode)
2. **No push notifications** - Desktop alerts only
3. **Pre-recorded audio library limited** - 5 essential audio files
4. **Manual reminder scheduling** - Family sets via dashboard (no smart detection)
5. **Photo triggering: Context-aware only** - No random/scheduled triggers for MVP

### Deferred to Post-MVP:

1. **Smart reminder adjustment** - AI learns best times to check in
2. **Emotion-based photo triggers** - AI detects sadness via prosody analysis
3. **Video reminders** - Family member records personalized video message
4. **Location-based reminders** - "You're near the pharmacy, want to pick up medication?"
5. **Multi-modal notifications** - Vibration, light patterns, sound + visual

---

## Testing Strategy

### Unit Tests

```typescript
describe('ReminderService', () => {
  it('should trigger medication reminder at scheduled time', async () => {
    const reminder = createMedicationReminder('09:00');
    await reminderService.triggerReminder(reminder);
    
    expect(wsGateway.sendToUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        type: 'scheduled_reminder',
        reminderType: 'medication'
      })
    );
  });
  
  it('should alert family if medication snoozed 3+ times', async () => {
    const reminder = createMedicationReminder('09:00');
    await reminderService.handleSnooze(reminder, 10); // Snooze 1
    await reminderService.handleSnooze(reminder, 10); // Snooze 2
    await reminderService.handleSnooze(reminder, 10); // Snooze 3
    
    expect(familyAlertService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'medication_reminder_snoozed_multiple_times',
        severity: 'medium'
      })
    );
  });
});
```

### Integration Tests

```typescript
describe('Reminder Flow (E2E)', () => {
  it('should complete full medication confirmation flow', async () => {
    // 1. Trigger reminder
    await triggerMedicationReminder(userId, '09:00');
    
    // 2. User presses "Taking now"
    await handleUserAction(reminderId, 'taking_now');
    
    // 3. Realtime API session starts
    const session = await waitForRealtimeAPISession(userId);
    expect(session).toBeDefined();
    
    // 4. Simulate user verbal confirmation
    await simulateUserSpeech(session, 'כן, אני לוקח אותם עכשיו');
    
    // 5. Verify logged to Cosmos DB
    const conversation = await getConversation(session.conversationId);
    expect(conversation.metadata.medicationReminder.confirmed).toBe(true);
  });
});
```

---

## Monitoring & Metrics

### Key Metrics (Azure Application Insights)

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| **Medication reminder compliance** | 95%+ | < 85% for 7 days |
| **Reminder acknowledgment latency** | < 2 minutes | > 5 minutes average |
| **Snooze rate** | < 20% | > 40% for single user |
| **Check-in acceptance rate** | 60%+ | < 30% for 7 days |
| **Family alert response time** | < 5 minutes | > 15 minutes average |
| **Photo triggering accuracy** | 80%+ relevant | < 50% relevance score |

### Dashboard Queries

```kusto
// Medication compliance by user (last 7 days)
Reminders
| where timestamp > ago(7d)
| where reminderType == "medication"
| summarize 
    Total = count(),
    Confirmed = countif(status == "confirmed"),
    Missed = countif(status == "missed"),
    ComplianceRate = 100.0 * countif(status == "confirmed") / count()
  by userId, userName
| order by ComplianceRate asc

// Average reminder response time
Reminders
| where timestamp > ago(7d)
| where status in ("confirmed", "acknowledged")
| extend responseTime = datetime_diff('second', acknowledgedAt, triggeredAt)
| summarize 
    AvgResponseTime = avg(responseTime),
    MedianResponseTime = percentile(responseTime, 50),
    P95ResponseTime = percentile(responseTime, 95)
  by reminderType
```

---

## Context Window Management

### Token Budget Overview

**GPT-4o Realtime API Limits:**
- **Input tokens:** 128,000
- **Output tokens:** 4,096
- **Total context window:** 128,000 tokens

### MVP Strategy: Simple Sliding Window

For MVP, we'll use a **simple sliding window approach** - keep only the most recent conversation turns:

```typescript
// session-manager.service.ts

const MAX_CONVERSATION_TURNS = 50; // ~7,500 tokens of conversation history

class SessionManager {
  private conversationHistory: Turn[] = [];
  
  async addTurn(turn: Turn) {
    this.conversationHistory.push(turn);
    
    // Simple truncation: keep last 50 turns
    if (this.conversationHistory.length > MAX_CONVERSATION_TURNS) {
      // Always keep system instructions + last 50 turns
      this.conversationHistory = [
        this.conversationHistory[0], // System instructions
        ...this.conversationHistory.slice(-MAX_CONVERSATION_TURNS)
      ];
      
      console.log(`Truncated history to ${MAX_CONVERSATION_TURNS} turns`);
    }
  }
  
  getEstimatedTokenCount(): number {
    // Rough estimate: 150 tokens per turn average
    const conversationTokens = this.conversationHistory.length * 150;
    const systemTokens = 2000; // System instructions + memories
    return systemTokens + conversationTokens;
  }
}
```

### Token Budget Breakdown (Typical Session)

| Component | Estimated Tokens | Notes |
|-----------|------------------|-------|
| **System prompt** | ~500 | AI personality, Hebrew instructions |
| **Safety rules** | ~800 | Onboarding configuration (YAML) |
| **Memory injection** | ~800 | 3-tier memory (short-term + working + long-term) |
| **Function definitions** | ~200 | extract_memory, trigger_alert, show_photos |
| **Conversation history (50 turns)** | ~7,500 | 150 tokens/turn average |
| **TOTAL** | **~9,800 tokens** | **7.6% of 128K limit** |

### Why 50 Turns is Sufficient for MVP

**Typical conversation scenarios:**
- **Medication confirmation:** 3-5 turns (2 minutes)
- **Daily check-in:** 20-40 turns (10-15 minutes)
- **Extended conversation:** 50-80 turns (30-40 minutes)

**50 turns = ~30 minutes of conversation**, which covers 95% of use cases.

### Post-MVP Enhancements (Deferred)

These are **NOT needed for MVP** but document for future:

1. **Periodic summarization** - Every 60 turns, summarize old conversation
2. **Smart pruning** - Keep important moments (AI-tagged via function)
3. **Emergency restart** - If approaching 120K tokens, gracefully restart session
4. **Token usage monitoring** - Real-time dashboard showing token consumption

### Handling Very Long Conversations (Edge Case)

If a conversation exceeds 50 turns (rare in MVP):

```typescript
// Simple fallback: Start fresh session with summary
async handleLongConversation(userId: string, sessionId: string) {
  const currentHistory = await getConversationHistory(sessionId);
  
  if (currentHistory.length > 80) {
    console.warn(`Very long conversation detected: ${currentHistory.length} turns`);
    
    // Option 1 (MVP): Just truncate aggressively to last 30 turns
    this.conversationHistory = [
      this.conversationHistory[0], // System
      ...this.conversationHistory.slice(-30)
    ];
    
    // Option 2 (Post-MVP): Summarize and restart
    // const summary = await summarizeConversation(currentHistory);
    // await restartSessionWithSummary(userId, summary);
  }
}
```

### Monitoring (Optional for MVP)

Simple logging to track token usage:

```typescript
// Log every 10 turns
if (turnCount % 10 === 0) {
  const estimatedTokens = this.getEstimatedTokenCount();
  console.log(`Session ${sessionId} - Turn ${turnCount} - Est. tokens: ${estimatedTokens}/128000`);
}
```

---

## Open Questions

1. **Snooze limit:** Should we cap snoozes at 3 and force family call? Or allow infinite snoozes?
2. **Quiet hours:** Should reminders respect sleep schedule (e.g., no check-ins 10 PM - 7 AM)?
3. **Reminder personalization:** Should AI learn best times for check-ins per user? (e.g., user declines 2 PM daily → stop scheduling then)
4. **Emergency override:** Should family be able to trigger immediate "talk to me" notification remotely?

---

**Document Version:** 1.1  
**Last Updated:** November 9, 2025  
**Changes:** Added Context Window Management section with simple MVP approach  
**Next Review:** After MVP testing with first user (gather real-world feedback on reminder flow)
