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

### Platform Layering
- **Coach Type** is an onboarding preset and positioning layer, not a permanent access lane.
- **Active Modules** are the enabled entitlements for a coach workspace.
- **Module Features** are the pages and capabilities nested inside each active module.
- Cross-niche access is intentional: a PT can later enable nutrition-related modules, and a nutritionist, wellness coach, or studio can later enable PT-related modules where relevant.

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

Coach type should be treated as a starting preset that suggests a default module mix. It is not intended to hard-lock a coach to one lane forever; active modules are the real entitlement layer.

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

### Managed Sheets + AI Migration Contract

- Default operating structure: Chameleon-managed Google Sheets are the default and ongoing operating model for each coach workspace
- Workspace setup direction:
  - coach connects Google
  - Chameleon creates structured starter sheet/templates in the coach's Google account
  - the managed sheets should be understandable enough for coaches to work in Sheets directly while the app uses the same structure
- Active intake modes:
  - Mode 1: start fresh with Chameleon-managed Google Sheets
  - Mode 3: AI-assisted migration into Chameleon-managed Google Sheets
- Superseded path:
  - guided mapping of arbitrary existing sheet structures is not the normal product path and should be treated as superseded for forward planning
- Legacy migration rule:
  - legacy Google Sheets, CSVs, pasted text, notes/docs, PDFs, and similar materials are intake sources only
  - AI should classify, route, and propose structured placement for those inputs
  - coach confirmation/correction is part of the migration loop before writing
  - migrated data should be written into Chameleon-managed structures rather than left in arbitrary long-term operating formats
- Source-of-truth rule:
  - after migration, the Chameleon-managed sheet structure in the coach's Google account becomes the ongoing source of truth
  - legacy files remain intake/reference material unless explicitly re-run through migration
- Scope split:
  - coach-scoped structures include exercise library, recipe library, reusable templates/libraries, and module/tool catalog
  - client-scoped structures include meal plans, progress, check-ins, assigned workouts/programs, and client-specific records
- Commercial note:
  - AI-assisted migration should be framed as a premium onboarding/migration layer, not the baseline default setup

### Immediate Sequencing Correction

1. Lock the managed-sheet contract.
2. Lock the AI migration contract.
3. Implement automatic Chameleon-managed sheet/template creation.
4. Implement the coach-level migration/source hub shell.
5. Implement AI-assisted migration tooling.
6. Deepen module-specific import/edit flows only after the managed structure and migration path are in place.

### Phase 1 — Nutritionist MVP (pitch-worthy for warm leads) — In Progress
> Target: ~15–20 hours. Unlocks the 8 frozen cold email targets.

- [x] Multi-coach sign-up (remove hardcoded single-admin architecture)
- [x] Google Sheets connection in admin settings (each coach connects their own Google account)
- [x] Basic appointment booking (Google Calendar sync) — request/confirm/decline flows, email notifications, coach-created bookings, slot requests, and Google Calendar sync are now live in app
- [ ] Stripe payment integration (subscription + per-session) — recurring subscription billing complete (trial + monthly + webhooks); per-session appointment billing now implemented on the platform Stripe account; still need deferred Stripe test-mode end-to-end validation for Checkout + webhook status updates before calling this complete
- [x] Improved meal plan builder
- [x] Rebrand away from G-Fitness (new name, new landing page leading with Sheets differentiator) — public-facing fallback branding, landing/auth/onboarding copy, invite/public shell text, and client-facing shell cleaned up around Chameleon Coach defaults

### Phase 2A — Module Backbone
> The platform structure that makes coach type a preset and active modules the real entitlement layer.

- [ ] Module toggle in admin settings (coach selects what their clients see)
- [ ] Coach type selection at sign-up (pre-selects relevant modules)
- [ ] Client portal adapts to active modules only

### Phase 2B — PT Core
> Unlocks the PT leads on top of the module backbone. The exercise library slice is already started and stays in place.

- [ ] Workout builder (drag-and-drop, set/rep/rest)
- [x] Exercise library (basic, expandable) — already started PT Core capability, not the platform-defining layer
- [ ] Program scheduling
- [ ] Auto-progression (basic)

### Phase 3 — Platform Expansion
> Extensions that build on the module backbone and niche modules already in motion.

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

> Chameleon Coach. This replaces G-Fitness as the platform name for public-facing planning and future implementation work.
> Positioning requirement: broad enough to work across nutrition, PT, wellness, yoga, and studio use cases without sounding locked to a single discipline.

---

## Brand Direction and White-Label Plan

### Product Brand Direction
- **Chameleon Coach** is the platform brand.
- The product should be framed as a coach platform that can adapt per coach/business, rather than as a single fixed-brand coaching app.
- White-labelling should be treated as coach-specific customisation on top of the Chameleon Coach platform, not as fully separate product forks.
- Default language in future specs and implementation planning should refer to the platform brand first, then the individual coach brand layer where relevant.

### White-Label Strategy
- White-labelling is per coach account/workspace, with branding settings applied to that coach's client-facing experience.
- V1 should support lightweight brand customisation without introducing separate deploys, separate codepaths, or tenant-specific builds.
- The platform brand remains visible on lower tiers via a **Powered by Chameleon Coach** treatment.
- Higher tiers can progressively reduce or remove visible platform branding later, once the basic custom-brand flow is stable.
- This strategy should prioritise fast rollout across client-facing surfaces first, before deeper system-wide brand replacement.

### V1 Branding Scope
- V1 branding fields:
  - `title`
  - `logo`
  - `primary_color`
  - `accent_color`
  - `welcome_text`
- V1 branding should be applied first to:
  - client-facing portal surfaces
  - invite flows
  - onboarding surfaces
- Admin/internal surfaces do not need full white-label treatment in V1 unless required to support preview/basic setup.
- V1 should not aim for full email branding, PDF branding, custom domains, or full theme/token systems.

### Later-Phase Branding Scope
- Later phases may remove platform branding completely for higher tiers.
- Later phases may add:
  - branded email templates
  - branded PDFs / exported reports
  - custom domains
  - expanded theme controls / fuller visual theming
- These should be treated as extensions of the same coach branding model, not separate branding systems.

### Monetization and Tiering Implications
- White-labelling should reinforce the flat-tier model by gating branding depth by feature tier, not by client count.
- Lower tiers keep **Powered by Chameleon Coach** visible on branded client-facing experiences.
- A higher tier can justify removing platform branding and unlocking deeper brand controls.
- Future premium branding features can be bundled with other higher-tier differentiation such as custom domains and advanced presentation/reporting options.

### Minimal-Diff Implementation Approach
- Future implementation should aim for minimal diffs across the current product rather than a broad rebrand rewrite.
- Prefer reusing existing coach settings, profile storage, or equivalent per-coach configuration records where possible instead of introducing a new standalone branding system first.
- Store branding as a small, coach-scoped settings payload that can safely fall back to Chameleon Coach defaults when unset.
- Apply branding through shared rendering/configuration paths so the same values can power portal, invite, and onboarding surfaces with minimal duplication.
- Defer any deeper theme architecture until the limited V1 fields above are working end-to-end.

---

## Notes and Decisions Log

| Date | Decision / Note |
|---|---|
| 2026-04-07 | Research completed. Google Sheets angle confirmed as genuine gap across all 11 platforms. |
| 2026-04-07 | Phase 1 targets nutritionists first — G-Fitness already closest to that workflow. |
| 2026-04-07 | 8 cold email targets (PTs, nutritionists, sports coaches) frozen pending Phase 1 completion. |
| 2026-04-07 | Workout builder deferred to Phase 2 — too large for initial pitch window. |
| 2026-04-07 | Mindbody/Glofox contract exodus noted as acquisition opportunity for studio owners. |
| 2026-04-07 | Phase 1 partially complete. Multi-coach, Sheets connection, and meal plan builder done. Remaining: Google Calendar sync, per-session billing, rebrand. |
| 2026-04-07 | Google Calendar sync and per-session billing deprioritised within Phase 1 — appointment booking works without calendar sync, and subscription billing is sufficient for initial pitches. Decision: assess whether these are needed before cold outreach or can slip to Phase 2. |
| 2026-04-08 | Platform naming direction set to Chameleon Coach. White-label strategy formalised as coach-level customisation with V1 fields limited to title, logo, primary colour, accent colour, and welcome text; lower tiers retain Powered by Chameleon Coach branding; future implementation should reuse existing coach settings/profile storage with minimal diffs where possible. |
| 2026-04-08 | Google Calendar sync is now part of the appointment confirmation flow. Confirmed sessions create/update Calendar events through the existing appointment routes alongside email notifications. |
| 2026-04-08 | Phase 1 per-session appointment billing was implemented using the existing single platform Stripe account, shared webhook, Resend mailer, and appointment flows. Stripe Connect / coach payouts remain out of scope for this slice. Stripe test-mode end-to-end payment and webhook verification is intentionally deferred and remains a release gate before marking billing fully complete. |
| 2026-04-08 | Chameleon Coach public-facing rebrand cleanup is complete. Chameleon Coach is now the fallback platform identity across landing, auth, onboarding, invite/public shell copy, and metadata; coach branding still overrides client-facing surfaces and Powered by Chameleon Coach remains the lower-tier default. |
| 2026-04-08 | Phase 2 started with the smallest PT-safe slice: a coach-scoped exercise library foundation. V1 includes exercise persistence, create/list/edit admin flows, and client-side search/filtering, while workout builder, scheduling, drag-and-drop, and progression logic remain deferred. |
| 2026-04-08 | Architectural realignment: module backbone work should precede deeper niche expansion. Coach type is a preset and positioning layer, active modules are the entitlement layer, and the already-built exercise library is retained as a PT Core feature rather than the structure-defining platform layer. |
| 2026-04-08 | Client workspace IA slice landed with minimal scope: `Clients` is now the coach entry point for client-specific work, `/admin/clients/[id]` acts as a client workspace shell for real backed sections only, and coach-scoped tools like Exercises remain outside client context. |
| 2026-04-08 | Managed-sheets contract locked for forward planning. Default operating modes are now (1) start fresh with Chameleon-managed Google Sheets and (3) AI-assisted migration into Chameleon-managed Google Sheets. Guided mapping of arbitrary legacy sheet layouts is superseded as a normal product path; legacy sources are intake-only and migrated data should become part of the Chameleon-managed structure in the coach's Google account. |
