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
All approved coach-type niches can be shown in onboarding and the Modules workspace even before their full bundles ship, as long as unbuilt niches are clearly marked `Coming soon` and not exposed as real entitlements yet.

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

#### Wellness Coach starter slice

The first implementation slice for Wellness Coach should stay close to the existing shared core plus the strongest recurring coaching loop:

1. client profiles and session notes
2. appointment scheduling + calendar sync
3. goal setting and milestone tracking
4. check-in forms
5. habit tracking
6. Google Sheets sync

This should deliberately defer secure messaging, group coaching, course delivery, CRM, and AI until the starter loop is proven.

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

- [x] Module toggle in admin modules workspace settings (coach selects what their clients see)
- [x] Coach type selection at sign-up (pre-selects relevant modules)
- [x] Client portal adapts to active modules only

### Phase 2B — PT Core
> Unlocks the PT leads on top of the module backbone. The exercise library slice is already started and stays in place.

- [x] Lock the PT Core managed-sheet contract
- [x] Workout builder (sets, reps, rest, tempo, order, notes)
- [x] Exercise library (basic, expandable) — already started PT Core capability, not the platform-defining layer
- [x] Programs and templates
- [x] Client training plan delivery
- [x] Workout logging / session feedback
- [x] Coach training overview inside client workspaces
- [x] Program scheduling
- [ ] Auto-progression (basic)

### PT Core Build Order

1. Lock the PT Core Google Sheets structure for coach-scoped and client-scoped tabs.
2. Build the workout builder on top of the existing exercise library.
3. Add reusable programs/templates so workouts can be grouped and assigned.
4. Add the client training-plan surface so assigned PT work is visible in the portal.
5. Add workout logging/session feedback so training data writes back into the managed structure.
6. Add the coach training overview inside client workspaces so adherence and recent training context are reviewable.
7. Harden the full PT Core flow end to end before adding another coach core.

### PT Core Managed-Sheet Direction

- Coach-scoped PT structures should hold:
  - exercise library
  - reusable workouts
  - reusable program templates
- Client-scoped PT structures should hold:
  - assigned training plan
  - workout log / completed sessions
  - PT-specific notes or performance markers where needed
- PT Core should be treated as the first full proof of the module model:
  - coach library/build tools live at the workspace level
  - assigned plan and logging live in the client workspace
  - app pages and Google Sheets should reflect the same structure clearly enough for direct manual use in Sheets

### Nutrition Core Follow-Through

- Nutrition Core remains the other active foundation module and still needs hardening around managed-sheet reliability, read/write consistency, and end-to-end onboarding validation.
- No new coach core should be added until PT Core and Nutrition Core both feel structurally complete and stable in app + Sheets.

### PT Core Exact Schema

This section defines the exact V1 PT Core contract to use for implementation. It should act as the pattern for future modules: first define the app entities, then define the managed Google Sheets tabs, then define sync ownership between workspace-level and client-level structures.

#### PT Core V1 Principles

- Exercise library remains coach-scoped.
- Workout and program authoring remain coach-scoped.
- Program assignment, plan delivery, and workout logging are client-scoped.
- Google Sheets should stay readable and usable directly by a coach without requiring the app to interpret opaque JSON blobs.
- The app database should own identity, relationships, assignment state, and permissions.
- Google Sheets should mirror the operational coaching data in a tabular structure that is understandable and editable.

#### App-Level PT Entities

##### 1. `pt_exercises`

Purpose: coach-scoped exercise library entries.

Fields:
- `id`
- `coach_id`
- `name`
- `category`
- `movement_pattern`
- `primary_muscles`
- `secondary_muscles`
- `equipment`
- `difficulty`
- `default_units`
- `description`
- `coaching_notes`
- `demo_url`
- `is_archived`
- `created_at`
- `updated_at`

Notes:
- This extends the current exercise library direction rather than replacing it.
- `default_units` should support values such as `reps`, `seconds`, `distance`, or `calories` where needed later.

##### 2. `pt_workouts`

Purpose: reusable coach-scoped workout definitions.

Fields:
- `id`
- `coach_id`
- `name`
- `description`
- `goal`
- `estimated_duration_minutes`
- `difficulty`
- `is_template`
- `is_archived`
- `created_at`
- `updated_at`

##### 3. `pt_workout_exercises`

Purpose: ordered exercise blocks inside a workout.

Fields:
- `id`
- `workout_id`
- `exercise_id`
- `sort_order`
- `block_label`
- `prescription_type`
- `sets`
- `reps`
- `rep_range_min`
- `rep_range_max`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rest_seconds`
- `tempo`
- `load_guidance`
- `rpe_target`
- `notes`
- `created_at`
- `updated_at`

Notes:
- `prescription_type` allows the same row model to support rep-based, time-based, and distance-based work.
- `block_label` can later support simple groupings like warm-up, main work, finisher, without requiring a more complex builder yet.

##### 4. `pt_programs`

Purpose: reusable coach-scoped program definitions built from workouts.

Fields:
- `id`
- `coach_id`
- `name`
- `description`
- `goal`
- `duration_weeks`
- `difficulty`
- `is_template`
- `is_archived`
- `created_at`
- `updated_at`

##### 5. `pt_program_sessions`

Purpose: ordered sessions inside a reusable program.

Fields:
- `id`
- `program_id`
- `week_number`
- `day_number`
- `sort_order`
- `session_name`
- `workout_id`
- `focus`
- `notes`
- `created_at`
- `updated_at`

Notes:
- `week_number` + `day_number` should be sufficient for V1 program structure.
- `session_name` supports cases where the displayed training day label differs from the workout name.

##### 6. `client_pt_program_assignments`

Purpose: active or historical PT program assignment for a client.

Fields:
- `id`
- `coach_id`
- `client_id`
- `program_id`
- `program_name_snapshot`
- `assigned_start_date`
- `assigned_end_date`
- `status`
- `current_week`
- `assignment_notes`
- `last_session_completed_at`
- `completed_sessions_count`
- `total_sessions_count`
- `adherence_percent`
- `created_at`
- `updated_at`

Status values:
- `draft`
- `active`
- `completed`
- `cancelled`

Notes:
- Snapshot fields reduce breakage if the coach later edits the base program.
- V1 should allow one primary active assignment per client, even if the table can technically store history.

##### 7. `client_pt_sessions`

Purpose: client-scoped assigned session rows derived from a program assignment.

Fields:
- `id`
- `assignment_id`
- `client_id`
- `coach_id`
- `program_id`
- `program_session_id`
- `workout_id`
- `session_name`
- `scheduled_date`
- `week_number`
- `day_number`
- `sort_order`
- `status`
- `completed_at`
- `coach_note`
- `client_note`
- `created_at`
- `updated_at`

Status values:
- `upcoming`
- `available`
- `completed`
- `skipped`

Notes:
- This is the delivery layer the client portal should read from.
- These rows should be generated when a program is assigned rather than computed on every page load.

##### 8. `client_pt_session_exercises`

Purpose: assigned exercise-level prescription rows for a client session.

Fields:
- `id`
- `client_session_id`
- `exercise_id`
- `exercise_name_snapshot`
- `sort_order`
- `block_label`
- `prescription_type`
- `sets`
- `reps`
- `rep_range_min`
- `rep_range_max`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rest_seconds`
- `tempo`
- `load_guidance`
- `rpe_target`
- `notes`
- `created_at`
- `updated_at`

Notes:
- Snapshotting makes client history resilient to future edits in the coach workout builder.

##### 9. `client_pt_logs`

Purpose: workout-level completion/logging records.

Fields:
- `id`
- `client_session_id`
- `client_id`
- `coach_id`
- `logged_at`
- `completion_status`
- `session_rpe`
- `energy_rating`
- `client_feedback`
- `coach_follow_up_note`
- `created_at`
- `updated_at`

Completion status values:
- `completed`
- `partial`
- `skipped`

##### 10. `client_pt_log_exercises`

Purpose: exercise-level results captured during a logged workout.

Fields:
- `id`
- `pt_log_id`
- `client_session_exercise_id`
- `exercise_id`
- `exercise_name_snapshot`
- `set_number`
- `target_reps`
- `completed_reps`
- `weight_value`
- `weight_unit`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rpe`
- `notes`
- `created_at`
- `updated_at`

Notes:
- V1 can start with one row per performed set if needed.
- If a lighter V1 is required, we can collapse this to one row per exercise and add set-level granularity later, but the preferred contract is set-level.

#### Google Sheets Structure

The PT Core managed-sheet structure should be split into coach-scoped PT tabs and client-scoped PT tabs.

##### Coach Workspace PT Tabs

###### Tab: `PT_Exercises`

Purpose: mirror the coach exercise library.

Columns:
- `exercise_id`
- `name`
- `category`
- `movement_pattern`
- `primary_muscles`
- `secondary_muscles`
- `equipment`
- `difficulty`
- `default_units`
- `description`
- `coaching_notes`
- `demo_url`
- `is_archived`
- `updated_at`

###### Tab: `PT_Workouts`

Purpose: workout definitions.

Columns:
- `workout_id`
- `name`
- `description`
- `goal`
- `estimated_duration_minutes`
- `difficulty`
- `is_template`
- `is_archived`
- `updated_at`

###### Tab: `PT_Workout_Exercises`

Purpose: ordered exercise rows for each workout.

Columns:
- `workout_exercise_id`
- `workout_id`
- `workout_name`
- `sort_order`
- `block_label`
- `exercise_id`
- `exercise_name`
- `prescription_type`
- `sets`
- `reps`
- `rep_range_min`
- `rep_range_max`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rest_seconds`
- `tempo`
- `load_guidance`
- `rpe_target`
- `notes`
- `updated_at`

###### Tab: `PT_Programs`

Purpose: reusable program headers.

Columns:
- `program_id`
- `name`
- `description`
- `goal`
- `duration_weeks`
- `difficulty`
- `is_template`
- `is_archived`
- `updated_at`

###### Tab: `PT_Program_Sessions`

Purpose: reusable sessions inside programs.

Columns:
- `program_session_id`
- `program_id`
- `program_name`
- `week_number`
- `day_number`
- `sort_order`
- `session_name`
- `workout_id`
- `workout_name`
- `focus`
- `notes`
- `updated_at`

##### Client Workspace PT Tabs

###### Tab: `Training_Plan`

Purpose: client-facing assigned session plan.

Columns:
- `client_session_id`
- `assignment_id`
- `program_id`
- `program_name`
- `week_number`
- `day_number`
- `sort_order`
- `session_name`
- `workout_id`
- `workout_name`
- `scheduled_date`
- `status`
- `coach_note`
- `completed_at`
- `updated_at`

###### Tab: `Training_Plan_Exercises`

Purpose: client-facing exercise prescription for each assigned session.

Columns:
- `client_session_exercise_id`
- `client_session_id`
- `session_name`
- `sort_order`
- `block_label`
- `exercise_id`
- `exercise_name`
- `prescription_type`
- `sets`
- `reps`
- `rep_range_min`
- `rep_range_max`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rest_seconds`
- `tempo`
- `load_guidance`
- `rpe_target`
- `notes`
- `updated_at`

###### Tab: `Workout_Log`

Purpose: session-level completion records.

Columns:
- `pt_log_id`
- `client_session_id`
- `assignment_id`
- `program_name`
- `session_name`
- `logged_at`
- `completion_status`
- `session_rpe`
- `energy_rating`
- `client_feedback`
- `coach_follow_up_note`
- `updated_at`

###### Tab: `Workout_Log_Exercises`

Purpose: exercise/set-level performance history.

Columns:
- `pt_log_exercise_id`
- `pt_log_id`
- `client_session_id`
- `client_session_exercise_id`
- `exercise_id`
- `exercise_name`
- `set_number`
- `target_reps`
- `completed_reps`
- `weight_value`
- `weight_unit`
- `duration_seconds`
- `distance_value`
- `distance_unit`
- `rpe`
- `notes`
- `logged_at`

###### Optional Tab Later: `PT_Overview`

Purpose: coach-readable summary/helper sheet if needed later.

Note:
- Do not make this a V1 dependency.
- It can be derived later if the coach needs a summary tab for direct-in-Sheets review.

#### Sync Ownership and Flow

##### Coach-scoped writes

The app should write these tabs when the coach edits PT library/builder data:
- `PT_Exercises`
- `PT_Workouts`
- `PT_Workout_Exercises`
- `PT_Programs`
- `PT_Program_Sessions`

##### Client-scoped writes

The app should write these tabs when a program is assigned or a client logs work:
- `Training_Plan`
- `Training_Plan_Exercises`
- `Workout_Log`
- `Workout_Log_Exercises`

##### Assignment flow

When a coach assigns a program to a client:
1. Create `client_pt_program_assignments`.
2. Expand reusable program sessions into concrete `client_pt_sessions`.
3. Expand workout exercises into `client_pt_session_exercises`.
4. Write the resulting assigned plan into `Training_Plan` and `Training_Plan_Exercises`.

##### Logging flow

When a client logs a workout:
1. Update the assigned session row status.
2. Create `client_pt_logs`.
3. Create `client_pt_log_exercises`.
4. Write log data into `Workout_Log` and `Workout_Log_Exercises`.
5. Update assignment rollup fields such as `last_session_completed_at`, `completed_sessions_count`, and `adherence_percent`.

#### App Surface Ownership

##### Workspace-level PT surfaces

- `Exercises`
- `Workouts`
- `Programs`

These should live in coach-scoped module surfaces, not inside a specific client workspace.

##### Client workspace PT surfaces

- `Training Plan`
- `Workout History`
- `Coach PT Overview`

These should live inside `/admin/clients/[id]` and/or the equivalent client-facing portal areas because they depend on a specific client assignment and log history.

#### V1 Read/Write Priorities

V1 should support these critical loops only:
- coach creates exercises
- coach creates workouts from exercises
- coach creates programs from workouts
- coach assigns a program to a client
- client views the assigned training plan
- client logs completed workout results
- coach reviews adherence and recent training context

V1 should not require:
- drag-and-drop builder
- supersets/circuits as a hard requirement
- auto-progression engine
- advanced analytics
- periodisation automation

#### V1 Open Questions To Resolve During Implementation

- Whether set-level logging ships immediately or starts with one row per exercise for speed
- Whether `scheduled_date` is required per assigned session in V1 or whether week/day structure alone is enough
- Whether a coach can run multiple simultaneous active PT assignments for one client in V1
- Whether PT notes belong in the same client workbook tabs or remain app-only in the first pass

Default implementation assumptions unless overridden:
- set-level logging is preferred but can be simplified if it blocks delivery
- assigned sessions should support optional `scheduled_date`
- one primary active PT assignment per client in V1
- PT notes can live in workbook-backed structures where they affect delivery/review

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
| 2026-04-08 | Drive hierarchy foundation landed for managed Google files. Coaches now provision a coach-owned workspace root with a control workbook, coach-private library workbook(s) only for supported active modules, a dedicated `Clients` folder, and per-client folders/workbooks provisioned at invite acceptance; workbook sharing is scoped to the individual client workbook rather than the whole workspace. |
| 2026-04-09 | Build-direction clarification: `PLATFORM_RESEARCH.md` is the planning document for what comes next, `SPEC.md` describes current implemented product state, and `CHAMELEON_BRAND_TODO.md` tracks built slices that still need validation/hardening. |
| 2026-04-09 | Next module priority is to deepen the two active foundations rather than add another core. PT Core is the next primary build slice and should expand from exercise library into workout builder, programs/templates, client training plan delivery, workout logging, and coach review tooling. |
| 2026-04-09 | PT Core should be the first complete proof of the module architecture: coach-scoped build tools and libraries at workspace level, client-scoped assigned plans and logging inside client workspaces, with the managed Google Sheets structure kept clear enough to operate directly in Sheets as well as through the app. |
| 2026-04-09 | Phase 2A module backbone is now live in app: coach type remains the preset, active modules drive admin/client navigation and portal visibility, and PT surfaces are hidden when PT Core is disabled except for intentional legacy workspace handling. |
| 2026-04-09 | PT Core V1 now includes workout authoring, reusable programs, client assignment materialisation, client training delivery, workout logging, coach-side training review in the client workspace, and managed PT tab sync into provisioned Google workbooks where workbook links exist. |
| 2026-04-09 | PT data remains database-led for identity, relationships, and permissions; Google Sheets now mirrors the PT operational tabs, but the next hardening pass should focus on proving sync reliability on real provisioned workspaces and older pre-PT client workbooks. |
| 2026-04-09 | Requests is now a real shared product surface rather than a feedback inbox: coaches and clients can submit requests, vote, comment, follow progress, and see visible statuses; internal moderation can update status, link duplicates, and grant contributor rewards such as credit, trial time, or module access. |
| 2026-04-09 | Focused nutrition competitor R&D confirmed that the sticky nutrition loop is delivery + logging + habits/check-ins + coach review, not just static meal-plan editing. Nutrition Core should therefore deepen from the current meal-plan surface into coach-side libraries/templates first, then client accountability and review. |
| 2026-04-09 | Coach payments now include a dedicated `/admin/payments` area for Stripe Connect onboarding, hosted invoice creation, and invoice status tracking. This is implemented product scope, but live end-to-end validation remains a release-hardening task rather than a completed validation milestone. |
| 2026-04-09 | Nutrition Core now includes client-side habit logging, weekly check-ins, nutrition logs, and an initial coach review layer in client workspaces. Remaining Nutrition Core work is now primarily hardening and review polish rather than missing the accountability loop entirely. |
| 2026-04-09 | All approved coach-type niches are now intentionally visible in onboarding and the Modules workspace as positioning lanes. Only built bundles are real entitlements; future lanes remain clearly marked `Coming soon` until their module contract and starter slice are implemented. |
| 2026-04-09 | Wellness Coach is now the next niche-definition candidate after PT Core and Nutrition Core hardening. Its starter slice should center on goals, check-ins, habits, session notes, appointments, and Google Sheets sync before adding messaging, community, CRM, or AI layers. |
