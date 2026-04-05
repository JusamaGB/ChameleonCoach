# G-Fitness — Build Spec

**Client:** Eliot (friend/first portfolio client)
**Purpose:** Client management portal for a dietary/fitness coaching business.
Replaces Google Sheets shared links with a proper client-facing website.
This build is also the demo piece for cold outreach to the health/fitness niche.

---

## Branding

| Property | Value |
|----------|-------|
| Name | G-Fitness |
| Colours | Black + pink |
| Logo | Placeholder — Eliot to supply |

---

## Stack

| Layer | Service | Cost |
|-------|---------|------|
| Frontend + API routes | Next.js on Vercel | Free tier |
| Database + Auth | Supabase | Free tier |
| Google Sheets integration | Google Sheets API via Next.js API routes | Free |
| Invite emails | Resend | Free tier (100/day) |

No self-hosted server. Everything deploys to Vercel. Nothing runs on a local machine.

---

## Users

| Type | Access | How they get in |
|------|--------|----------------|
| Admin | Full — client management, invite system, Google account | Single account, set up on first run |
| Client | Own profile only — meal plan, progress, onboarding | Invited by Eliot via email, self-service sign-up |

---

## Google Sheets Integration

- Eliot connects his Google account once via OAuth on first admin login
- App reads/writes his Google Drive via the Sheets API (gspread or googleapis)
- **One file per client**, created automatically when a client completes onboarding
- All new client files are created from a standard template
- Eliot manages meal plans in Google Sheets exactly as he does now — the portal reflects changes live

### Standard sheet template (3 tabs)

**Profile tab**
| Field | Notes |
|-------|-------|
| Name | |
| Email | |
| Age | |
| Gender | |
| Height | |
| Current weight | |
| Goal weight | |
| Fitness goals | |
| Dietary restrictions | |
| Health conditions | |
| Activity level | |
| Notes for Eliot | |

**Meal Plan tab**
Weekly grid: rows = Mon–Sun, columns = Breakfast / Lunch / Dinner / Snacks
Eliot fills this in. Portal reads and displays it.

**Progress tab**
Append-only log: Date | Weight | Measurements | Notes
Clients write to this tab via the portal progress log.

---

## Client Journey

```
Eliot enters client email in admin panel
        ↓
Invite email sent via Resend (unique sign-up link, expires 7 days)
        ↓
Client clicks link → guided onboarding questionnaire
        ↓
On completion:
  - Supabase account created
  - Google Sheet created from template in Eliot's Drive
  - Profile tab pre-filled with onboarding answers
        ↓
Client logs in → portal
```

### Onboarding questionnaire fields

1. Full name
2. Age
3. Gender
4. Height
5. Current weight
6. Goal weight
7. Fitness goals (free text)
8. Dietary restrictions (checkboxes + free text)
9. Health conditions or injuries (free text)
10. Activity level (sedentary / lightly active / moderately active / very active)
11. Anything else Eliot should know (free text)

---

## Pages

### Client-facing

| Page | Description |
|------|-------------|
| `/login` | Email + password login. "Forgot password" via Supabase Auth |
| `/onboarding` | Multi-step guided questionnaire (invite link lands here for new clients) |
| `/dashboard` | Today's meals highlighted, quick progress log widget |
| `/meal-plan` | Full weekly plan pulled live from their Google Sheet. Mobile-friendly table/card view |
| `/progress` | Log weight + measurements + notes. View history as simple chart |
| `/profile` | View their onboarding details. Edit basic info |

### Admin (Eliot)

| Page | Description |
|------|-------------|
| `/admin` | Dashboard — client list, recent sign-ups, pending invites |
| `/admin/clients/[id]` | Individual client — profile data, meal plan preview, progress history, invite status |
| `/admin/invite` | Enter email → send invite |
| `/admin/settings` | Google account connection status + reconnect |

---

## Key behaviours

- **Meal plan updates instantly** — Eliot edits the sheet, client refreshes the portal, sees the change. No sync delay required (direct API read on page load).
- **Progress writes to Sheets** — client logs progress in portal → appended to their Progress tab in real time.
- **Invite links expire** — 7 days. Eliot can resend from the admin panel.
- **Mobile + desktop** — responsive throughout. Clients will primarily use mobile.
- **Single admin** — no multi-user admin in v1.

---

## Out of scope (v1)

- Payment processing
- In-app messaging between Eliot and clients
- Multiple admin accounts
- Automated meal plan generation (Eliot writes plans manually)
- Push notifications
- Client-to-client features

---

## Environment variables needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
RESEND_API_KEY=
ADMIN_EMAIL=
```

---

## Notes

- This is the **portfolio demo** for cold outreach to health/fitness operators. Once delivered, Velcom uses it as proof in cold emails. Keep it clean and presentable.
- Eliot's existing clients can be migrated manually — create their sheet, fill in their profile, invite them to sign up. No bulk import required in v1.
- Logo: use a black/pink placeholder with "G" initial until Eliot supplies the real asset.
