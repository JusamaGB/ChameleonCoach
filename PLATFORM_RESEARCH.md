# Fitness Platform — Research & Vision Document

---

<ai-instructions>

## Instructions for the AI reading this

This is a living research and planning document for a modular fitness coaching SaaS platform. It is the single source of truth for platform vision, competitive context, module definitions, build phases, and decisions. You are expected to read it at the start of any session involving this platform, and update it as work progresses.

### How to read it
Read the whole document before starting any work. The **Build Phases** section tells you what has been done and what is next. The **Decisions Log** at the bottom tells you why things are the way they are. Do not skip either.

### How to update it
- When a build phase task is completed, mark it `[x]` in the relevant phase checklist.
- When a decision is made — about architecture, naming, pricing, scope, anything that affects future work — add a row to the Decisions Log at the bottom. Date it. Be specific.
- When new research is done on a competitor or a module, add or update the relevant section. Do not duplicate — update in place.
- When a phase is fully complete, add a completion date next to the phase heading.
- Never remove content from this document. If something is superseded, note it in the Decisions Log and mark the old content as outdated inline.

### What not to do
- Do not start building a phase without reading what came before it. Context matters.
- Do not make architectural decisions that contradict the Decisions Log without flagging the conflict to Kris first.
- Do not add modules to the build phases that Kris has not approved. Research sections can speculate freely — build phases cannot.
- Do not rename or restructure sections without updating this instruction block to match.

### Who owns this document
Kris (the human) sets direction. You execute and document. If something is unclear, ask before assuming. If something in the document is wrong or outdated, flag it rather than silently working around it.

</ai-instructions>

---

> Started: 2026-04-07

---

## The Differentiator

No existing platform offers native two-way Google Sheets integration as a first-class feature. Every coach who outgrew spreadsheets had to abandon their data and workflows to move to a SaaS. This platform keeps Sheets as the backbone — a proper client-facing portal on top of a workflow coaches already own.

**Core pitch:** Your Google Sheets workflow. With a real product on top.

**Three problems every competitor fails to solve:**
1. Coaches hate being locked in (no data export, no portability)
2. Punitive per-client pricing — growing coaches get penalised for success
3. Fitness and nutrition are always siloed — coaches doing both need two platforms

---

## Target Audience

| Coach Type | Current Best Served By | Gap |
|---|---|---|
| Personal Trainer | TrueCoach, Trainerize | No Sheets export, punitive pricing at volume |
| Nutritionist / Dietitian | Healthie, Practice Better | Over-engineered for clinical; no fitness crossover |
| Sports Performance Coach | None well | Custom metrics locked, no data freedom |
| Yoga / Pilates Instructor | Mindbody, Glofox | Overpriced, long contracts, overkill for solo studios |
| Wellness Coach | CoachAccountable | Dated UX, not fitness-specific |
| Gym / Studio Owner | Mindbody, Glofox | Arbitrary price hikes, 24-month contracts, complex |

---

## Competitive Landscape

### TrueCoach
- **Target:** Solo PTs, online coaches
- **Strengths:** Clean UX, drag-and-drop workout builder, 3,500+ exercise library, multi-coach accounts
- **Weaknesses:** No per-session billing, wearables and payments locked to higher tiers, not for studios
- **Pricing:** $19.99–$106.99/mo (5–50 clients), custom above 50

### My PT Hub
- **Target:** PTs, online coaches, small studios
- **Strengths:** No client cap, white-label app available, 30-day free trial
- **Weaknesses:** Dated UI, half-built nutrition planner, white-label quality inconsistent
- **Pricing:** From ~$14.40/mo (annual)

### ABC Trainerize
- **Target:** PTs, gym PT departments, boutique studios
- **Strengths:** Free plan (1 client), group coaching, Zapier integration, program marketplace
- **Weaknesses:** Aggressive add-on model (true cost 2-3x advertised), app bugs, nutrition and video are separate paid add-ons
- **Pricing:** $10–$250+/mo by client count; branded app ~$250/mo extra

### PT Distinction
- **Target:** Online coaches who want branding and content delivery
- **Strengths:** AI assistant, unlimited trainer accounts, custom assessments, group challenges
- **Weaknesses:** Steep learning curve, AI is gimmicky, thin revenue analytics
- **Pricing:** $19.90–$89.90/mo (3–50 clients); $1.60–$6/mo per extra client

### CoachAccountable
- **Target:** Life/wellness/executive coaches
- **Strengths:** Flexible billing (Stripe + PayPal), strong group coaching, no client cap
- **Weaknesses:** Not fitness-specific (no workout builder), overwhelming client UX, expensive at volume
- **Pricing:** $20–$4,000/mo based on active clients

### Healthie
- **Target:** Dietitians, nutritionists, multi-provider practices
- **Strengths:** HIPAA-compliant, AI charting assistant, insurance superbilling, telehealth
- **Weaknesses:** Over-engineered for non-clinical coaches, steep price jumps between tiers
- **Pricing:** $19.99–$149.99/mo (10 clients to unlimited)

### Practice Better
- **Target:** Nutritionists, dietitians, wellness practitioners
- **Strengths:** HIPAA/GDPR compliant, AI charting, wearables integration, Fullscript integration
- **Weaknesses:** Pricing becoming prohibitive for solo practitioners, no workout programming
- **Pricing:** Free (3 clients) → $25–$145/mo

### Mindbody
- **Target:** Yoga/Pilates studios, spas, multi-location operators
- **Strengths:** Class scheduling, massive consumer app network, dynamic pricing, AI front desk
- **Weaknesses:** $129–$699/mo, annual contracts (up to 24 months), arbitrary price increases, buggy, overkill for solo
- **Key complaint:** Studios report 20-40% year-over-year price increases with no exit clause

### ABC Glofox
- **Target:** Independent gyms, boutique studios, multi-location
- **Strengths:** Branded member app, access control integration, retention reporting
- **Weaknesses:** No public pricing, customer support widely criticised, reporting glitches
- **Pricing:** Custom/quote-based (~$100–$600+/mo estimates)

### Vagaro
- **Target:** Salons, spas, gyms, wellness — broad multi-vertical
- **Strengths:** Broad scheduling, POS hardware, payroll, Vagaro Marketplace
- **Weaknesses:** Primarily beauty/salon — fitness features bolted on, add-ons inflate true cost significantly
- **Pricing:** $23.99–$83.99/mo base + $10–$40/mo per add-on (true cost $80–$200+)

### Nudge Coach
- **Status:** Shutting down May 2025
- **Market signal:** Pure engagement/accountability without operational depth cannot retain revenue

---

## Complete Module Library

### A. Client Management
- Client profiles (contact, health history, goals, notes)
- Onboarding workflows and intake forms
- Client portal (self-service access to plans, records, messages)
- Progress photos
- Body metrics tracking (weight, measurements, body fat %)
- Custom data point tracking
- Assessment tools (PAR-Q, fitness assessments, custom)
- Tags and client segmentation

### B. Programming and Delivery
- Workout builder (drag-and-drop, set/rep/rest configuration)
- Exercise library (video demonstrations, descriptions)
- Program templates and duplication
- Program scheduling (calendar-based delivery)
- Auto-progression rules
- Group and team programming
- Program marketplace (sell programs to clients)
- Challenge and trial program management
- CSV / spreadsheet import of programs

### C. Nutrition
- Macro and calorie goal setting
- Meal plan builder
- Recipe library
- Food diary / logging
- MyFitnessPal integration
- Supplement recommendations
- Integration with dedicated nutrition tools (That Clean Life, Fullscript)

### D. Scheduling and Booking
- 1:1 appointment booking
- Group class scheduling
- Recurring booking
- Client self-booking
- Calendar sync (Google, iCal, Outlook)
- Waitlist management
- Cancellation and rescheduling policies
- Automated reminders (email, SMS, push)
- Staff scheduling

### E. Communication
- In-app direct messaging (1:1)
- Group messaging / community channels
- Scheduled messages
- Bulk email/SMS broadcasts
- Video calls / telehealth (built-in or Zoom integration)
- Push notifications

### F. Payments and Billing
- One-time payment processing (Stripe, PayPal)
- Recurring / subscription billing
- Package creation and sale
- Session-by-session billing
- Instalment billing
- Invoice generation
- Revenue reporting and dashboards
- Payment reminders and failed payment recovery
- Discount codes and promotions
- Insurance superbilling (clinical platforms)

### G. Tracking and Accountability
- Habit tracking (daily/weekly)
- Check-in forms (weekly, custom cadence)
- Goal setting and milestone tracking
- Workout completion logging
- Client engagement scores / activity feed
- Wearables integration (Apple Health, Garmin, Fitbit, Oura, Whoop)
- Step count and sleep tracking sync

### H. Content and Courses
- Program / course builder (module-based)
- Content drip scheduling
- Video hosting
- PDF / resource library
- Client-accessible knowledge base

### I. Business Operations
- CRM and lead management
- Lead capture forms / landing page
- Multi-coach / staff accounts
- Role-based permissions
- Multi-location management
- Access control integration (gyms/studios)
- POS and retail inventory
- Payroll management

### J. Marketing
- Automated email sequences
- SMS marketing campaigns
- Referral programs
- Review request automation
- Social media integrations
- Dynamic pricing
- Loyalty / rewards program

### K. White-labelling and Branding
- Custom branded iOS/Android app
- Custom domain / coach subdomain
- Colour and logo customisation
- Branded client portal

### L. Clinical / Healthcare
- HIPAA-compliant documentation
- SOAP note charting
- EHR / clinical notes
- AI charting assistant (session transcription)
- Insurance billing support
- Compliance (HIPAA, GDPR, PIPEDA)

### M. Analytics and Reporting
- Client progress reports
- Business revenue analytics
- Retention and churn reporting
- Campaign performance analytics
- Attendance and utilisation reports

### N. Integrations and Extensibility
- Google Sheets (two-way, real-time — our differentiator)
- Zapier
- Google Calendar
- Zoom / telehealth
- MyFitnessPal
- Wearable device APIs
- Nutritional databases (Fullscript, Rupa Health)
- Payroll tools (ADP, Paychex)
- AI assistant (content generation, recipe creation)

---

## Module Map by Coach Type

### Personal Trainer

| Priority | Module |
|---|---|
| Core | Workout builder + exercise library |
| Core | Program scheduling and delivery |
| Core | Client profiles and progress tracking |
| Core | In-app messaging |
| Core | Google Sheets sync |
| Standard | Appointment booking + calendar sync |
| Standard | Payment processing (subscriptions + packages) |
| Standard | Habit tracking and check-in forms |
| Standard | Onboarding intake forms |
| Standard | Wearables integration |
| Standard | Progress reports |
| Standard | Lead capture page |
| Premium | Branded mobile app |
| Premium | Program marketplace |
| Premium | Advanced revenue analytics |
| Premium | Multi-coach / team accounts |
| Premium | Video calls / virtual sessions |
| Premium | Auto-progression rules |

### Nutritionist / Dietitian

| Priority | Module |
|---|---|
| Core | Client profiles with health history |
| Core | Meal plan builder |
| Core | Macro and calorie goal setting |
| Core | Food diary / logging |
| Core | Appointment scheduling + self-booking |
| Core | Intake forms and assessments |
| Core | Secure messaging |
| Core | Google Sheets sync |
| Standard | Recipe library |
| Standard | Telehealth / video calls |
| Standard | Supplement recommendations |
| Standard | Progress tracking (weight, labs, symptoms) |
| Standard | Wearables integration |
| Standard | Automated reminders |
| Standard | Package billing |
| Premium | AI charting assistant |
| Premium | Insurance superbilling |
| Premium | SOAP notes / EHR documentation |
| Premium | Multi-provider / group practice management |
| Premium | Course and program delivery |
| Premium | Analytics and outcome reporting |

### Sports Performance Coach

| Priority | Module |
|---|---|
| Core | Workout builder with periodisation support |
| Core | Exercise library (sport-specific) |
| Core | Program scheduling (training blocks/phases) |
| Core | Athlete progress tracking (strength, times, scores) |
| Core | Messaging |
| Core | Google Sheets sync |
| Standard | Wearables and GPS device integration |
| Standard | Habit and recovery tracking |
| Standard | Group and team programming |
| Standard | Assessment tools (FMS, movement screens) |
| Standard | Check-in forms |
| Premium | Custom analytics / performance dashboards |
| Premium | Auto-progression and periodisation automation |
| Premium | Video review / form analysis |
| Premium | Multi-athlete management |

### Yoga / Pilates Instructor

| Priority | Module |
|---|---|
| Core | Class scheduling (recurring, multi-class calendar) |
| Core | Client self-booking |
| Core | Membership and pass management |
| Core | Payment processing |
| Core | Automated reminders |
| Standard | Waitlists |
| Standard | Attendance tracking |
| Standard | Staff scheduling |
| Standard | Branded booking widget (website embed) |
| Standard | Client portal |
| Standard | Google Sheets sync |
| Premium | Branded mobile app |
| Premium | Dynamic pricing |
| Premium | Multi-location management |
| Premium | Retail / merchandise POS |
| Premium | Marketing email campaigns |
| Premium | Loyalty / rewards program |
| Premium | Reporting and retention analytics |

### Wellness Coach

| Priority | Module |
|---|---|
| Core | Client profiles and session notes |
| Core | Appointment scheduling + calendar sync |
| Core | Package / session billing |
| Core | Secure messaging |
| Core | Goal setting and milestone tracking |
| Standard | Habit tracking |
| Standard | Check-in forms |
| Standard | Progress metrics (custom data points) |
| Standard | Group coaching with shared accountability |
| Standard | Automated reminders |
| Standard | Intake forms and assessments |
| Standard | Google Sheets sync |
| Premium | Course and program content delivery |
| Premium | Community features (group discussions) |
| Premium | Lead capture page |
| Premium | CRM and pipeline management |
| Premium | AI assistant (session summaries, homework generation) |

### Gym / Studio Owner

| Priority | Module |
|---|---|
| Core | Membership management |
| Core | Recurring billing + failed payment recovery |
| Core | Class + PT scheduling |
| Core | Member self-service booking |
| Core | Staff management and scheduling |
| Core | Attendance and check-in tracking |
| Standard | Access control integration |
| Standard | Revenue and retention dashboards |
| Standard | Lead / prospect CRM |
| Standard | Email and SMS communications |
| Standard | Waitlists |
| Standard | Multi-staff permissions |
| Standard | Package and session management |
| Premium | Branded mobile app |
| Premium | Multi-location management |
| Premium | POS and retail inventory |
| Premium | Payroll integration |
| Premium | Dynamic pricing |
| Premium | Marketing automation |
| Premium | Loyalty and referral programs |
| Premium | Advanced reporting and forecasting |

---

## Market Gaps (What to Exploit)

1. **No Google Sheets integration anywhere** — our core differentiator
2. **Punitive per-client pricing** — coaches penalised for growing. Flat monthly tiers win here.
3. **Fitness and nutrition always siloed** — PTs doing nutrition need two platforms. We do both.
4. **Client UX is universally poor** — coaches report needing tutorial videos just to onboard clients
5. **No real automation** — "automation" on most platforms means email reminders. Nothing conditional or intelligent.
6. **Data is locked** — coaches cannot export in a usable format or build custom reports
7. **Mindbody/Glofox contract trap** — studios fleeing long-term contracts are actively looking for alternatives. Month-to-month is a selling point.
8. **AI is gimmicky everywhere** — PT Distinction's AI is noted as a novelty. Real AI (intelligent progression, check-in analysis, client risk flagging) is an open gap.

---

## Build Phases

### Phase 1 — Nutritionist MVP (pitch-worthy for warm leads)
> Target: ~15–20 hours. Unlocks the 8 frozen cold email targets.

- [ ] Multi-coach sign-up (remove hardcoded single-admin architecture)
- [ ] Google Sheets connection in admin settings (each coach connects their own Google account)
- [ ] Basic appointment booking (Google Calendar sync)
- [ ] Stripe payment integration (subscription + per-session)
- [ ] Improved meal plan builder
- [ ] Rebrand away from G-Fitness (new name, new landing page leading with Sheets differentiator)

### Phase 2 — PT Module
> Unlocks the PT leads and broadens addressable market.

- [ ] Workout builder (drag-and-drop, set/rep/rest)
- [ ] Exercise library (basic, expandable)
- [ ] Program scheduling
- [ ] Auto-progression (basic)

### Phase 3 — Module System
> The architecture that makes this a platform, not a product.

- [ ] Module toggle in admin settings (coach selects what their clients see)
- [ ] Coach type selection at sign-up (pre-selects relevant modules)
- [ ] Client portal adapts to active modules only
- [ ] Feature request system (coaches submit requests, vote on roadmap)

### Phase 4 — Sports Coach + Studio
> Expand addressable market to remaining coach types.

- [ ] Class scheduling
- [ ] Membership / pass management
- [ ] Waitlists
- [ ] Periodisation support in workout builder
- [ ] Custom metric tracking (sport-specific)

### Phase 5 — Growth Layer
> Retention, automation, and scale.

- [ ] Wearables integration
- [ ] Conditional automation (missed check-in → nudge, stalled progress → flag)
- [ ] Branded client subdomain per coach
- [ ] AI check-in analysis
- [ ] Revenue and retention dashboards
- [ ] Referral program

---

## Pricing Model (Draft)

**Principle:** Flat monthly tiers by feature access, not by client count. Growing coaches are not penalised.

| Tier | Price | Included |
|---|---|---|
| Starter | £0/mo | 5 clients, Core modules only, platform branding |
| Pro | £19/mo | Unlimited clients, Core + Standard modules, Google Sheets sync |
| Studio | £49/mo | Everything in Pro + Premium modules, custom subdomain, multi-staff |

> To be validated with real users before locking in.

---

## Platform Name

> TBD. G-Fitness is the prototype name. New name needed before public launch.
> Requirements: fitness-adjacent, suggests coaching/guidance, not PT-specific (must work for nutritionists, yoga studios etc.)

---

## Notes and Decisions Log

| Date | Decision / Note |
|---|---|
| 2026-04-07 | Research completed. Google Sheets angle confirmed as genuine gap across all 11 platforms. |
| 2026-04-07 | Phase 1 targets nutritionists first — G-Fitness already closest to that workflow. |
| 2026-04-07 | 8 cold email targets (PTs, nutritionists, sports coaches) frozen pending Phase 1 completion. |
| 2026-04-07 | Workout builder deferred to Phase 2 — too large for initial pitch window. |
| 2026-04-07 | Mindbody/Glofox contract exodus noted as acquisition opportunity for studio owners. |
