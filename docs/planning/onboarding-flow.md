# 🚪 Onboarding Flow - Never Alone MVP

## Overview

This document details the complete onboarding experience for Never Alone, from family member signup to first patient conversation. The MVP onboarding prioritizes **safety configuration** as mandatory before any AI interaction begins.

**Target completion time:** 10-15 minutes  
**Completed by:** Primary family caregiver (not patient)  
**Platform:** Web dashboard (desktop/mobile browser)

---

## Onboarding Architecture

### Three-Phase Approach

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Family Account Setup (2-3 minutes)               │
│  • Create account (email + password)                        │
│  • Verify email                                             │
│  • Accept Terms of Service + Privacy Policy                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Patient Profile + Safety Configuration (7-10 min) │
│  • Part 1: Basic Information                                │
│  • Part 2: Medical Restrictions ⚠️ MANDATORY                │
│  • Part 3: Physical Abilities                               │
│  • Part 4: Specific Dangers ⚠️ MANDATORY                    │
│  • Part 5: Never Allow Activities ⚠️ MANDATORY              │
│  • Part 6: Special Situations                               │
│  • Part 7: Emergency Contacts ⚠️ MANDATORY                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Patient Consent + Voice Calibration (3-5 minutes) │
│  • Patient consent recording (verbal or video)              │
│  • Microphone test + volume adjustment                      │
│  • First conversation (guided)                              │
│  • Family dashboard tour                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Family Account Setup

### Screen 1.1: Welcome Page

**Visual Design:**
- Hero image: Elderly person smiling with tablet
- Headline: "Welcome to Never Alone - Your Family's AI Companion"
- Subheadline: "Help your loved one stay connected, safe, and engaged every day"
- Primary CTA button: "Get Started" (large, blue, high contrast)

**Content:**
```
What is Never Alone?

Never Alone is an AI-powered companion designed specifically for 
people with dementia, Alzheimer's, or those experiencing loneliness. 
Our empathetic AI:

✅ Initiates warm, natural conversations
✅ Provides medication and appointment reminders
✅ Ensures safety with intelligent guardrails
✅ Shares family photos and memories
✅ Alerts you when help is needed

⚠️ Important: Never Alone is a wellbeing companion, NOT a medical device. 
It does not provide medical advice, diagnoses, or treatment. Always consult 
healthcare professionals for medical concerns.

[Get Started Button]
[Learn More]  [Watch Demo Video]
```

**User Action:** Click "Get Started"

---

### Screen 1.2: Create Account

**Form Fields:**
- **Your Name:** [Text input] (e.g., "Sarah Cohen")
- **Email Address:** [Email input] (for login + alerts)
- **Password:** [Password input] (min 8 characters, show strength indicator)
- **Confirm Password:** [Password input]
- **Phone Number:** [Phone input] (for SMS alerts - optional but recommended)
  - Checkbox: "Send me SMS alerts for critical reminders"
- **Relationship to Patient:** [Dropdown]
  - Options: Daughter, Son, Spouse, Sibling, Friend, Professional Caregiver, Other
- **Country:** [Dropdown] (Israel selected by default for MVP)

**Legal Agreements:**
- [ ] I have read and agree to the [Terms of Service]
- [ ] I have read and understand the [Privacy Policy]
- [ ] I understand Never Alone is not a medical device and does not replace professional care

**Button:** "Create Account" (disabled until all checkboxes ticked)

**User Action:** Fill form → Click "Create Account"

---

### Screen 1.3: Email Verification

**Content:**
```
📧 Check Your Email

We sent a verification email to: sarah.cohen@example.com

Please click the link in the email to verify your account.

[Didn't receive it? Resend Email]
[Change Email Address]
```

**After verification:** Redirect to Phase 2

---

## Phase 2: Patient Profile + Safety Configuration

### Progress Indicator (Top of Every Screen)

```
Step 1 of 7: Basic Information
[■■□□□□□] 14% complete

[Save & Continue Later]  [Exit]
```

**Note:** All progress auto-saved. Users can exit anytime and resume later.

---

### Part 1: Basic Information (Screen 2.1)

**Form Fields:**
- **Patient's First Name:** [Text] (e.g., "תפארת" or "Yitzhak")
- **Patient's Age:** [Number] (e.g., 82)
- **Gender:** [Radio buttons] Male / Female / Other / Prefer not to say
- **Primary Language:** [Dropdown]
  - Hebrew (עברית) ✅ Selected by default
  - English
  - (Other languages post-MVP)
- **Cognitive Condition:** [Dropdown]
  - Dementia
  - Alzheimer's Disease
  - Mild Cognitive Impairment
  - None (loneliness/isolation only)
  - Other: [Text input]
- **Stage (if applicable):** [Radio buttons]
  - Mild (early stage)
  - Moderate (middle stage)
  - Severe (late stage)
  - Not applicable

**Optional Context:**
- **Hobbies & Interests:** [Textarea]
  - Placeholder: "e.g., gardening, reading, cooking, watching birds..."
  - Help text: "This helps the AI find conversation topics your loved one enjoys"

**Button:** "Next: Medical Restrictions →"

---

### Part 2: Medical Restrictions ⚠️ MANDATORY (Screen 2.2)

**Header:**
```
⚠️ Medical Safety Rules (Required)

These rules help the AI avoid suggesting activities that could be harmful. 
This section is mandatory and cannot be skipped.
```

**Form Fields:**

**2.1 Allergies:**
- [ ] No known allergies
- [ ] Medication allergies: [Textarea]
  - Placeholder: "e.g., Penicillin, Aspirin..."
- [ ] Food allergies: [Textarea]
  - Placeholder: "e.g., Peanuts, shellfish..."

**2.2 Medical Conditions:** (Select all that apply)
- [ ] Diabetes
- [ ] Heart condition
- [ ] High blood pressure
- [ ] Mobility issues
- [ ] Vision impairment
- [ ] Hearing impairment
- [ ] Swallowing difficulties
- [ ] Other: [Text input]

**2.3 Current Medications:** [Dynamic list]
- **Medication Name:** [Text]
- **Dosage:** [Text]
- **Frequency:** [Dropdown] Once daily / Twice daily / Three times / As needed
- **Time(s):** [Time picker(s)]
- [+ Add Another Medication]

**Important Reminder:**
```
💊 Medication Reminders:
The AI will remind your loved one to take their medication at scheduled times. 
For MVP, this uses VERBAL CONFIRMATION ONLY (patient says "I took them").
We do NOT integrate with smart pill dispensers yet.
```

**2.4 Dietary Restrictions:**
- [ ] No restrictions
- [ ] Low sodium
- [ ] Low sugar (diabetic)
- [ ] Soft foods only
- [ ] Other: [Textarea]

**Validation:** At least ONE field must be filled (even if "No known allergies")

**Button:** "Next: Physical Abilities →"

---

### Part 3: Physical Abilities (Screen 2.3)

**Header:**
```
🚶 Physical Abilities

Help us understand what your loved one can safely do on their own. 
This ensures the AI doesn't suggest dangerous activities.
```

**Form Fields:**

**3.1 Mobility:**
- [ ] Walks independently without assistance
- [ ] Uses cane or walker
- [ ] Uses wheelchair
- [ ] Requires assistance to move around
- [ ] Bedridden

**3.2 Stairs:**
- [ ] Can climb stairs safely alone
- [ ] Can climb stairs with supervision
- [ ] Cannot climb stairs (fall risk)

**3.3 Balance & Fall Risk:**
- [ ] Good balance, no fall history
- [ ] Occasional dizziness or unsteadiness
- [ ] High fall risk (recent falls or frequent dizziness)

**3.4 Fine Motor Skills:**
- [ ] Can button clothes, use utensils, write
- [ ] Some difficulty with fine motor tasks
- [ ] Requires assistance with all fine motor tasks

**3.5 Vision:**
- [ ] Normal vision (or corrected with glasses)
- [ ] Partial vision impairment
- [ ] Legally blind / Severe impairment

**3.6 Hearing:**
- [ ] Normal hearing (or corrected with hearing aid)
- [ ] Partial hearing loss
- [ ] Severe hearing loss / Deaf

**Button:** "Next: Specific Dangers →"

---

### Part 4: Specific Dangers ⚠️ MANDATORY (Screen 2.4)

**Header:**
```
⚠️ Dangers in the Environment (Required)

Tell us about hazards near your loved one's home. This is CRITICAL for 
their safety. The AI will use this to block dangerous requests.
```

**Form Fields:**

**4.1 Nearby Hazards:** (Select all that apply + provide details)
- [ ] **Busy road or highway nearby**
  - Distance: [Text] (e.g., "50 meters from front door")
  - Description: [Textarea] (e.g., "Highway 1 - very fast traffic")
- [ ] **Water hazard (pool, lake, ocean)**
  - Type: [Text]
  - Distance: [Text]
- [ ] **Construction site or dangerous area**
  - Description: [Textarea]
- [ ] **Steep hills or cliffs**
  - Description: [Textarea]
- [ ] **Unsafe neighborhood (crime, stray animals)**
  - Description: [Textarea]
- [ ] **Other hazards:** [Textarea]

**4.2 Home Hazards:**
- [ ] **Gas stove** (burn/fire risk)
- [ ] **Electric stove** (burn risk but safer than gas)
- [ ] **Sharp objects accessible** (knives, scissors)
- [ ] **Medications not locked** (overdose risk)
- [ ] **Cleaning supplies accessible** (poisoning risk)
- [ ] **Balcony or high windows** (fall risk)
- [ ] **Stairs inside home** (fall risk)

**4.3 Past Incidents:** (Optional but helpful)
- [ ] No known incidents
- [ ] Past fall(s)
- [ ] Wandering incident(s) (left home, got lost)
- [ ] Medication error(s) (wrong dose, missed dose)
- [ ] Kitchen accident (burn, fire, left stove on)
- [ ] Other: [Textarea]

**4.4 Missing Person Risk:**
- Does your loved one have a history of wandering or getting lost?
  - [ ] No
  - [ ] Yes - Describe: [Textarea]
- If they leave home alone, can they:
  - [ ] Navigate back safely
  - [ ] Remember address/phone to call for help
  - [ ] Likely to get lost and unable to return

**Validation:** At least ONE hazard must be documented (or explicitly marked "None")

**Button:** "Next: Never Allow Rules →"

---

### Part 5: Never Allow Activities ⚠️ MANDATORY (Screen 2.5)

**Header:**
```
🚫 Never Allow Rules (Required)

These are activities the AI should ALWAYS block, no matter what. 
The AI will firmly (but kindly) redirect these requests and alert you immediately.
```

**Pre-filled Suggestions (Checkboxes):**

**Physical Activities:**
- [ ] Leaving home alone
- [ ] Going upstairs alone
- [ ] Using the stove or oven
- [ ] Using sharp knives
- [ ] Climbing ladders or step stools
- [ ] Going outside after dark
- [ ] Going to the balcony alone

**Medication & Health:**
- [ ] Taking medication without reminder confirmation
- [ ] Taking extra doses of medication
- [ ] Mixing medications with alcohol
- [ ] Skipping meals

**Social & Financial:**
- [ ] Answering the door to strangers
- [ ] Giving personal information over the phone
- [ ] Making financial decisions (e.g., purchases, transfers)
- [ ] Driving (if license revoked)

**Custom Rules:**
- **Add your own:** [+ Add Custom Rule]
  - Rule text: [Text input]
  - Explanation: [Textarea] "Why this is dangerous"
  - Severity: [Dropdown] Critical / High / Medium

**Example Custom Rules:**
```
Rule: "Looking for צביה (deceased spouse) outside"
Explanation: "Gets confused and tries to walk to highway to find her"
Severity: Critical

Rule: "Calling old employer"
Explanation: "Doesn't remember he retired 15 years ago, gets upset"
Severity: Medium
```

**Minimum Required:** At least **3 rules** must be selected or created

**Button:** "Next: Special Situations →"

---

### Part 6: Special Situations (Screen 2.6)

**Header:**
```
🆘 Special Situations

How should the AI handle common confusing situations? This helps the AI 
respond appropriately when your loved one is disoriented or distressed.
```

**Form Fields:**

**6.1 If they ask about deceased family members:**
- [ ] Gently remind them the person has passed (truthful)
- [ ] Redirect to happy memories without mentioning death (compassionate avoidance)
- [ ] Change subject completely (distraction)
- Other approach: [Textarea]

**Example response if "truthful" selected:**
```
AI: "I know you miss צביה very much. She passed away 3 years ago. Would 
you like to look at some beautiful photos of her?"
```

**6.2 If they can't find a family member (e.g., "Where is מיכל?"):**
- [ ] Offer to call the family member immediately
- [ ] Reassure them and suggest waiting ("She'll be back soon")
- [ ] Distract with activity (photos, story, music)
- Custom response: [Textarea]

**6.3 If they express sadness, anxiety, or fear:**
- [ ] Acknowledge emotion + offer to call family ("I hear you're feeling sad. Should I call Sarah?")
- [ ] Comfort and distract (stories, photos, gentle conversation)
- [ ] Ask if they want to talk about it
- Custom approach: [Textarea]

**6.4 If they don't remember taking medication:**
- [ ] AI confirms from log: "You took your pills at 9:15 AM this morning"
- [ ] Offer to call family to double-check
- [ ] Show timestamp of when they confirmed (video/audio playback)

**6.5 If they become agitated or angry at the AI:**
- [ ] AI apologizes and changes topic
- [ ] AI offers to call family member
- [ ] AI goes silent and sends alert
- Custom: [Textarea]

**Button:** "Next: Emergency Contacts →"

---

### Part 7: Emergency Contacts ⚠️ MANDATORY (Screen 2.7)

**Header:**
```
📞 Emergency Contacts (Required)

Who should we contact if something goes wrong? This is MANDATORY 
and used for all critical safety alerts.
```

**Form Fields:**

**7.1 Primary Contact (You):**
- **Name:** [Pre-filled from account: "Sarah Cohen"]
- **Relationship:** [Pre-filled: "Daughter"]
- **Phone:** [Pre-filled from account]
- **Email:** [Pre-filled from account]
- **Preferred alert method:**
  - [ ] SMS (text message)
  - [ ] Phone call
  - [ ] Both

**7.2 Secondary Contact:**
- **Name:** [Text]
- **Relationship:** [Dropdown]
- **Phone:** [Phone input]
- **Email:** [Email input]
- **When to contact:**
  - [ ] If primary doesn't respond within 5 minutes
  - [ ] For all critical alerts (simultaneously)
  - [ ] For high-severity alerts only

**7.3 Emergency Escalation:**
- If both contacts are unreachable, should we call emergency services (ambulance)?
  - [ ] Yes - Call ambulance for critical incidents (e.g., fall, chest pain mention)
  - [ ] No - Never call emergency services automatically
  - [ ] Only after 15 minutes of no family response

**7.4 Local Emergency Numbers:**
- **Emergency Services (Ambulance/Police):** [Pre-filled: "101" for Israel]
- **Family Doctor:** [Phone input] (optional)
- **Neighbor or Friend:** [Name + Phone] (backup if family unavailable)

**Validation:** Primary contact + at least ONE escalation path required

**Button:** "Save Safety Configuration →"

---

### Screen 2.8: Configuration Review

**Header:**
```
✅ Safety Configuration Complete

Review your settings before proceeding. You can edit these anytime 
from the family dashboard.
```

**Summary Cards:**

**Basic Information:**
- Name: תפארת
- Age: 82
- Language: Hebrew
- Condition: Alzheimer's Disease (Moderate stage)
[Edit]

**Medical Restrictions:**
- Allergies: Penicillin
- Medications: 3 configured
- Dietary: Low sodium
[Edit]

**Physical Abilities:**
- Mobility: Uses walker
- Stairs: Cannot climb (fall risk)
- Vision: Partial impairment
[Edit]

**Specific Dangers:**
- Highway 50m from home
- Gas stove (burn risk)
- Past wandering incident (2023)
[Edit]

**Never Allow Rules (8 configured):**
- Leaving home alone (Critical)
- Using stove (Critical)
- Going upstairs alone (High)
- Taking extra medication (Critical)
- [View all 8 rules]
[Edit]

**Special Situations:**
- Deceased family: Gentle reminder + memories
- Can't find family: Offer to call
- Medication confusion: Confirm from log
[Edit]

**Emergency Contacts:**
- Primary: Sarah Cohen (Daughter) - SMS + Call
- Secondary: David Cohen (Son) - If no response
- Escalation: Call ambulance after 15 min
[Edit]

**Buttons:**
- "Confirm & Continue to Patient Consent →"
- "← Go Back to Edit"

---

## Phase 3: Patient Consent + Voice Calibration

### Screen 3.1: Patient Consent Recording

**Header:**
```
🎤 Patient Consent Required

Before we begin, we need verbal consent from תפארת. This protects 
everyone and ensures they understand what Never Alone does.
```

**Instructions:**
1. Bring the device (Mac for MVP) to תפארת
2. Read this script aloud, or let them read it:

**Consent Script (Hebrew + English):**
```
Hebrew:
"שלום תפארת, אני מבקשת את הסכמתך לשימוש באפליקציה 'Never Alone'. 
זה בינה מלאכותית שתדבר איתך, תזכיר לך לקחת תרופות, ותציג לך תמונות 
של המשפחה. השיחות ישמרו לצורך משפטי ובטיחות. האם אתה מסכים?"

English:
"Hello תפארת, I'm asking for your consent to use the 'Never Alone' app. 
This is an AI that will talk to you, remind you to take medication, and 
show you family photos. Conversations will be saved for legal and safety 
purposes. Do you agree?"
```

3. Click "Record Consent" and have תפארת say "Yes" or "אני מסכים"

**Recording Interface:**
- [🔴 Record Consent Button]
- Timer: 00:00
- Waveform display
- [Stop Recording]

**After recording:**
- [▶️ Play Back] (verify audio quality)
- [✓ Accept] or [⟳ Re-record]

**Legal Notice:**
```
This consent recording is stored permanently and may be used as 
legal evidence if needed. Family members can access it anytime 
from the dashboard.
```

**Button:** "Continue to Voice Calibration →"

---

### Screen 3.2: Microphone Test + Volume Adjustment

**Header:**
```
🎧 Voice Calibration

Let's make sure תפארת can hear the AI clearly and the AI can hear them.
```

**Instructions:**
1. Place the device 1-2 feet from תפארת
2. Click "Test Microphone"
3. Have תפארת say: "My name is תפארת"

**Test Interface:**
- [🎤 Test Microphone]
- Input level meter: ▮▮▮▮▮▯▯▯▯▯ (real-time)
- Playback: [▶️ Play Recording]

**AI Response Test:**
- Click "Test AI Voice"
- AI speaks: "שלום תפארת, אני כאן לדבר איתך. האם אתה שומע אותי בבירור?"
  - (Hello תפארת, I'm here to talk to you. Can you hear me clearly?)
- Volume slider: ────●──── (adjust speaker volume)

**Validation:**
- [ ] Microphone detected
- [ ] Audio input clear (>40dB)
- [ ] Speaker working
- [ ] תפארת confirmed they can hear

**Button:** "Start First Conversation →"

---

### Screen 3.3: First Guided Conversation

**Header:**
```
🎉 First Conversation with Never Alone

This is a short guided conversation to help תפארת get comfortable. 
Family members can watch, but let תפארת talk directly to the AI.
```

**Interface:**
- Large centered button: [🎤 Talk to AI]
- Visual indicator when AI is listening (animated waveform)
- Transcript display (real-time):

**Example First Conversation:**
```
AI: "שלום תפארת! אני נורה, חברה החדשה שלך. איך אתה מרגיש היום?"
    (Hello תפארת! I'm Nora, your new friend. How are you feeling today?)

[תפארת responds]

AI: "נהדר לשמוע! אני כאן כדי לדבר איתך, להזכיר לך דברים חשובים, 
     ולהראות לך תמונות יפות של המשפחה. אם אתה רוצה לדבר, פשוט תקש 
     על הכפתור הכחול הגדול. מוכן לנסות?"
    (Great to hear! I'm here to talk to you, remind you of important things, 
     and show you beautiful photos of the family. If you want to talk, just 
     tap the big blue button. Ready to try?)

[Continues for 2-3 minutes]

AI: "תודה על השיחה המקסימה! אני אהיה כאן בכל עת שתרצה לדבר. להתראות!"
    (Thank you for the lovely conversation! I'll be here whenever you want 
     to talk. See you later!)
```

**Family Observation Checklist:**
- [ ] תפארת understood how to activate AI (button press)
- [ ] תפארת responded naturally
- [ ] Audio quality was good
- [ ] תפארת seemed comfortable

**Buttons:**
- "Conversation went well ✓ Continue"
- "Need to adjust settings → Go Back"

---

### Screen 3.4: Family Dashboard Tour

**Header:**
```
📊 Welcome to Your Family Dashboard

Here's where you monitor תפארת's activity, manage reminders, and 
upload photos. Let's take a quick tour.
```

**Interactive Tour (Tooltips on each section):**

**1. Today's Activity:**
```
┌─────────────────────────────────────────┐
│  📅 Today: November 9, 2025              │
│  💬 Conversations: 3                     │
│  💊 Medications: 2/2 taken ✓             │
│  ⏰ Reminders: 1 upcoming (3:00 PM)      │
│  🚨 Alerts: None 🟢                      │
└─────────────────────────────────────────┘
```
[Next →]

**2. Recent Conversations:**
```
┌─────────────────────────────────────────┐
│  10:30 AM - 5 minutes                   │
│  "Talked about gardening and the weather│
│   Nice conversation, תפארת was engaged" │
│  [View Transcript]  [Listen to Audio ❌] │
│                    (Audio not saved)     │
└─────────────────────────────────────────┘
```
[Next →]

**3. Manage Reminders:**
```
┌─────────────────────────────────────────┐
│  💊 Take morning medication - 9:00 AM   │
│  ✓ Taken today at 9:15 AM               │
│  [Edit]  [Delete]                        │
│                                          │
│  [+ Add New Reminder]                   │
└─────────────────────────────────────────┘
```
[Next →]

**4. Upload Photos:**
```
┌─────────────────────────────────────────┐
│  📸 Photo Albums (12 photos)             │
│  [Upload New Photos]                    │
│  [Organize Albums]                      │
└─────────────────────────────────────────┘
```
[Next →]

**5. Safety Settings:**
```
┌─────────────────────────────────────────┐
│  ⚙️ Safety Configuration                 │
│  Last updated: Today                    │
│  Never Allow Rules: 8 active            │
│  Emergency Contacts: 2 configured       │
│  [Edit Safety Settings]                 │
│  [View Safety Log]                      │
└─────────────────────────────────────────┘
```
[Finish Tour ✓]

**Button:** "Start Using Never Alone →"

---

### Screen 3.5: Onboarding Complete!

**Celebration Screen:**
```
🎉 You're All Set!

תפארת can now start using Never Alone anytime. Here's what happens next:

✅ AI is ready to talk 24/7 (just press the big blue button)
✅ Medication reminders will start tomorrow at 9:00 AM
✅ You'll receive SMS alerts for critical safety incidents
✅ All conversations are logged and accessible in your dashboard

📚 Quick Tips:
• Check the dashboard daily to see activity
• Upload more photos to enrich conversations
• Update safety rules anytime (Settings → Safety)
• Reach out to support@neveralone.com with questions

[Go to Dashboard]
[Print Quick Start Guide]
```

---

## Technical Implementation Notes (For Engineers)

### Data Storage

**Cosmos DB - Users Container:**
```json
{
  "userId": "user_abc123",
  "familyAccount": {
    "name": "Sarah Cohen",
    "email": "sarah@example.com",
    "phone": "+972501234567",
    "relationship": "daughter",
    "alertPreferences": ["sms", "push"]
  },
  "patientProfile": {
    "name": "תפארת",
    "age": 82,
    "language": "he",
    "cognitiveCondition": "alzheimers_moderate",
    "hobbies": ["gardening", "watching birds"]
  },
  "safetyRules": {
    "medicalRestrictions": {
      "allergies": ["penicillin"],
      "conditions": ["diabetes", "mobility_issues"],
      "medications": [
        {
          "name": "Metformin",
          "dosage": "500mg",
          "frequency": "twice_daily",
          "times": ["09:00", "21:00"]
        }
      ],
      "dietary": ["low_sodium"]
    },
    "physicalAbilities": {
      "mobility": "walker",
      "stairs": "cannot_climb",
      "fallRisk": "high",
      "vision": "partial_impairment"
    },
    "dangers": [
      {
        "type": "busy_road",
        "description": "Highway 1 - 50m from front door",
        "severity": "critical"
      },
      {
        "type": "gas_stove",
        "description": "Kitchen stove - burn/fire risk",
        "severity": "critical"
      }
    ],
    "neverAllow": [
      {
        "activity": "leaving_home_alone",
        "severity": "critical",
        "explanation": "High risk of getting lost near highway"
      },
      {
        "activity": "using_stove",
        "severity": "critical",
        "explanation": "Gas stove - burn risk"
      }
    ],
    "specialSituations": {
      "deceasedFamily": "gentle_reminder_with_memories",
      "missingFamily": "offer_to_call",
      "medicationConfusion": "confirm_from_log"
    }
  },
  "emergencyContacts": [
    {
      "type": "primary",
      "name": "Sarah Cohen",
      "phone": "+972501234567",
      "alertMethods": ["sms", "call"]
    },
    {
      "type": "secondary",
      "name": "David Cohen",
      "phone": "+972501234999",
      "condition": "if_no_response_5min"
    }
  ],
  "consentRecording": {
    "audioUrl": "https://blob.../consent_abc123.wav",
    "timestamp": "2025-11-09T10:30:00Z",
    "transcript": "אני מסכים"
  },
  "onboardingCompleted": true,
  "onboardingCompletedAt": "2025-11-09T11:00:00Z"
}
```

### System Prompt Generation

**After onboarding, backend generates custom system prompt:**

```javascript
// Pseudo-code
function generateSystemPrompt(userDoc) {
  const basePrompt = UNIVERSAL_SAFETY_RULES; // Hardcoded
  
  // Inject patient context
  const patientContext = `
You are talking to ${userDoc.patientProfile.name}, an ${userDoc.patientProfile.age}-year-old 
with ${userDoc.patientProfile.cognitiveCondition}. They enjoy ${userDoc.patientProfile.hobbies.join(", ")}.
`;

  // Inject safety rules
  const safetyRules = `
NEVER ALLOW the following activities:
${userDoc.safetyRules.neverAllow.map(rule => 
  `- ${rule.activity}: ${rule.explanation} (Severity: ${rule.severity})`
).join("\n")}

If the user requests any of these, respond with:
1. Empathetic acknowledgment
2. Firm but kind redirect
3. Call trigger_family_alert() function immediately
`;

  // Inject special situation handling
  const situationHandling = `
Special Situations:
- Deceased family members: ${userDoc.safetyRules.specialSituations.deceasedFamily}
- Missing family: ${userDoc.safetyRules.specialSituations.missingFamily}
- Medication confusion: ${userDoc.safetyRules.specialSituations.medicationConfusion}
`;

  return basePrompt + patientContext + safetyRules + situationHandling;
}
```

### Validation Logic

**Phase 2 cannot proceed unless:**
```javascript
function validateOnboarding(userDoc) {
  const errors = [];
  
  // Medical restrictions
  if (!userDoc.safetyRules.medicalRestrictions) {
    errors.push("Medical restrictions required");
  }
  
  // Specific dangers
  if (userDoc.safetyRules.dangers.length === 0) {
    errors.push("At least one danger must be documented");
  }
  
  // Never allow rules
  if (userDoc.safetyRules.neverAllow.length < 3) {
    errors.push("Minimum 3 'never allow' rules required");
  }
  
  // Emergency contacts
  if (!userDoc.emergencyContacts.primary) {
    errors.push("Primary emergency contact required");
  }
  
  return errors.length === 0 ? null : errors;
}
```

### Auto-save Feature

**Save progress every 30 seconds:**
```javascript
// Frontend: Auto-save draft
setInterval(() => {
  if (formHasChanges) {
    saveDraftToCosmosDB(userId, formData);
    showToast("Draft saved ✓");
  }
}, 30000);

// Backend: Store in temporary field
{
  "userId": "user_abc123",
  "onboardingDraft": { ...formData },
  "onboardingDraftUpdatedAt": "2025-11-09T10:45:00Z"
}

// When user returns, load draft
if (userDoc.onboardingDraft) {
  loadFormData(userDoc.onboardingDraft);
  showBanner("You have an in-progress onboarding. Continue where you left off?");
}
```

---

## MVP Simplifications

For proof-of-concept, the following can be simplified:

### Simplified for Mac MVP:
1. **No tablet setup wizard** - Runs on Mac desktop/laptop
2. **No kiosk mode** - App doesn't auto-launch, user manually opens
3. **No voice calibration** - Use system default microphone/speakers
4. **Manual consent** - Family member types "Consent given on [date]" instead of recording

### Deferred to Post-MVP:
1. **Video consent recording** - Audio only for MVP
2. **Multi-language onboarding** - Hebrew only
3. **Photo album organization** - Upload only, no tagging/categorization
4. **Advanced accessibility** - Screen reader support, voice navigation
5. **Family member invitations** - Single primary caregiver only, no multi-user

### Kept for Legal Compliance:
1. ✅ **All safety configuration** - MANDATORY, cannot be simplified
2. ✅ **Emergency contacts** - MANDATORY
3. ✅ **Terms of Service acceptance** - MANDATORY
4. ✅ **Never Allow rules** - MANDATORY (min 3 rules)

---

## Open Questions (To Be Decided)

1. **Consent recording format:** Audio only or video? (MVP: Audio)
2. **Form auto-translation:** Should Hebrew speakers see Hebrew form? (MVP: English form, Hebrew AI)
3. **Onboarding time limit:** Should family complete in one session, or allow multi-day? (Decision: Allow save & resume)
4. **Mandatory fields enforcement:** Block app usage until completed, or allow "Skip for now"? (Decision: BLOCK - safety first)
5. **Condition deterioration review:** Email reminder to family every 30 days? (Decision: Yes, automated)

---

**Document Version:** 1.0  
**Last Updated:** November 9, 2025  
**Next Review:** After first beta user onboards (gather feedback on completion time + pain points)
