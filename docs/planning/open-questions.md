# ❓ Open Questions

This document tracks unresolved questions and decisions that need to be made. Update as questions are answered.

---

## Product & Design

### 1. Visual Identity & Branding
- [ ] **Logo design:** Should it be warm/human or clean/tech?
- [ ] **Color palette:** Soft blues? Greens? What feels most comforting?
- [ ] **Voice/personality:** How much personality should the AI have? (More human-like vs. clearly AI)
- [ ] **Avatar:** Should there be a visual avatar/character, or text-only?

### 2. AI Voice Selection
- [ ] **Dementia Mode voice:** Male or female? What age? (Preliminary research suggests warm female voice, 40-50 years old)
- [ ] **Loneliness Mode voice:** Same voice or different? Customizable?
- [ ] **Multilingual voices:** Which Hebrew voice sounds most natural?
- [ ] **Emotional range:** Should AI voice show emotion (excitement, sadness) or stay neutral?

### 3. Photo Features
- [ ] **Face recognition:** Should we auto-tag people in photos, or require manual tagging?
- [ ] **Privacy concern:** Is facial recognition too invasive for this demographic?
- [ ] **Photo limits:** How many photos per user? (Storage cost consideration)
- [ ] **Video support:** Should we support short video clips in addition to photos?

### 4. Wake Word (Loneliness Mode)
- [ ] **Default name:** "Nora" or something else? Should it be customizable?
- [ ] **Pronunciation:** Will Hebrew speakers find "Nora" easy to pronounce?
- [ ] **Cultural sensitivity:** Are there cultural considerations for name choice?

---

## Technical

### 5. Platform Priorities
- [ ] **iOS vs. Android first?** (iPad has better accessibility features, but Android has larger market share)
- [ ] **Web version:** Should family dashboard have a lite web version for user access?
- [ ] **Offline capabilities:** How long should app function offline? (24 hours? 72 hours?)

### 6. Speaker Verification
- [ ] **MVP approach:** Button-only or attempt simple voice ID?
- [ ] **False positive tolerance:** What's acceptable? (< 5%? < 2%?)
- [ ] **Enrollment complexity:** How much voice data do we need for accurate verification?

### 7. Data Storage & Privacy
- [ ] **Voice recordings:** Should we ever store raw audio, even temporarily? (Privacy vs. quality improvement)
- [ ] **Conversation retention:** 90 days auto-delete? User configurable?
- [ ] **Family access:** Should users be able to see what family members view? (Transparency vs. complexity)
- [ ] **Data exports:** What format? (JSON? CSV? PDF report?)

### 8. AI Model Selection
- [ ] **GPT-5 vs. GPT-4 Turbo:** Is GPT-5 worth the cost? (Better empathy vs. 2x price)
- [ ] **Fine-tuning:** Should we fine-tune a model on elderly conversations? (Cost vs. benefit)
- [ ] **Fallback model:** If OpenAI has outage, what's backup? (Claude? Gemini?)

---

## Business & Pricing

### 9. Pricing Strategy
- [ ] **Free tier:** Should we offer free tier indefinitely, or time-limited trial?
- [ ] **Enterprise pricing:** Per-user or site license for care homes?
- [ ] **Family plan:** 2 users for $30, or separate subscriptions?
- [ ] **Annual discount:** 2 months free (16% off) or 3 months free (25% off)?

### 10. Target Market Priority
- [ ] **Israel first vs. U.S. first?** (Smaller market, easier logistics vs. larger TAM)
- [ ] **B2C vs. B2B focus:** Should we prioritize families or care homes?
- [ ] **Age group:** 65+ only, or open to younger lonely people (50+)?

### 11. Tablet Hardware
- [ ] **Bundle tablets?** Should we sell/lease tablets with app pre-installed?
- [ ] **Recommended devices:** Which tablets should we officially support?
- [ ] **Physical button:** Should we sell Bluetooth "Talk to Me" button accessory?

---

## Legal & Compliance

### 12. Medical Device Classification
- [ ] **Confirm non-medical status:** Do we need formal FDA pre-submission to confirm?
- [ ] **Medication reminders:** Are reminders "medical" if they mention specific medications?
- [ ] **Insurance reimbursement:** If Medicare/Medicaid covers it, does that change classification?

### 13. Crisis Response Protocol
- [ ] **Emergency services:** Should we ever call 911 automatically? (Liability risk vs. safety)
- [ ] **Mandated reporting:** Are we mandated reporters for elder abuse? (Varies by state/country)
- [ ] **Family escalation:** What if family member doesn't respond to crisis alert?

### 14. Intellectual Property
- [ ] **Patent filing:** Provisional patent before demo, or wait for traction?
- [ ] **Open source:** Should we open source any components for credibility?
- [ ] **Licensing:** Should we license our AI prompts/strategies to other companies?

---

## Go-to-Market

### 15. Marketing & Positioning
- [ ] **Primary messaging:** "Companion for dementia" or "Fight loneliness"? (More specific vs. broader appeal)
- [ ] **Target persona:** Adult children (40-60) or seniors themselves?
- [ ] **Pricing messaging:** Premium product ($20+) or affordable accessibility ($10)?

### 16. Distribution Channels
- [ ] **App stores only:** Or also direct sales (website)?
- [ ] **Retail partnerships:** Apple Store, Best Buy demos?
- [ ] **Healthcare partnerships:** Which organizations to approach first?

### 17. Launch Timing
- [ ] **Seasonal considerations:** Launch before holidays (more family visits) or avoid (busy time)?
- [ ] **Market readiness:** Are people ready for AI companions, or need education first?

---

## User Experience

### 18. Conversation Initiation
- [ ] **Frequency:** How often should AI initiate in Dementia Mode? (Every 2 hours? 4 hours?)
- [ ] **Quiet hours:** Should there be automatic "sleep mode" (e.g., 10 PM - 7 AM)?
- [ ] **User control:** Can users tell AI to "be quiet today" if not in the mood?

### 19. Emotional Boundaries
- [ ] **AI limitations:** Should AI explicitly state it can't feel emotions, or avoid meta-conversation?
- [ ] **Attachment concerns:** How do we handle users who become very attached to AI?
- [ ] **Grief and loss:** How should AI respond if user mentions death of loved one?

### 20. Multilingual Behavior
- [ ] **Code-switching:** If user switches languages mid-conversation, should AI follow?
- [ ] **Cultural adaptation:** Should AI use Israeli idioms with Hebrew speakers?
- [ ] **Translation:** Should family dashboard translate Hebrew conversations to English for non-speakers?

---

## Metrics & Success

### 21. Key Performance Indicators (KPIs)
- [ ] **Primary metric:** DAU? Conversations per day? NPS? (What's most important?)
- [ ] **Churn definition:** 7 days inactive? 14 days? 30 days?
- [ ] **Engagement threshold:** How many conversations per day indicate success? (1? 3? 5?)

### 22. Long-Term Impact
- [ ] **Clinical studies:** Should we partner with research institutions to measure loneliness reduction?
- [ ] **ROI for care homes:** How do we measure ROI for B2B customers?
- [ ] **Social impact metrics:** How do we quantify "reduction in loneliness"?

---

## Partnerships & Ecosystem

### 23. Integration Strategy
- [ ] **Calendar integration:** Google Calendar, Apple Calendar for appointment reminders?
- [ ] **Health apps:** Apple Health, Google Fit for activity tracking?
- [ ] **Smart home:** Alexa, Google Home integration or competition?
- [ ] **Telehealth:** Partner with Teladoc, Amwell for video consultations?

### 24. Data Partnerships
- [ ] **Anonymized research data:** Should we share data with universities studying loneliness?
- [ ] **Benchmark data:** Can we anonymize usage patterns to sell to care industry?

---

## Next Steps for Answering Questions

### Immediate (Before MVP Development):
1. Visual identity & branding (hire designer, 2-week sprint)
2. Platform priority (iOS/iPad first confirmed)
3. AI voice selection (test 5+ voices with target users)
4. Pricing strategy (competitive analysis + user interviews)

### Before Beta Launch (Week 8-10):
1. Crisis response protocol finalized (legal review)
2. Medical device classification confirmed (FDA guidance review)
3. Data retention policy set (90 days standard)
4. Marketing messaging decided (A/B test with landing page)

### Post-MVP (Month 4+):
1. Patent decision (based on traction and funding)
2. B2B vs. B2C focus (based on MVP results)
3. Integration strategy (based on user feature requests)
4. Clinical study partnerships (if pursuing healthcare market)

---

## Decision-Making Framework

For each open question:
1. **Research:** Gather data (user interviews, competitive analysis, legal research)
2. **Hypothesis:** Form initial hypothesis based on research
3. **Test:** If possible, test with small group (A/B test, beta feedback)
4. **Decide:** Make decision with documented rationale
5. **Iterate:** Revisit decision after 30-90 days with new data

**Decision owners:**
- **Product questions:** Product Manager (Founder)
- **Technical questions:** Technical Lead
- **Legal questions:** Legal Counsel (external)
- **Business questions:** CEO/Founder

---

**Last Updated:** November 9, 2025  
**Next Review:** End of Week 4 (MVP development)

*As questions are answered, move them to a separate "Decisions Made" document with rationale.*
