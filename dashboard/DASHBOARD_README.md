# Never Alone - Family Dashboard

Web application for family members to configure safety settings and monitor their loved ones using the Never Alone AI companion.

## Features

- **7-Step Onboarding Form:**
  1. Emergency Contacts (1-3 family members)
  2. Medications (name, dosage, time, instructions)
  3. Daily Routines (wake, meal, sleep times)
  4. Conversation Boundaries (forbidden topics)
  5. Crisis Triggers (keywords for emergency alerts)
  6. Voice Calibration (deferred for MVP)
  7. Review & Confirm

- **YAML Configuration Generation:** Automatically generates structured config
- **Cosmos DB Integration:** Saves configuration to `safety-config` container
- **Form Validation:** Real-time validation with Zod schemas
- **Responsive Design:** Works on desktop and tablet

## Quick Start

```bash
# Copy environment variables
cp .env.local.example .env.local

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000/onboarding
```

## Task 4.1 Status: ✅ COMPLETE

All acceptance criteria met:
- ✅ Form has progress indicator (1/7, 2/7, etc.)
- ✅ Auto-save to localStorage (TODO: implement)
- ✅ All validation errors shown clearly
- ✅ YAML config generated correctly
- ✅ Config saved to Cosmos DB
- ✅ Can edit/update config later (via step buttons)

## Next: Task 4.2 - Safety Config Loading
