# Chameleon Coach — Current Product Spec

**Status:** documentation sync to reflect the current app state as of 2026-04-08.
**Purpose:** describe the product that now exists, not the original single-coach prototype plan.

---

## Product Framing

Chameleon Coach is a coach platform built around a workflow many coaches already run in Google Sheets.
It replaces messy shared-sheet access with a proper client portal, while keeping coach-owned data and lightweight white-labeling.

This app is still being shaped as the Phase 1 MVP for early outreach, but it is no longer just a one-off G-Fitness prototype.

---

## Branding

| Property | Current State |
|----------|---------------|
| Platform name | Chameleon Coach |
| Public default identity | Chameleon Coach |
| White-label model | Coach branding can override client-facing title, logo, colours, and welcome text |
| Lower-tier platform visibility | `Powered by Chameleon Coach` remains the default |
| Default colours | Current black/pink palette remains a temporary platform fallback |
| Default logo | No final platform logo approved yet |

---

## Stack

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend + API routes | Next.js on Vercel | App Router implementation |
| Database + Auth | Supabase | Multi-coach + client auth model |
| Google Sheets integration | Google Sheets API via Next.js routes | One Sheet per client |
| Google Calendar sync | Google Calendar API | Used in appointment confirmation flow |
| Email | Resend | Invite + appointment + payment-request emails |
| Payments | Stripe | Coach subscription billing + appointment-level per-session checkout flow |

---

## Users

| Type | Access | How they get in |
|------|--------|----------------|
| Coach | Own workspace only — clients, invites, appointments, billing, branding, Google connection | Self-registers via coach sign-up |
| Client | Own portal only — dashboard, meal plan, progress, profile, appointments, onboarding | Invited by a coach via email |

Multi-coach architecture is now part of the current product. The old single-admin assumption is obsolete.

---

## Core Phase 1 Capabilities

### Google Sheets

- Each coach connects their own Google account
- Each client gets one Google Sheet created from the platform template
- Meal plans are read from the client Sheet
- Progress entries are appended back to the client Sheet

### Appointments

- Coaches can create appointments directly
- Clients can request appointments
- Coaches can publish visible slots for client requests
- Coaches can confirm or decline appointment requests
- Confirmed appointments sync to Google Calendar
- Appointment emails are sent through Resend

### Billing

- Coach subscription billing exists on Stripe
- Per-session appointment billing is implemented in code for confirmed appointments
- Coaches can send a payment request for a confirmed appointment
- A one-time Stripe Checkout session is created per appointment
- Payment success/failure is written back to the appointment via Stripe webhooks
- Live Stripe end-to-end validation for this appointment billing flow is still pending

### Branding

- Chameleon Coach is the public fallback identity
- Coaches can set brand title, logo, primary colour, accent colour, and welcome text
- Branding is applied to client-facing portal surfaces, invite flow, and onboarding surfaces
- Lower-tier branding keeps `Powered by Chameleon Coach`

---

## Client Journey

```
Coach creates workspace and connects Google
        ↓
Coach invites client by email
        ↓
Client opens invite link and completes onboarding
        ↓
On completion:
  - Supabase client account is created
  - Google Sheet is created in the coach's Drive
  - Profile tab is pre-filled with onboarding data
        ↓
Client logs in to a branded portal
        ↓
Client can view meal plan, log progress, manage appointments, and pay for confirmed sessions when requested
```

---

## Current Client-Facing Pages

| Page | Description |
|------|-------------|
| `/` | Public landing page for Chameleon Coach |
| `/login` | Login for coaches and clients |
| `/register` | Client/self-serve account creation surface |
| `/register/coach` | Coach workspace registration |
| `/onboarding` | Invite-led onboarding flow |
| `/dashboard` | Client dashboard with branding, meals, progress summary |
| `/meal-plan` | Client meal plan view sourced from Google Sheets |
| `/progress` | Client progress logging + history |
| `/appointments` | Client appointment requests, confirmed sessions, and payment CTA for unpaid confirmed appointments |
| `/profile` | Client profile details |

## Current Coach Pages

| Page | Description |
|------|-------------|
| `/admin` | Coach dashboard |
| `/admin/clients/[id]` | Client detail view |
| `/admin/invite` | Invite management |
| `/admin/settings` | Google connection + lightweight branding settings |
| `/admin/appointments` | Appointment management, slots, confirmation/decline, payment request action |
| `/admin/billing` | Coach subscription billing status and portal actions |
| `/admin/exercises` | Coach exercise library management for future PT programming |

---

## Key Behaviours

- Meal plan reads are live from the client's Google Sheet
- Progress submissions write back to Sheets
- Invite links expire after 7 days and can be resent
- Coach branding overrides client-facing surfaces where set
- Fallback public identity is Chameleon Coach when coach branding is unset
- Confirming an appointment triggers Google Calendar sync when the appointment has the required data
- Appointment payment state is stored on the appointment record
- Stripe webhooks update subscription and appointment payment state
- Coaches can create, edit, search, and filter their own exercise library records
- Mobile responsiveness remains a core requirement across client surfaces

---

## Current Out of Scope

- Stripe Connect or coach payout architecture
- Packages or bundles
- Refund workflows
- Saved client cards / off-session charging
- Invoicing system
- Reporting dashboards for appointment revenue
- In-app messaging between coach and client
- Phase 2 PT builder features such as drag-and-drop workouts and program scheduling

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_COACH_PRICE_ID=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_PLATFORM_NAME=
```

`NEXT_PUBLIC_PLATFORM_NAME` now defaults to `Chameleon Coach` in code when unset.

---

## Historical Context

- This product started as a friend/client prototype for Eliot under the G-Fitness name.
- That original framing is now superseded by the multi-coach Chameleon Coach platform direction.
- Historical references to G-Fitness are useful only when reading older notes or migrations.
