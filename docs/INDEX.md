# 📋 Document Index

This repository contains comprehensive documentation for the Never Alone project. Use this index to quickly find what you need.

---

## 🏠 Start Here

- **[README.md](../README.md)** — Project overview, vision, and quick navigation
- **[Executive Summary](./EXECUTIVE_SUMMARY.md)** — One-page investor overview

---

## 📦 Product Documentation

### Vision & Strategy
- **[Vision & Mission](./product/vision-mission.md)** — Why we exist and what we're building
- **[User Personas](./product/user-personas.md)** — Who we're building for (elderly, dementia, caregivers)
- **[Features & Modes](./product/features-modes.md)** — Dementia Mode, Loneliness Mode, core features
- **[UX Design](./product/ux-design.md)** — Interface design, accessibility, visual guidelines

---

## 🔧 Technical Documentation

### Architecture & Implementation
- **[MVP Simplifications](./technical/mvp-simplifications.md)** — 🚀 Simple approach for MVP: what's in, what's deferred, decision framework
- **[Architecture Overview](./technical/architecture.md)** — System design, Azure-native tech stack, data flow
- **[Realtime API Integration](./technical/realtime-api-integration.md)** — ⚡ Azure OpenAI Realtime API setup, transcript logging, memory extraction
- **[Memory Architecture](./technical/memory-architecture.md)** — 🧠 Three-tier memory system (Redis + Cosmos DB), conversation continuity across sessions
- **[Reminder System](./technical/reminder-system.md)** — 🔔 Medication reminders, daily check-ins, photo triggering (hybrid pre-recorded + Realtime API)
- **[Cosmos DB Design](./technical/cosmos-db-design.md)** — Database schema, containers, indexing, TTL policies, cost analysis
- **[AI Behavior](./technical/ai-behavior.md)** — Prompting, memory, emotion detection, safety
- **[Challenges & Solutions](./technical/challenges-solutions.md)** — Technical problems and our approach

---

## 💼 Business Documentation

### Strategy & Financials
- **[Business Model](./business/business-model.md)** — Revenue streams, pricing, market analysis
- **[Legal & Ethics](./business/legal-ethics.md)** — Compliance, disclaimers, privacy, crisis protocols
- **[IP Strategy](./business/ip-strategy.md)** — Trademarks, patents, trade secrets

---

## 📅 Planning Documentation

### Roadmap & Execution
### 📋 Planning
- [**MVP Roadmap**](planning/mvp-roadmap.md) - 90-day plan to first beta
- [**Safety-First Design**](planning/safety-first-design.md) - ⚠️ Critical safety philosophy & implementation
- [**Onboarding Flow**](planning/onboarding-flow.md) - 🚪 Family setup, patient consent, voice calibration
- [**Open Questions**](planning/open-questions.md) - Decisions needed
- [**Next Steps**](planning/next-steps.md) - Immediate action items

---

## 📂 Document Structure

```
Never Alone/
├── README.md (start here)
├── docs/
│   ├── EXECUTIVE_SUMMARY.md (investor one-pager)
│   ├── INDEX.md (this file)
│   ├── product/
│   │   ├── vision-mission.md
│   │   ├── user-personas.md
│   │   ├── features-modes.md
│   │   └── ux-design.md
│   ├── technical/
│   │   ├── GETTING_STARTED.md (👈 NEW: Developer onboarding)
│   │   ├── IMPLEMENTATION_TASKS.md (👈 NEW: Prioritized task list)
│   │   ├── mvp-simplifications.md
│   │   ├── architecture.md
│   │   ├── realtime-api-integration.md
│   │   ├── memory-architecture.md
│   │   ├── reminder-system.md
│   │   ├── cosmos-db-design.md
│   │   ├── ai-behavior.md
│   │   └── challenges-solutions.md
│   ├── business/
│   │   ├── business-model.md
│   │   ├── legal-ethics.md
│   │   └── ip-strategy.md
│   └── planning/
│       ├── mvp-roadmap.md
│       ├── safety-first-design.md
│       ├── onboarding-flow.md
│       ├── open-questions.md
│       └── next-steps.md
├── .github/
│   └── copilot-instructions.md (👈 NEW: GitHub Copilot context)
```

---

## 🔍 Quick Reference

### For Investors
1. [Executive Summary](./EXECUTIVE_SUMMARY.md)
2. [Business Model](./business/business-model.md)
3. [MVP Roadmap](./planning/mvp-roadmap.md)

### For Engineers
1. **[Getting Started](./technical/GETTING_STARTED.md)** 🚀 **START HERE - Your first 3 tasks**
2. **[Implementation Tasks](./technical/IMPLEMENTATION_TASKS.md)** 📋 **Prioritized task list with time estimates**
3. [MVP Simplifications](./technical/mvp-simplifications.md) - What's in MVP vs. deferred
4. [Architecture Overview](./technical/architecture.md) - System design & tech stack
5. [Realtime API Integration](./technical/realtime-api-integration.md) ⚡ - WebSocket + function calling
6. [Memory Architecture](./technical/memory-architecture.md) 🧠 - 3-tier memory system
7. [Reminder System](./technical/reminder-system.md) 🔔 - Medication reminders + photo triggers
8. [Cosmos DB Design](./technical/cosmos-db-design.md) - Database schemas
9. [AI Behavior](./technical/ai-behavior.md) - Prompting & safety
10. [Challenges & Solutions](./technical/challenges-solutions.md) - Known issues & fixes

**For GitHub Copilot:** See [.github/copilot-instructions.md](../.github/copilot-instructions.md)

### For Designers
1. [User Personas](./product/user-personas.md)
2. [UX Design](./product/ux-design.md)
3. [Features & Modes](./product/features-modes.md)

### For Product Managers
1. [Vision & Mission](./product/vision-mission.md)
2. [Open Questions](./planning/open-questions.md)
3. [Next Steps](./planning/next-steps.md)

### For Legal/Compliance
1. [Legal & Ethics](./business/legal-ethics.md)
2. [IP Strategy](./business/ip-strategy.md)

---

## 📝 Contributing to Documentation

### How to Update Docs:
1. **Read existing content** before making changes
2. **Follow the structure** — don't create new top-level folders
3. **Use Markdown** with proper formatting (headers, lists, tables)
4. **Keep it clear** — write for someone unfamiliar with the project
5. **Update this index** if you add new files

### Naming Conventions:
- Use lowercase with hyphens: `my-document.md`
- Be descriptive: `user-personas.md` not `users.md`
- Use `.md` extension for all Markdown files

### Formatting Guidelines:
- **Headers:** Use `#` for title, `##` for sections, `###` for subsections
- **Lists:** Use `-` for unordered, `1.` for ordered
- **Code blocks:** Use triple backticks with language: ` ```python `
- **Links:** Use relative links: `[text](./file.md)`
- **Tables:** Use Markdown tables for structured data
- **Emojis:** Use sparingly for visual navigation (✅❌⚠️)

---

## 🗓️ Document Maintenance

### Living Documents (Update Frequently):
- [Open Questions](./planning/open-questions.md) — As decisions are made
- [Next Steps](./planning/next-steps.md) — Weekly updates
- [MVP Roadmap](./planning/mvp-roadmap.md) — As sprints progress

### Stable Documents (Update Occasionally):
- [Vision & Mission](./product/vision-mission.md)
- [Architecture Overview](./technical/architecture.md)
- [Business Model](./business/business-model.md)

### Archive After MVP:
Once MVP is launched, consider archiving:
- MVP Roadmap → Move to `archive/mvp-roadmap-completed.md`
- Open Questions (resolved) → Move to `archive/decisions-made.md`

---

## 📧 Contact

**Questions about documentation?**
- **Product questions:** [Product Manager Email]
- **Technical questions:** [Tech Lead Email]
- **Business questions:** [Founder Email]

---

*This index is maintained by the project team. Last updated: November 9, 2025*
