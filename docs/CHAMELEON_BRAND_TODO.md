# Chameleon Coach Brand Defaults TODO

Purpose: capture the unresolved default-brand decisions for the new Chameleon Coach direction without blocking the current branding V1 slice.

Status:
- Platform name is now **Chameleon Coach**
- Branding persistence and V1 brand fields exist in the product
- Default brand choices are intentionally still undecided

## Open Decisions

- Default logo
  - No approved logo yet
  - V1 currently supports `brand_logo_url`, but this can stay empty until a logo exists

- Default public/app URL
  - No final production URL or domain strategy chosen yet
  - Custom domains are out of scope for this V1 branding slice

- Default color system
  - No approved default primary color yet
  - No approved default accent color yet
  - Current implementation should be treated as temporary defaults only

- Default welcome text
  - No final platform-level welcome text approved yet
  - Current implementation copy should be treated as placeholder copy

- Default powered-by behavior
  - `show_powered_by` exists and currently defaults to `true`
  - Need final product decision on whether this remains the platform default for all newly created coach settings rows

## Recommended Next Decisions

1. Approve a temporary default primary color and accent color for Chameleon Coach.
2. Approve temporary placeholder welcome text for the platform default.
3. Decide whether the default `show_powered_by=true` behavior should remain for launch.
4. Decide whether to use a text-only brand treatment until a logo exists, or create a temporary placeholder logo.
5. Decide the intended default production domain naming direction, even if custom domains ship later.

## Implementation Note

- No further code change is required just to leave these defaults undecided.
- The current V1 branding flow can continue using temporary fallback values until brand defaults are formally approved.

## Functional Follow-Ups

1. Run the payments end-to-end validation pass.
   - Execute the full Stripe test-mode pass for both appointment billing and coach invoices.
   - Cover the full flow from payment/invoice creation through hosted Stripe completion and webhook-driven status updates.
   - Record any gaps in recovery UX, state reconciliation, or webhook handling before treating payments as release-ready.
   - Treat this as the immediate next hardening step because the code is live but validation is still outstanding.
2. Verify and harden the full post-onboarding client workspace handoff.
   - Confirm onboarding completion creates the client folder and workbook in the coach-owned `Clients` hierarchy.
   - Confirm the workbook is shared to the invited client email successfully.
   - Confirm `Sheet pending` flips to a linked/usable state and both coach/client views become operational after onboarding.
   - Add clearer failure handling if workbook creation, sharing, or sheet reads fail late in the flow.
   - Run a full real-account end-to-end validation from invite send -> invite accept -> client auth creation -> workbook provisioning -> workbook sharing -> first successful coach/client workspace load.
   - Run a deliberate failure-and-repair pass to confirm the new `Repair workspace` action recovers an incomplete or broken client workspace cleanly.
   - Do not treat onboarding/workspace handoff as complete until one successful live pass and one failure-recovery pass have both been verified.
3. Verify the new PT Core managed-workbook behavior on real provisioned workspaces.
   - Confirm coach PT library workbooks receive `PT_Exercises`, `PT_Workouts`, `PT_Workout_Exercises`, `PT_Programs`, and `PT_Program_Sessions` updates after PT CRUD actions.
   - Confirm client workbooks receive `Training_Plan`, `Training_Plan_Exercises`, `Workout_Log`, and `Workout_Log_Exercises` updates after assignment and workout logging.
   - Confirm older client workbooks created before the PT tabs existed are either reprovisioned safely or handled with a clear recovery path.
4. Validate and harden Stripe appointment billing end to end.
   - Run the full Stripe test-mode flow for a confirmed appointment payment request.
   - Confirm successful Checkout updates appointment `payment_status` to `paid`.
   - Confirm expired or failed payments update appointment `payment_status` to `payment_failed`.
   - Confirm webhook retries are idempotent and do not corrupt payment state.
   - Add any missing reconciliation or recovery UX discovered during live validation.
   - Treat this as the next implementation slice because billing is implemented in code but still not release-complete until end-to-end validation passes.
5. Validate and harden coach payments and invoicing end to end.
   - Run a full Stripe Connect onboarding pass for a coach from `/admin/payments`.
   - Confirm connected account status sync updates `onboarding_completed`, `charges_enabled`, and `payouts_enabled` correctly in app.
   - Create and send a real test invoice from a coach to a client through the new Payments area.
   - Confirm the Stripe hosted invoice page opens correctly and the client can complete payment in test mode.
   - Confirm connected-account webhook events update invoice status correctly for at least `invoice.sent`, `invoice.paid`, and `invoice.voided`.
   - Confirm the new payments flow stays clearly separate from platform billing in `/admin/billing`.
   - Add any missing resend, recovery, or status UX discovered during end-to-end testing before treating coach payments as release-ready.
6. Move to the next build-documents slice: Nutrition Core completion and hardening.
   - Validate the nutrition flow end to end on real provisioned workspaces, including workbook sync after client habit logs, check-ins, and nutrition logs.
   - Confirm the new coach review signals and habit-log follow-up notes hold up under real usage and make any UX adjustments they expose.
   - Verify managed-sheet reliability, read/write consistency, and end-to-end onboarding validation for Nutrition Core.
   - Keep this aligned with `NUTRITION_CORE_PLAN.md`, where Nutrition Core is now functionally complete for the accountability loop but still thinner than PT Core and still needs live hardening.
7. Run the first Wellness Core live hardening pass.
   - Verify Wellness Core library workbook creation for goal and habit templates on real provisioned workspaces.
   - Verify client workbook sync for wellness goals, wellness habits, wellness habit logs, wellness check-ins, and coach session notes.
   - Confirm the new coach-side Wellness section inside client workspaces is usable in live end-to-end flows.
   - Confirm the client portal wellness surface works cleanly for habit logging and weekly check-ins after bundle activation.
