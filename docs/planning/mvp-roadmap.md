# 🚀 MVP Roadmap (90-Day Plan)

## Overview

This 90-day plan outlines the path from concept to a functional MVP (Minimum Viable Product) that can be tested with real users.

**Goal:** Launch a simple, working version of Never Alone that validates core hypotheses:
1. Can we build empathetic AI conversations for elderly users?
2. Will families pay for this service?
3. Does it meaningfully reduce loneliness?

---

## Success Criteria

### MVP Success = All of These:
- ✅ 10+ families actively using the app
- ✅ 3+ conversations per user per day (avg)
- ✅ 80%+ reminder compliance rate
- ✅ 8+ NPS score (Net Promoter Score)
- ✅ 5+ families willing to pay after trial
- ✅ < 2 second conversation latency
- ✅ Zero critical safety incidents

---

## Phase 1: Foundation (Weeks 1-4)

### Week 1: Setup & Planning

**Team:**
- [ ] Finalize core team (2 engineers, 1 designer, 1 product manager)
- [ ] Set up development environment
- [ ] Create GitHub repo (this one!) with documentation
- [ ] Set up project management (Linear, Jira, or Notion)

**Legal & Business:**
- [ ] Register company (LLC or Ltd. in Israel)
- [ ] Open business bank account
- [ ] Draft Terms of Service (basic version)
- [ ] Privacy Policy (GDPR-compliant template)
- [ ] File trademark for "Never Alone" (Israel + U.S.)

**Tech Stack Decisions:**
- [x] **Frontend: ✅ Flutter** (Better performance for audio streaming, true cross-platform, precise accessibility control)
- [x] **Backend: ✅ Node.js (NestJS)** (Superior WebSocket handling for Realtime API, async I/O, excellent Azure SDK support)
- [x] Database: ✅ Azure Cosmos DB + Redis (confirmed)
- [x] Cloud provider: ✅ Azure (confirmed)
- [x] AI provider: ✅ Azure OpenAI Realtime API (GPT-4o audio-native with built-in transcription)

**Budget:** $5K (legal + trademarks + domains)

---

### Week 2-3: Core MVP Features - Part 1

**Backend Development:**
- [ ] Set up Azure API Management (authentication, routing)
- [ ] Implement Conversation Orchestrator service
  - [ ] Azure OpenAI Realtime API integration (GPT-4o audio-native)
  - [ ] WebSocket proxy (tablet ↔ Azure Realtime API)
  - [ ] Event handlers (transcripts, audio, function calls)
  - [ ] Enable input_audio_transcription for logging
- [ ] Create Azure Cosmos DB schema
  - [ ] Users container (partition by userId)
  - [ ] Conversations container (TTL: 90 days) with transcript turns
  - [ ] UserMemories container (facts extracted from conversations)
  - [ ] SafetyIncidents container (TTL: 7 years)
  - [ ] Reminders container
- [ ] Memory Store service (Redis short-term + Cosmos DB long-term)

**Frontend Development:**
- [ ] Design system (colors, typography, components)
- [ ] Dementia Mode home screen
  - [ ] Large "Talk to Me" button
  - [ ] Time/date display
  - [ ] Simple, high-contrast UI
- [ ] Conversation screen
  - [ ] Audio recording interface
  - [ ] Listening indicator (waveform animation)
  - [ ] Text display (transcript)
  - [ ] Voice playback

**Deliverable:** User can tap button, speak, and get AI response (basic).

---

### Week 4: Core MVP Features - Part 2

**Reminder System:**
- [ ] Scheduler service setup (cron jobs or AWS EventBridge)
- [ ] Reminder creation API
- [ ] Reminder notification to tablet
- [ ] Reminder display UI
- [ ] Acknowledgment flow ("I took them" button)

**AI Prompting:**
- [ ] Refine system prompt for empathy
- [ ] Add user context injection (name, age, basic facts)
- [ ] Implement safety filter (basic medical advice blocker)
- [ ] Add orientation prompts ("Today is...")

**Testing:**
- [ ] Internal testing with team members
- [ ] Voice latency testing (target: < 3 seconds)
- [ ] UI accessibility testing (large text, high contrast)

**Deliverable:** Basic reminder system works. AI feels warm and empathetic.

---

## Phase 2: Family Features (Weeks 5-8)

### Week 5-6: Family Dashboard (Web)

**Web Dashboard Development:**
- [ ] React/Next.js setup
- [ ] Authentication (login for family members)
- [ ] User profile view (see loved one's basic info)
- [ ] Daily activity summary
  - [ ] Number of conversations
  - [ ] Reminders taken vs. missed
  - [ ] Basic engagement metric
- [ ] Reminder management
  - [ ] Create reminder form
  - [ ] Edit reminder
  - [ ] Delete reminder
  - [ ] View reminder history

**Backend APIs:**
- [ ] Family member authentication
- [ ] Link family member to user account
- [ ] API endpoints for dashboard data
- [ ] Notification service (SMS alerts for missed reminders)

**Deliverable:** Family can log in, see activity, manage reminders.

---

### Week 7: Photo Feature (Memory Lane - Basic)

**Photo Upload & Storage:**
- [ ] Azure Blob Storage setup
- [ ] Photo upload API (family dashboard)
- [ ] Photo tagging (people names, context)
- [ ] Photo display on tablet (simple gallery)

**AI Photo Conversation:**
- [ ] AI can initiate photo viewing
- [ ] Display photo + context in prompt
- [ ] AI asks questions about photo
- [ ] Basic memory storage from conversation

**Example Flow:**
```
AI: "Would you like to look at some family photos?"
[Displays photo of grandchildren]
AI: "This is Emma and Jake at the beach. Do you remember this day?"
User: "Yes, that was last summer."
AI: "It looks like a beautiful day. What did you do there?"
```

**Deliverable:** Family can upload photos, AI can discuss them.

---

### Week 8: Polish & Refinement

**UI/UX Polish:**
- [ ] Animation refinements (smooth, not jarring)
- [ ] Error state designs (offline, connection lost)
- [ ] Loading states (spinner, skeleton screens)
- [ ] Sound design (gentle chimes, notification sounds)
- [ ] Accessibility improvements (VoiceOver support)

**AI Improvements:**
- [ ] Expand user context (hobbies, family names, preferences)
- [ ] Improve conversation flow (better follow-up questions)
- [ ] Test edge cases (user confusion, silence, interruptions)
- [ ] Refine safety guardrails (more medical phrases blocked)

**Performance Optimization:**
- [ ] Caching strategy (common TTS phrases)
- [ ] Database query optimization
- [ ] API response time profiling
- [ ] Frontend performance (lazy loading, code splitting)

**Deliverable:** App feels polished and professional.

---

## Phase 3: Safety & Beta Prep (Weeks 9-10)

### Week 9: Safety & Compliance

**Safety Features:**
- [ ] Crisis detection system
  - [ ] Self-harm phrase detection
  - [ ] Immediate family alert (SMS + push)
  - [ ] Empathetic AI response script
  - [ ] Incident logging
- [ ] Medical advice filter enhancement
  - [ ] Expand banned phrase list
  - [ ] Test with medical questions
  - [ ] Implement safe redirect responses
- [ ] Content moderation (OpenAI Moderation API)

**Legal & Compliance:**
- [ ] In-app disclaimers (always visible)
- [ ] Onboarding consent flow
- [ ] Terms of Service (lawyer review)
- [ ] Privacy Policy (finalized)
- [ ] Family dashboard legal notice

**Security:**
- [ ] Penetration testing (basic)
- [ ] Data encryption audit (at rest + in transit)
- [ ] Access control review
- [ ] Audit logging setup

**Deliverable:** App is safe and legally compliant.

---

### Week 10: Beta Testing Preparation

**Beta Tester Recruitment:**
- [ ] Identify 10-20 families (friends, family, local senior center)
- [ ] Create beta signup form
- [ ] Screen participants (eligibility criteria)
- [ ] Prepare beta agreement (NDA, feedback consent)

**Onboarding Materials:**
- [ ] User manual (simple, visual)
- [ ] Family member guide (how to use dashboard)
- [ ] Quick start video (3-5 minutes)
- [ ] FAQ document
- [ ] Support email setup (support@neveralone.com)

**Monitoring & Feedback:**
- [ ] Set up analytics (Mixpanel or Amplitude)
- [ ] User feedback form (in-app or Google Forms)
- [ ] Weekly check-in schedule with beta families
- [ ] Bug tracking system (GitHub Issues or Linear)

**Deliverable:** Ready to onboard first beta users.

---

## Phase 4: Pilot Launch (Weeks 11-12)

### Week 11: Beta Launch

**Launch Activities:**
- [ ] Distribute tablets to 5-10 families (start small)
- [ ] In-person setup and onboarding (if local)
- [ ] Daily check-ins with users (first 3 days)
- [ ] Monitor for critical bugs
- [ ] Collect qualitative feedback (interviews)

**Metrics to Track:**
- Daily active users (DAU)
- Conversations per day per user
- Reminder compliance rate (% acknowledged on time)
- App crashes or errors
- Family dashboard usage
- User satisfaction (NPS survey after 1 week)

**Rapid Iteration:**
- [ ] Daily team standups to review feedback
- [ ] Hot fixes for critical bugs (< 24 hour turnaround)
- [ ] Weekly feature adjustments based on feedback

---

### Week 12: Evaluation & Planning

**Beta Review:**
- [ ] Analyze usage data (quantitative)
- [ ] User interview summaries (qualitative)
- [ ] Identify top 3 pain points
- [ ] Identify top 3 delighters
- [ ] NPS calculation and analysis

**Success Evaluation:**
- Did we meet success criteria? (see top of document)
- What worked well?
- What needs major changes?
- Are families willing to pay?

**Next Steps Decision:**
1. **If successful (NPS > 8, high engagement):**
   - Expand beta to 50 users
   - Begin soft launch marketing
   - Implement payment system (Stripe)
   - Refine based on feedback

2. **If mixed results (NPS 5-7):**
   - Identify core issues
   - 2-4 week iteration cycle
   - Re-test with same families

3. **If unsuccessful (NPS < 5, low engagement):**
   - Deep dive interviews
   - Pivot or major redesign
   - Consider fundamentally different approach

**Deliverable:** Clear plan for next 90 days.

---

## MVP Feature Scope

### ✅ INCLUDED in MVP:
- Real-time voice conversation (Azure OpenAI Realtime API - audio-native)
- Automatic transcript logging (user + AI speech) for legal compliance
- Intelligent memory extraction (AI saves important facts during conversation)
- Dementia Mode (AI-initiated, no wake word)
- Large button UI (accessible, simple)
- Basic reminder system (medication, meals, calls)
- Family dashboard (web)
  - View activity
  - View conversation transcripts (opt-in)
  - Create/edit reminders
  - Upload photos
- Photo viewing (static)
- Basic AI photo conversations
- Safety guardrails (function calling for alerts, medical advice filter, crisis detection)
- SMS alerts to family (critical reminders missed, unsafe requests)
- Hebrew + English support

### ❌ NOT INCLUDED in MVP (Post-MVP):
- Loneliness Mode (wake word)
- Advanced photo features (face recognition, auto-tagging)
- Mood tracking and trends
- Video call integration
- Mobile app for family (web only)
- Offline mode (beyond cached reminders)
- Music/media integration
- Smart home device integration
- Multiple user profiles (1 user per account only)
- Advanced analytics and insights

---

## Budget Breakdown (90 Days)

### Team (Assuming Contractors/Freelancers):
| Role | Cost |
|------|------|
| **2 Full-stack engineers** | $30K-40K (@ $40-50/hour, 3 months) |
| **1 UI/UX Designer** | $8K-12K (@ $40-60/hour, part-time) |
| **1 Product Manager** | $10K-15K (@ $50/hour, part-time) |
| **TOTAL Team** | **$48K-67K** |

### Infrastructure & Tools:
| Item | Cost |
|------|------|
| **Cloud hosting** (AWS/Azure) | $500-1K |
| **OpenAI API** (GPT-5, Whisper, TTS) | $1K-2K (testing + beta) |
| **Domain + hosting** | $200 |
| **Development tools** (GitHub, Figma, etc.) | $300 |
| **TOTAL Infrastructure** | **$2K-3.5K** |

### Legal & Admin:
| Item | Cost |
|------|------|
| **Company registration** | $500-1K |
| **Trademark filing** | $3K-5K |
| **Legal review** (Terms, Privacy) | $2K-3K |
| **Insurance** (General Liability) | $500 |
| **TOTAL Legal** | **$6K-9.5K** |

### Beta Program:
| Item | Cost |
|------|------|
| **Tablets for beta** (10 users) | $3K-5K (subsidized or loaned) |
| **User incentives** | $1K (gift cards for feedback) |
| **TOTAL Beta** | **$4K-6K** |

### **GRAND TOTAL (90 Days): $60K-86K**

**Conservative Estimate:** $75K

---

## Team Structure

### Core Team (MVP)

**1. Technical Lead / Full-Stack Engineer**
- Responsibilities: Backend architecture, AI integration, database design
- Time commitment: Full-time (40 hours/week)

**2. Frontend Engineer**
- Responsibilities: Flutter/React Native app, UI implementation, accessibility
- Time commitment: Full-time (40 hours/week)

**3. UI/UX Designer**
- Responsibilities: Dementia-friendly interface design, family dashboard, user testing
- Time commitment: Part-time (20 hours/week)

**4. Product Manager (Founder)**
- Responsibilities: Vision, roadmap, user interviews, beta coordination
- Time commitment: Full-time

---

## Risks & Mitigation

### Risk 1: Latency Too High (> 3 seconds)
**Mitigation:**
- Optimize streaming (STT, GPT, TTS)
- Use WebSockets instead of HTTP
- Deploy at edge locations
- **Fallback:** Add "thinking" indicator if latency > 2s

### Risk 2: AI Sounds Robotic/Cold
**Mitigation:**
- Extensive prompt engineering
- Test multiple TTS voices (ElevenLabs, Azure)
- A/B test conversational styles
- **Fallback:** Iterate based on user feedback (expect 2-3 weeks tuning)

### Risk 3: Low User Engagement
**Mitigation:**
- Proactive AI check-ins (Dementia Mode)
- Family reminders to encourage use
- Gamification (optional): "Talk for 5 days, unlock photo feature"
- **Fallback:** Deep user interviews to understand barriers

### Risk 4: Safety Incident (Harmful AI Response)
**Mitigation:**
- Extensive safety testing before beta
- Human review of first 100 conversations
- Immediate kill switch if harmful response detected
- **Fallback:** Pause beta, fix issue, restart

### Risk 5: Technical Complexity (Underestimated)
**Mitigation:**
- Use proven SDKs (OpenAI, ElevenLabs)
- Avoid building from scratch (STT, TTS)
- Hire experienced engineers
- **Fallback:** Extend timeline to 120 days if needed

---

## Key Milestones

| Week | Milestone | Celebration |
|------|-----------|-------------|
| **1** | Team assembled, tech stack decided | Team dinner |
| **3** | First AI conversation works | Demo video |
| **4** | Reminder system functional | Internal dogfooding |
| **6** | Family dashboard live | Show to advisors |
| **8** | Photo feature complete | Product demo day |
| **10** | Beta-ready | Press announcement |
| **11** | First beta user onboarded | User celebration |
| **12** | 10+ users, success metrics hit | Team offsite |

---

## Communication Plan

### Internal (Team):
- **Daily standups:** 15 minutes (async via Slack or sync via Zoom)
- **Weekly retrospectives:** What went well, what didn't, what to change
- **Bi-weekly demos:** Show progress to stakeholders/advisors

### External (Beta Users):
- **Week 1:** Daily check-ins (phone or in-person)
- **Week 2-4:** Every 3 days check-ins (email or call)
- **Week 5+:** Weekly check-ins (email survey + optional call)

### Stakeholders (Investors/Advisors):
- **Bi-weekly updates:** Email with metrics, wins, blockers
- **Monthly deep dive:** 30-minute call or in-person meeting

---

## Post-MVP (Month 4+)

**If MVP successful, next priorities:**
1. **Payment system** (Stripe integration)
2. **Soft launch marketing** (landing page, Facebook ads)
3. **Expand beta to 50-100 users**
4. **Loneliness Mode** (wake word feature)
5. **Mobile app for family dashboard** (iOS + Android)
6. **Mood tracking and insights**
7. **Fundraising** (Seed round: $500K-1M)

---

## Final Checklist Before Launch

### Week 10 (Pre-Beta):
- [ ] All critical bugs fixed
- [ ] Terms of Service accepted by users
- [ ] Privacy Policy displayed prominently
- [ ] In-app disclaimers visible
- [ ] Crisis alert system tested
- [ ] Medical advice filter tested (100+ test phrases)
- [ ] Family dashboard accessible and tested
- [ ] Support email active (support@neveralone.com)
- [ ] Analytics tracking functional
- [ ] Backup/restore system in place
- [ ] Team on-call schedule for critical bugs

---

## Success Snapshot (End of Day 90)

**Ideal Outcome:**
- ✅ 10-15 active users (families)
- ✅ 3-5 conversations per user per day
- ✅ 85%+ reminder compliance
- ✅ NPS score of 9+ ("I love this!")
- ✅ 8+ families willing to pay $20/month
- ✅ Zero safety incidents
- ✅ < 2.5 second avg conversation latency
- ✅ Clear plan for scaling to 100+ users

**Next Step:** Raise seed funding, scale to 1,000 users in 6 months.

---

*This roadmap is a living document. Adjust based on learnings and blockers. Ship fast, learn faster.*
