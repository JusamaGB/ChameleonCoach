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

1. Verify and harden the full post-onboarding client workspace handoff.
   - Confirm onboarding completion creates the client folder and workbook in the coach-owned `Clients` hierarchy.
   - Confirm the workbook is shared to the invited client email successfully.
   - Confirm `Sheet pending` flips to a linked/usable state and both coach/client views become operational after onboarding.
   - Add clearer failure handling if workbook creation, sharing, or sheet reads fail late in the flow.
