# 📝 Test Data Usage Guide

**Purpose:** How to use the pre-filled test data feature in the onboarding wizard for rapid testing.

---

## Overview

The onboarding wizard now supports **pre-filled test data** to speed up repeated testing cycles. You can instantly populate the form with Tiferet's complete story or start with an empty form.

---

## Quick Start

### 1. Start the Dashboard
```bash
cd dashboard
npm run dev
```

### 2. Navigate to Onboarding
Open http://localhost:3000/onboarding in your browser.

### 3. Use Test Data Toggle

At the top of the page, you'll see a **Testing Mode** banner with two buttons:

```
┌─────────────────────────────────────────────────────────────┐
│ Testing Mode                                                │
│ ✅ Using Tiferet test data (pre-filled)                     │
│                                                             │
│ [Load Tiferet Data]  [Start Empty]                         │
└─────────────────────────────────────────────────────────────┘
```

- **Load Tiferet Data**: Fills all 7 steps with Tiferet's information
- **Start Empty**: Resets to blank form (useful for testing new families)

### 4. Verify Data Loaded

After clicking "Load Tiferet Data", navigate through the steps:

**Step 1: Emergency Contacts (3 contacts)**
- צביה נחמיה (Wife): +972-50-123-4567
- מיכל כהן (Daughter): +972-50-234-5678
- רחלי לוי (Daughter): +972-50-345-6789

**Step 2: Medications (3 medications)**
- Metformin 500mg at 08:00 (with food)
- Metformin 500mg at 20:00 (with dinner)
- Aspirin 81mg at 08:00 (with breakfast)

**Step 3: Daily Routines**
- Wake: 07:00
- Breakfast: 08:00
- Lunch: 13:00
- Dinner: 19:00
- Sleep: 22:00

**Step 4: Forbidden Topics (4 topics)**
- Family conflicts
- Past trauma
- Politics
- Financial problems

**Step 5: Crisis Triggers (16 triggers)**
- לצאת החוצה (Leave home alone) - CRITICAL
- אצא לטייל (Go for walk) - CRITICAL
- רוצה לצאת (Want to leave) - CRITICAL
- אין לי כוח (No strength) - HIGH
- 12 more triggers...

**Step 7: Review & Submit**
- All data pre-filled and ready to submit

---

## Use Cases

### Use Case 1: Testing New Features
**Scenario:** You added a new field to Step 2 (medications) and want to test it.

**Steps:**
1. Click "Load Tiferet Data"
2. Navigate to Step 2
3. Verify existing medications loaded correctly
4. Add your new field/modify existing data
5. Complete remaining steps
6. Submit and verify saved correctly

**Time saved:** ~5 minutes (no manual data entry)

---

### Use Case 2: Testing Validation
**Scenario:** You want to test form validation for emergency contacts.

**Steps:**
1. Click "Load Tiferet Data"
2. Navigate to Step 1
3. Modify phone number to invalid format (e.g., "123")
4. Try to proceed to Step 2
5. Verify validation error shows
6. Fix and proceed

**Benefit:** Start with valid data, test specific validation rules

---

### Use Case 3: Testing New Family Onboarding
**Scenario:** You want to test the experience for a brand new family.

**Steps:**
1. Click "Start Empty"
2. Fill out all 7 steps manually
3. Submit and verify

**Benefit:** Clean slate for testing complete onboarding flow

---

### Use Case 4: Rapid Iteration
**Scenario:** You're making UI changes and need to see all steps quickly.

**Steps:**
1. Click "Load Tiferet Data"
2. Navigate through all steps (1→7)
3. Verify UI looks correct with real data
4. Make CSS/layout changes
5. Refresh page and repeat

**Time saved:** ~10 minutes per iteration

---

## What's Included in Test Data

### Tiferet's Profile (`TIFERET_TEST_DATA`)

**User Info:**
- User ID: `user-tiferet-001`
- Name: תפארת נחמיה (Tiferet Nehemiah)
- Age: 82 years old
- Living in: Jerusalem, Israel

**Family Members:**
- **צביה נחמיה** (Tzviya) - Wife, primary caregiver
- **מיכל כהן** (Michal Cohen) - Daughter living in Haifa
- **רחלי לוי** (Racheli Levi) - Daughter living in Tel Aviv

**Medical Info:**
- Type 2 Diabetes (managed with Metformin)
- Cardiovascular health (Aspirin daily)
- Early-stage dementia diagnosis

**Daily Routine:**
- Morning person (wakes at 7:00 AM)
- Regular meal times
- Enjoys garden in afternoon
- Early bedtime (10:00 PM)

**Safety Concerns:**
- Cannot leave home alone (busy street nearby)
- Forgets medication frequently
- Confusion about time/appointments
- Tendency to wander if upset

**Crisis Triggers (16 total):**
All triggers have detailed action plans like:
```typescript
{
  keyword: 'לצאת החוצה', // Leave home alone
  severity: 'critical',
  action: 'Immediately alert family. Patient wants to leave home alone which is dangerous due to busy street and disorientation risk.'
}
```

---

## Behind the Scenes

### File: `dashboard/lib/test-data.ts`

**Contains two exports:**
1. `TIFERET_TEST_DATA` - Complete pre-filled data
2. `EMPTY_FORM_DATA` - Minimal empty form structure

**Type-safe:** Both match `OnboardingFormSchema` interface

**Validation:** All data passes Zod schema validation:
- Phone numbers: Israeli format `+972-XX-XXX-XXXX`
- Times: `HH:MM` format (e.g., "08:00")
- Crisis triggers: Objects with `{ keyword, severity, action }`

### File: `dashboard/components/onboarding/OnboardingWizard.tsx`

**Key Functions:**
```typescript
const loadTestData = () => {
  methods.reset(TIFERET_TEST_DATA); // react-hook-form reset
  setUseTestData(true);              // Update state indicator
  setCurrentStep(1);                 // Go to first step
};

const loadEmptyForm = () => {
  methods.reset(EMPTY_FORM_DATA);
  setUseTestData(false);
  setCurrentStep(1);
};
```

**State Tracking:**
- `useTestData` boolean tracks which dataset is active
- Visual indicator shows "✅ Using Tiferet test data" or "📝 Using empty form"
- Toggle buttons styled with active state (blue background)

---

## Testing Checklist

Before submitting a PR with onboarding changes:

- [ ] Load test data → Verify all 7 steps populated
- [ ] Navigate forward (1→7) → No errors
- [ ] Navigate backward (7→1) → Data persists
- [ ] Modify data → Changes saved in form state
- [ ] Submit form → Verify sent to backend correctly
- [ ] Start empty → Verify form is blank
- [ ] Fill empty form → Verify validation works
- [ ] Switch test data ↔️ empty → Verify reset works
- [ ] Refresh page → Verify localStorage persistence (if implemented)

---

## Common Issues

### Issue 1: Data Not Loading After Click
**Symptom:** Click "Load Tiferet Data" but form stays empty

**Solution:**
- Check browser console for errors
- Verify `test-data.ts` imports correctly
- Ensure `methods.reset()` called (react-hook-form)

### Issue 2: Validation Errors After Loading
**Symptom:** Test data loaded but validation errors shown

**Solution:**
- Crisis triggers must be objects, not strings
- Phone numbers must match regex: `^\+972-\d{2}-\d{3}-\d{4}$`
- Times must be `HH:MM` format
- Check `dashboard/lib/validation.ts` for exact schemas

### Issue 3: Submit Fails
**Symptom:** Form submits but API returns error

**Solution:**
- Check backend logs: `cd backend && npm run start:dev`
- Verify Cosmos DB connection
- Check safety-config container exists
- Verify userId is unique

---

## Next Steps

After test data integration is complete:

1. **Test End-to-End Flow**
   - Load test data → Complete onboarding → Verify saved to Cosmos DB
   - Check backend receives correct format
   - Verify system prompt generated correctly

2. **Phase 1: User Profile Migration**
   - Create user-profiles container
   - Migrate Tiferet's data to new schema
   - Update backend to use dynamic profiles (not hardcoded)

3. **Phase 2: Dashboard Enhancements**
   - Add photo upload component (Step 8)
   - Add music preferences form (Step 9)
   - Expand to 12-step onboarding

See `ONBOARDING_ENHANCEMENT_PLAN.md` for full roadmap.

---

## Developer Notes

**Why default to test data?**
- Line 35: `const [useTestData, setUseTestData] = useState(true);`
- Reason: Speeds up development by pre-loading on page load
- Can easily switch to empty with one click

**Why reset to Step 1?**
- When switching datasets, user should review from beginning
- Prevents confusion from partially filled forms

**Why show indicator?**
- Developers need to know which dataset is active
- Prevents accidentally submitting test data as real configuration

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Status:** Test data integration complete, ready for E2E testing
