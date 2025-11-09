# 🎨 User Experience Design

## Design Philosophy

Never Alone is designed around one core principle: **Warmth over features.**

Every design decision prioritizes:
1. **Emotional comfort** over technical sophistication
2. **Simplicity** over feature richness
3. **Accessibility** over visual flair
4. **Dignity** over efficiency

---

## Interface Modes

### 🧠 Dementia Mode Interface

#### Home Screen
```
┌─────────────────────────────────────┐
│                                     │
│           🌙 Never Alone            │
│                                     │
│                                     │
│      ┌─────────────────────┐       │
│      │                     │       │
│      │   🎤 Talk to Me     │       │
│      │                     │       │
│      └─────────────────────┘       │
│                                     │
│                                     │
│      Monday, November 9, 2025      │
│            10:30 AM                │
│                                     │
└─────────────────────────────────────┘
```

#### Key Elements:
- **Single large button** (minimum 200px height)
- **Current time/date** always visible
- **No navigation menu** (can't get lost)
- **High contrast** (black text, white background)
- **Large, clear font** (24pt minimum)
- **Calm, muted colors** (soft blue accent)

#### During Conversation
```
┌─────────────────────────────────────┐
│                                     │
│           🌙 Never Alone            │
│                                     │
│      [Animated listening icon]     │
│                                     │
│   "Good morning! Today is Monday,   │
│   November 9th. Did you sleep well?"│
│                                     │
│      ┌─────────────────────┐       │
│      │  🔴 I'm Listening   │       │
│      └─────────────────────┘       │
│                                     │
│      [Large waveform animation]    │
│                                     │
└─────────────────────────────────────┘
```

#### Reminder View
```
┌─────────────────────────────────────┐
│                                     │
│         ⏰ Time for Your            │
│        Morning Medication          │
│                                     │
│      ┌─────────────────────┐       │
│      │   💊 Blue Pill      │       │
│      │   💊 Small White    │       │
│      └─────────────────────┘       │
│                                     │
│      ┌─────────────────────┐       │
│      │    ✓ I Took Them    │       │
│      └─────────────────────┘       │
│                                     │
│      ┌─────────────────────┐       │
│      │  ⏰ Remind Me Later │       │
│      └─────────────────────┘       │
│                                     │
└─────────────────────────────────────┘
```

---

### 💙 Loneliness Mode Interface

#### Home Screen
```
┌─────────────────────────────────────┐
│  ☰                         ⚙️       │
│                                     │
│           👋 Hi Sarah!              │
│                                     │
│    "I'm here whenever you           │
│     need someone to talk to"        │
│                                     │
│      ┌─────────────────────┐       │
│      │   🎤 Start Talking  │       │
│      └─────────────────────┘       │
│                                     │
│    Or say "Hey Nora" to begin      │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ 📸 Photos│  │ ⏰ Today │       │
│  └──────────┘  └──────────┘       │
│                                     │
└─────────────────────────────────────┘
```

#### Key Differences from Dementia Mode:
- **Menu navigation** available (hamburger menu)
- **Settings access** visible
- **Personalized greeting** with name
- **Multiple interaction options** (button, voice, shortcuts)
- **Richer visual design** (icons, cards, subtle animations)
- **Customizable themes**

---

## Accessibility Features

### Visual Accessibility
- ✅ **Font sizing:** 18pt to 36pt adjustable
- ✅ **High contrast mode:** WCAG AAA compliant
- ✅ **Color blind safe:** Uses patterns + colors
- ✅ **Screen reader support:** Full VoiceOver/TalkBack compatibility
- ✅ **No flashing content:** Epilepsy-safe design
- ✅ **Clear focus indicators:** 3px outline minimum

### Motor Accessibility
- ✅ **Large touch targets:** Minimum 60px × 60px (Apple: 44pt, ideal: 72px)
- ✅ **Generous spacing:** 16px minimum between interactive elements
- ✅ **No precise gestures:** Only taps and simple swipes
- ✅ **Voice-first:** All actions possible via voice
- ✅ **No time pressure:** No auto-advancing content
- ✅ **Adjustable touch sensitivity**

### Cognitive Accessibility
- ✅ **Consistent layout:** Same elements in same places
- ✅ **Clear labels:** No icons without text
- ✅ **Simple language:** 5th-grade reading level or lower
- ✅ **No jargon:** Plain, conversational language
- ✅ **Clear feedback:** Obvious confirmation of actions
- ✅ **Undo options:** Mistakes easily corrected
- ✅ **No hidden features:** Everything visible and obvious

### Auditory Accessibility
- ✅ **Visual captions:** All speech shown as text
- ✅ **Adjustable speech rate:** 0.5x to 2x speed
- ✅ **Volume control:** Separate from system volume
- ✅ **Visual alerts:** Alternative to audio notifications
- ✅ **Text input option:** Type instead of speak

---

## Interaction Patterns

### Wake Word vs. Button

| Feature | Dementia Mode | Loneliness Mode |
|---------|---------------|-----------------|
| **Wake word** | ❌ Not used (memory burden) | ✅ Optional "Hey Nora" |
| **Button** | ✅ Primary (large, always visible) | ✅ Alternative option |
| **Auto-initiation** | ✅ Scheduled prompts | ⚠️ Limited (morning/evening) |
| **Always listening** | ❌ Only during windows | ⚠️ Optional setting |

### Conversation Flow

#### Dementia Mode Flow:
```
1. AI initiates: "Good morning!"
2. [Listening window: 15 seconds]
3. User speaks or silence
4. AI responds or prompts again
5. [Listening window: 15 seconds]
6. Repeat or conclude naturally
```

#### Loneliness Mode Flow:
```
1. User triggers: "Hey Nora" or button tap
2. AI responds immediately
3. Natural back-and-forth (continuous listening)
4. User ends: "Goodbye" or silence timeout
```

---

## Visual Design System

### Color Palette

#### Primary Colors (Dementia Mode)
- **Background:** `#FFFFFF` (Pure White)
- **Text:** `#1A1A1A` (Near Black)
- **Accent:** `#4A90E2` (Soft Blue)
- **Success:** `#5CB85C` (Gentle Green)
- **Alert:** `#F0AD4E` (Warm Orange)

#### Extended Palette (Loneliness Mode)
- **Background:** `#F8F9FA` (Off White)
- **Secondary:** `#6C757D` (Warm Gray)
- **Accent 2:** `#8E7CC3` (Soft Purple)
- **Warm Accent:** `#FFB85C` (Gentle Orange)

### Typography

#### Dementia Mode:
- **Heading:** SF Pro Display Bold, 32pt
- **Body:** SF Pro Text Regular, 24pt
- **Button:** SF Pro Text Semibold, 28pt

#### Loneliness Mode:
- **Heading:** SF Pro Display Bold, 28pt
- **Body:** SF Pro Text Regular, 18pt
- **Button:** SF Pro Text Semibold, 20pt

### Spacing System
- **Base unit:** 8px
- **Small:** 8px
- **Medium:** 16px
- **Large:** 24px
- **XLarge:** 32px
- **XXLarge:** 48px

---

## Animation Guidelines

### Dementia Mode:
- **Minimal animations:** Only for listening indicator
- **Slow transitions:** 600ms minimum
- **No surprise motion:** Everything predictable
- **Reduce motion respected:** Honors system settings

### Loneliness Mode:
- **Subtle animations:** Entrance/exit transitions
- **Standard speed:** 300ms typical
- **Personality touches:** Gentle floating, soft fades
- **Reduce motion respected:** Falls back to simple fades

---

## Tablet Optimization

### iPad Specific Features:
- **Landscape primary:** Default orientation
- **Split view support:** Family dashboard side-by-side
- **Apple Pencil:** Drawing/notes feature (future)
- **Face ID:** Quick family login
- **Home screen widget:** Quick status at a glance

### Android Tablet Features:
- **Material Design adaptation:** Platform-appropriate styling
- **Multi-window support:** Picture-in-picture
- **Google Assistant integration:** Optional wake word alternative
- **Quick settings tile:** Easy access from notifications

---

## Error States & Empty States

### Connection Lost
```
┌─────────────────────────────────────┐
│                                     │
│          📡 No Connection           │
│                                     │
│   "I'm having trouble connecting.   │
│    But don't worry, your reminders  │
│    will still work!"                │
│                                     │
│      ┌─────────────────────┐       │
│      │    Try Again        │       │
│      └─────────────────────┘       │
│                                     │
└─────────────────────────────────────┘
```

### No Reminders Set
```
┌─────────────────────────────────────┐
│                                     │
│          ⏰ No Reminders            │
│                                     │
│   "You don't have any reminders     │
│    set up yet. Your family can add  │
│    them from their app."            │
│                                     │
└─────────────────────────────────────┘
```

### Error Messages:
- **Never technical:** No error codes or jargon
- **Always reassuring:** "This isn't your fault"
- **Clear action:** What to do next
- **Human tone:** Conversational, not robotic

---

## Onboarding Experience

### First Launch (With Family)
1. **Welcome screen:** "Let's get to know each other"
2. **Voice recording:** AI learns user's voice
3. **Name setting:** What should we call you?
4. **Preference questions:** What do you enjoy? (gentle, conversational)
5. **Reminder setup:** Morning routine, medications
6. **Family connection:** Enter family member's code
7. **Test conversation:** Try talking with the AI
8. **Ready screen:** "I'm here whenever you need me"

### Design Principles:
- **Maximum 8 steps:** Don't overwhelm
- **Skip options:** Nothing mandatory except voice setup
- **Return later:** Can always come back to finish
- **Family-assisted:** Designed for helper to walk through
- **Warm tone:** Friendly, never rushed

---

*This design system is a living document and will evolve through user testing.*
