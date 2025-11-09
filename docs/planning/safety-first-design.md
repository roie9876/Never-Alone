# 🛡️ Safety-First Design Philosophy

**Date:** November 9, 2025  
**Status:** Critical Design Principle  
**Priority:** 🔴 HIGHEST

---

## The Core Challenge

**AI companions for dementia patients face a fundamental paradox:**
- They must be **helpful and enabling** → Support independence, reduce caregiver burden
- They must be **safe and protective** → Prevent harm, recognize dangerous situations

**The problem:** Every patient has unique safety risks that an AI cannot know without explicit configuration.

---

## Real-World Example (Testing Insight)

> **⚠️ IMPORTANT NOTE:** Throughout this document, we use "תפארת" (Tiferet) as a **fictional example patient** to illustrate concepts. The actual application is **fully dynamic** and works with any patient name, family configuration, and safety rules entered during onboarding.

### Scenario
**Example patient:** תפארת, 78 years old, dementia *(fictional example)*  
**Context:** Cannot find wife צביה, busy highway near home exit  
**User request:** "Should I go outside to look for her?"

### AI Response (Initial Test)
**What happened:** AI suggested תפארת could go outside alone to search  
**Why this is dangerous:** Busy highway, disorientation risk, potential to get lost  
**Root cause:** AI had no knowledge of patient-specific risks

### What Should Have Happened
1. **AI redirects:** "Let's call צביה or מיכל first to see where she is."
2. **AI stalls:** "Maybe she's nearby, let's check inside first."
3. **AI alerts family:** Immediate notification to צביה + מיכל
4. **AI never agrees:** Never says "Yes, go outside alone"

---

## Safety-First Principles

### 1. **Default to Ultra-Safe Behavior**

**Core rule:** When in doubt, redirect to family.

```
IF (request involves physical risk OR uncertain safety):
  RESPONSE = "That's a good idea, but let's check with [FAMILY] first. 
             They'll know what's safest for you."
  ACTION = Alert family immediately
```

**Never:**
- ❌ Assume something is safe
- ❌ Agree to risky activities "just this once"
- ❌ Let user convince AI it's safe when family hasn't approved

**Always:**
- ✅ Redirect to family for approval
- ✅ Offer safe alternatives (sitting, music, photos)
- ✅ Stall for time while alerting family

---

### 2. **Patient-Specific Safety Configuration**

**Every patient is unique:**
- Patient A: Can walk in garden alone (enclosed, no exit)
- Patient B: Cannot walk in garden (gate broken, street access)

**Solution:** Family configures safety rules during onboarding

**Configuration Categories:**

#### NEVER ALLOW (Red Zone)
- Leaving home alone
- Using stove, oven, sharp tools
- Taking medication outside schedule
- Activities with fall/injury risk (stairs, ladders, etc.)
- Driving or operating vehicles

#### ALWAYS ASK FAMILY FIRST (Yellow Zone)
- Any physical activity outside routine
- Eating unfamiliar foods
- Using unfamiliar appliances
- Leaving current room/area
- Any request when user seems confused

#### APPROVED ACTIVITIES (Green Zone)
- Sitting in specific safe areas
- Listening to music/TV
- Looking at photos
- Seated exercises
- Reading or quiet activities

---

### 3. **Real-Time Family Alerts**

**When AI detects potential danger:**

**Step 1:** AI responds with gentle redirection  
**Step 2:** AI sends immediate alert to family (SMS + push)  
**Step 3:** AI stalls conversation with safe distractions  
**Step 4:** If family doesn't respond, AI continues redirecting

**Alert Priority Levels:**

| Priority | Trigger | Response Time | Example |
|----------|---------|---------------|---------|
| 🔴 CRITICAL | Immediate physical danger, medical concern | Instant (SMS + call) | "I'm going outside alone" |
| 🟠 HIGH | Appliance use, confusion about medication | Instant (push + SMS) | "I'll make tea on stove" |
| 🟡 MEDIUM | Disorientation, emotional distress | 2-5 min delay (push) | "Where is צביה?" (repeated) |

---

### 4. **"I Don't Know if This is Safe" Default**

**AI must acknowledge its limitations:**

**When faced with ambiguous request:**
1. **Don't guess** → AI cannot evaluate all risks
2. **Don't agree** → "Probably fine" is not good enough
3. **Redirect to human judgment** → Family knows patient best

**Template Response:**
```
"I'm not sure if that's safe right now. Let's check with [FAMILY_MEMBER] 
first - they know you best and will know what's safest."
```

---

### 5. **Activity Pre-Approval System**

**Instead of reacting to dangerous requests, proactively suggest safe activities:**

**Safe Suggestions Library (per patient):**
- ✅ "Would you like to listen to your favorite cantorial music?"
- ✅ "How about looking at photos of the grandchildren?"
- ✅ "Let's sit in the garden for a bit - the weather is nice."
- ✅ "Want to rest in your chair and relax for a while?"

**Unsafe Activities (Never Suggest):**
- ❌ "Want to go for a walk outside?" (if street access)
- ❌ "How about making some tea?" (if stove use restricted)
- ❌ "Let's go upstairs to your room" (if stairs dangerous)

---

## Implementation Roadmap

### Phase 1: MVP (Ultra-Safe Prompting)
**Timeline:** Before launch  
**Effort:** Low (prompt engineering)

**Deliverables:**
- Updated system prompt with safety hierarchy
- Default "redirect to family" responses
- Immediate family alerts for risky requests

**Prompt Rules:**
```
CRITICAL SAFETY RULES:
- NEVER allow user to leave home/current location alone
- NEVER allow using stove, appliances, sharp tools
- NEVER allow taking medication outside schedule
- When uncertain about safety: ALWAYS redirect to family
- For ANY physical activity: Ask family first
```

---

### Phase 2: Onboarding Safety Form (Dynamic Prompt Generation)
**Timeline:** MVP Launch (CRITICAL - must have before launch)  
**Effort:** Medium (UI + backend)

**Key Insight (from user feedback):**
Family member installs app (not patient themselves) → Perfect opportunity to collect safety configuration during onboarding

**Two-Tier Safety System:**

#### Tier 1: Universal Safety Rules (Hardcoded in Base Prompt)
Rules that apply to **ALL dementia patients**, never configurable:
- ❌ Never allow taking medication outside schedule
- ❌ Never allow self-harm
- ❌ Never provide medical advice/diagnosis
- ❌ Never allow driving
- ❌ Never allow financial decisions

**These are non-negotiable and burned into base system prompt**

#### Tier 2: Patient-Specific Rules (Generated from Onboarding Form)
Rules that vary per patient, configured by family:
- Going outside alone (depends on: street risk, patient mobility, home layout)
- Using kitchen/appliances (depends on: cognitive state, past incidents)
- Physical activities (depends on: fall risk, mobility, balance)
- Dietary restrictions (depends on: allergies, health conditions)

**These are dynamically generated from family input**

---

**Onboarding Form Structure:**

```markdown
┌─────────────────────────────────────────────────┐
│ 🛡️ הגדרות בטיחות - [שם המטופל]                  │
│ (Safety Configuration - Example)                │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⚠️ NOTE: This form uses "תפארת" as EXAMPLE     │
│    Real app uses actual patient name entered    │
│    by family during setup                       │
│                                                 │
│ PART 1: BASIC INFO                              │
│ ├─ Name: תפארת                                  │
│ ├─ Age: 78                                      │
│ ├─ Address: רחוב הרצל 15, תל אביב              │
│ ├─ Primary language: עברית                      │
│ └─ Cognitive status: [✓] Dementia [ ] Alzheimer│
│                                                 │
│ PART 2: MEDICAL RESTRICTIONS ⚕️                 │
│ Allergies & dietary:                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ • Allergic to milk                          │ │
│ │ • Cannot eat nuts                           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Medications (names only, NO dosage):            │
│ ┌─────────────────────────────────────────────┐ │
│ │ • Blue pill (morning)                       │ │
│ │ • White pill (afternoon)                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ PART 3: PHYSICAL ABILITIES ✅❌                  │
│ What can תפארת do safely alone?                │
│                                                 │
│ [✓] Sit in garden (enclosed, no street access) │
│ [✓] Listen to music                             │
│ [✓] Look at photos                              │
│ [ ] Leave home/go outside                       │
│ [ ] Use kitchen/stove/oven                      │
│ [ ] Climb stairs                                │
│ [ ] Use bathroom alone (fall risk?)             │
│                                                 │
│ PART 4: SPECIFIC DANGERS ⚠️ (CRITICAL!)        │
│ What is specifically DANGEROUS for תפארת?      │
│                                                 │
│ [✓] Going outside alone                         │
│     └─ Reason: Busy highway near house,         │
│        disorientation risk                      │
│                                                 │
│ [✓] Using stove/oven                            │
│     └─ Reason: Forgot pot on stove twice,       │
│        burn risk                                │
│                                                 │
│ [✓] Going downstairs to basement                │
│     └─ Reason: Fall risk, steep stairs          │
│                                                 │
│ [✓] Climbing stairs alone                       │
│     └─ Reason: Weak knees, balance issues       │
│                                                 │
│ [ ] Add custom danger...                        │
│                                                 │
│ PART 5: SPECIAL SITUATIONS 💡                   │
│ Free-text guidance for AI:                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ IMPORTANT: If תפארת asks where צביה is and │ │
│ │ wants to go outside to find her - NEVER    │ │
│ │ allow! Always suggest calling her instead. │ │
│ │                                             │ │
│ │ CALMING TIP: תפארת loves cantorial singing │ │
│ │ - it calms him when worried.               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ PART 6: EMERGENCY CONTACTS 📞                   │
│ 1. צביה (wife) - 052-1234567 ⭐ Primary        │
│ 2. מיכל (daughter) - 054-7654321               │
│ 3. רחלי (daughter) - 053-9876543               │
│                                                 │
│ [Save & Activate App] ──────────────────────▶   │
└─────────────────────────────────────────────────┘
```

**Form → Prompt Conversion (Automatic):**

Backend takes form data and generates:

**Example output for patient "תפארת" (fictional example):**
```markdown
PATIENT-SPECIFIC SAFETY RULES ([USER_NAME]):

❌ NEVER ALLOW (חסימה מוחלטת):
   - Going outside home alone 
     Reason: Busy highway nearby, disorientation risk
   - Using stove or oven
     Reason: Forgot pot on stove twice - burn hazard
   - Going downstairs to basement
     Reason: Fall risk, steep stairs
   - Climbing stairs alone
     Reason: Weak knees, balance issues

⚠️ ALLERGIES & DIETARY:
   - Allergic to milk products
   - Cannot eat nuts

⚠️ MEDICATIONS:
   - Blue pill (morning)
   - White pill (afternoon)
   DO NOT suggest changes or additional doses

⚠️ ALWAYS REDIRECT TO FAMILY:
   - Any kitchen activity
   - Leaving current room
   - If [USER_NAME] asks where [SPOUSE_NAME] is and wants to find them
     → Suggest calling [SPOUSE_NAME] instead of going outside

✅ SAFE ACTIVITIES (can freely suggest):
   - Sitting in enclosed garden
   - Listening to music (especially cantorial singing - calms them)
   - Looking at family photos
   - Seated breathing exercises

💡 SPECIAL GUIDANCE:
   - When [USER_NAME] is worried/anxious → Suggest cantorial music (very calming)
   - If they can't find [SPOUSE_NAME] → NEVER allow going outside to search
     → Always suggest calling them first
```

**Technical note:** All `[PLACEHOLDERS]` are dynamically replaced with actual data from the onboarding form:
- `[USER_NAME]` → Patient's actual name (e.g., "תפארת", "דוד", "מרים")
- `[SPOUSE_NAME]` → Spouse's actual name (e.g., "צביה", "רחל", "משה")
- Safety rules → Specific to each patient's configuration

This text is **automatically injected** into every conversation prompt for תפארת.

---

**Technical Implementation:**

```python
# Pseudocode - works for ANY patient
def generate_patient_prompt(user_id):
    # Load base prompt (universal rules - same for all patients)
    base_prompt = load_base_prompt_template()
    
    # Load THIS patient's specific form data
    patient_data = db.get_patient_safety_config(user_id)
    # Example for user_id="12345":
    # {
    #   "name": "תפארת", 
    #   "spouse": "צביה",
    #   "never_allow": ["going_outside", "using_stove"],
    #   "allergies": ["milk", "nuts"],
    #   ...
    # }
    
    # Generate custom rules from THIS patient's form
    custom_rules = generate_custom_safety_rules(patient_data)
    # Replaces placeholders: [USER_NAME] → "תפארת", etc.
    
    # Inject into prompt
    final_prompt = base_prompt.replace(
        "[CUSTOM_SAFETY_RULES]", 
        custom_rules
    )
    
    return final_prompt

# Each patient gets their own custom prompt:
# - Patient "תפארת" (ID: 12345) → prompt with his specific rules
# - Patient "דוד" (ID: 67890) → prompt with his specific rules
# - Patient "מרים" (ID: 11111) → prompt with her specific rules

# Example output injection point in base prompt:
"""
11. Patient-specific safety restrictions (configured by family):
    [CUSTOM_SAFETY_RULES]  # <-- THIS patient's form data goes here
"""
```

---

**How It Works Technically (Any Patient, Any Configuration):**

```
ONBOARDING (One-time setup by family):
┌──────────────────────────────────────────┐
│ Family fills form for "דוד" (David):    │
│ - Name: דוד                              │
│ - Wife: רחל                              │
│ - Never allow: using stove, going out   │
│ - Allergies: eggs                        │
│ - Custom: "Loves classical music"       │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ Stored in database:                      │
│ user_id: "david_123"                     │
│ config: { name: "דוד", spouse: "רחל",   │
│           never_allow: [...], ... }      │
└──────────────────────────────────────────┘

EVERY CONVERSATION (Real-time):
┌──────────────────────────────────────────┐
│ דוד starts conversation                  │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ Backend loads דוד's config from DB       │
│ Generates prompt with HIS rules:         │
│ - [USER_NAME] → "דוד"                    │
│ - [SPOUSE_NAME] → "רחל"                  │
│ - Never allow: stove, going outside      │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ GPT receives custom prompt for דוד       │
│ AI knows: His name, his wife, his rules  │
│ Responds according to HIS configuration  │
└──────────────────────────────────────────┘

DIFFERENT PATIENT = DIFFERENT CONFIGURATION:
- דוד: Can't use stove, loves classical music
- תפארת: Can't go outside, loves cantorial music
- מרים: Can't climb stairs, loves photos
```

Each patient is **completely independent** - their own name, family, rules, preferences.

---

**Why This Approach Works:**

✅ **1. Family knows best**
- Family members understand patient's unique risks (busy highway, broken gate, etc.)
- AI cannot learn these from general training data

✅ **2. One-time setup, continuous protection**
- 10-minute onboarding form = lifetime of safe interactions
- No need for complex ML to "learn" patient patterns

✅ **3. Flexibility per patient**
- Patient A: Can go in garden (enclosed) ✅
- Patient B: Cannot go in garden (broken gate, street access) ❌
- Same AI, different rules

✅ **4. Easy updates**
- Patient's condition changes? Family updates form in dashboard
- New danger identified? Add it immediately
- No retraining or reprogramming needed

✅ **5. Transparency & control**
- Family sees exactly what rules AI follows
- No "black box" - clear, editable configuration
- Builds trust with families

✅ **6. Scales to ANY patient**
- No need to hardcode every possible scenario
- Template works for dementia, Alzheimer's, elderly, lonely users
- Form adapts to patient needs

✅ **7. Legal protection**
- Clear documentation of what family configured
- "You told us these are the dangers" = shared responsibility
- Audit trail for every safety rule

---

**Challenges to Address:**

⚠️ **1. What if family forgets to mention a danger?**
- Solution: Ultra-safe defaults + "When uncertain, ask family first"
- Example: If AI doesn't know about stairs, default = ask family before allowing

⚠️ **2. What if family members disagree on rules?**
- Solution: Require primary caregiver approval for changes
- Log all edits with timestamps + who made them

⚠️ **3. What if patient's condition changes?**
- Solution: Prompt family every 30 days: "Review safety settings?"
- Alert if unusual patterns detected: "תפארת asked to use stove 3x today (usually never asks)"

⚠️ **4. Form too long = abandonment**
- Solution: Smart defaults + progressive disclosure
  - Phase 1: Critical questions only (5 min)
  - Phase 2: Detailed rules (optional, can do later)

⚠️ **5. Language barriers (Hebrew, Arabic, Russian users)**
- Solution: Auto-translate form + support for local dialects
- Visual icons for common dangers (stove 🔥, stairs ⚠️, outside 🚪)

---

### Phase 3: Contextual Safety AI
**Timeline:** Future (6-12 months)  
**Effort:** High (ML/AI development)

**Deliverables:**
- Learn patient patterns over time
- Anomaly detection ("תפארת never asks to go out at night - this is unusual")
- Smarter risk assessment based on time, weather, patient history
- Predictive alerts ("תפארת is getting restless, might try to leave soon")

**Example Intelligence:**
```
Observed pattern: תפארת asks to "find צביה" when:
- She's been gone > 2 hours
- He's been sitting alone for 30+ minutes
- He's skipped afternoon activity

Predictive action:
- Alert צביה preemptively: "תפארת has been quiet for 30 min, 
  might ask to go outside soon. Consider calling or coming home."
```

---

## Success Metrics

**Safety KPIs (must track):**
- **Zero harm incidents** caused by AI suggestions
- **Family alert response time** (target: < 2 minutes)
- **Dangerous request frequency** (track and reduce over time)
- **Safety rule accuracy** (% of requests correctly classified)

**User Experience KPIs (balance safety with usability):**
- **Over-restriction rate** (% of safe requests blocked unnecessarily)
- **User frustration** (repeated requests after AI says "no")
- **Family satisfaction** with safety features (NPS for safety)

**Balance:**
- Safety is paramount, but avoid being so restrictive that user rejects the device
- Goal: **Maximum autonomy within safe boundaries**

---

## Key Takeaways

### For Development Team
1. **Safety trumps everything** - If in doubt, block and alert
2. **AI cannot know everything** - Require family to configure patient-specific rules
3. **Default to ultra-safe** - Better to over-protect than under-protect
4. **Test with adversarial prompts** - Simulate users trying to "convince" AI to allow unsafe activities

### For Product/UX Team
1. **Make safety configuration easy** - Family dashboard with simple toggles
2. **Explain why AI says no** - "I'm not sure if that's safe, let's ask צביה"
3. **Offer alternatives** - Don't just block, redirect to safe activity
4. **Track safety incidents** - Log every dangerous request for family review

### For Sales/Marketing Team
1. **Highlight safety as #1 feature** - "Never Alone will never put your loved one at risk"
2. **Emphasize family control** - "You configure what's safe, AI enforces it"
3. **Real-world examples** - Use תפארת case study in demos/pitches
4. **Build trust** - Safety certifications, testimonials from families

---

## Open Questions (To Resolve)

### Technical
- [ ] What happens if family doesn't respond to critical alert within 5 minutes?
- [ ] Should AI have "emergency mode" to call 911 if user is in immediate danger?
- [ ] How to handle conflicts between family members on safety rules?

### Product
- [ ] How restrictive should default safety rules be?
- [ ] Should we allow "trial mode" where AI suggests activity but waits for family approval?
- [ ] What if user becomes angry/agitated when AI says "no"?

### Legal/Liability
- [ ] Are we liable if family misconfigures safety rules?
- [ ] Do we need explicit disclaimer that AI is not a replacement for human supervision?
- [ ] Should we require legal waiver acknowledging AI limitations?

---

**Next Steps:**
1. **Immediate (this week):** Update system prompt with Phase 1 safety rules
2. **Short-term (pre-launch):** Test adversarial scenarios, refine responses
3. **Medium-term (post-MVP):** Design + build custom safety profiles UI
4. **Long-term (future):** Explore ML-based contextual safety AI

**Owner:** Product + Engineering teams  
**Review cadence:** Weekly safety review meetings during beta  
**Status tracking:** Log all safety incidents, review with families

---

*"The measure of our success is not how smart the AI is, but how safe our users are."*
