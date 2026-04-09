# Chameleon Coach Diff Log

## Cycle Summary

- Cycle focus completed:
  - module-aware coach/client gating foundations
  - PT Core V1 schema + shared types
  - coach-side workouts and programs CRUD surfaces
  - client PT assignment, training page, and workout logging loop
  - PT workbook tab provisioning for managed Google structures
- Release intent:
  - testable app build for Julius to validate locally and via deployed environment

## Files Changed

- `updatedifflog.md`
- `src/app/admin/(dashboard)/clients/[id]/page.tsx`
- `src/app/admin/(dashboard)/layout.tsx`
- `src/app/admin/(dashboard)/programs/page.tsx`
- `src/app/admin/(dashboard)/workouts/page.tsx`
- `src/app/api/admin/clients/[id]/pt-assignment/route.ts`
- `src/app/api/admin/programs/route.ts`
- `src/app/api/admin/programs/[id]/route.ts`
- `src/app/api/admin/workouts/route.ts`
- `src/app/api/admin/workouts/[id]/route.ts`
- `src/app/api/client/portal/route.ts`
- `src/app/api/client/training/route.ts`
- `src/app/appointments/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/meal-plan/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/progress/page.tsx`
- `src/app/training/page.tsx`
- `src/components/admin/client-detail-view.tsx`
- `src/components/admin/programs-manager.tsx`
- `src/components/admin/workout-builder.tsx`
- `src/components/layout/admin-nav.tsx`
- `src/components/layout/client-nav.tsx`
- `src/lib/client-portal.ts`
- `src/lib/google/template.ts`
- `src/lib/modules.ts`
- `src/lib/pt.ts`
- `src/types/index.ts`
- `supabase/migrations/017_pt_core_v1.sql`
- `supabase/schema.sql`

## Minimal-Diff Rationale

- Reused the existing admin CRUD pattern already established by exercises and appointments.
- Reused the existing client workspace model at `/admin/clients/[id]` instead of creating a separate coach-side PT area.
- Reused the existing Google template/helper layer instead of inventing a separate PT sync stack.
- Added PT Core incrementally on top of the existing exercise library rather than replacing that slice.
- Left unrelated pre-existing dirty files untouched:
  - `package.json`
  - `package-lock.json`

## Implementation Notes

### Module Backbone

- Added module-aware feature keys for PT and nutrition entitlements.
- Made admin nav hide PT surfaces when PT Core is not enabled.
- Made client nav and client portal context entitlement-aware.
- Meal plan portal access now follows `nutrition_core`.
- Training portal access now follows `pt_core`.

### PT Core

- Added PT schema tables for:
  - workouts
  - workout exercises
  - programs
  - program sessions
  - client assignments
  - client sessions
  - client session exercises
  - workout logs
  - log exercises
- Added coach CRUD APIs and pages for workouts and programs.
- Added client assignment API.
- Added client training API and `/training` page.
- Added coach PT overview + assignment form inside the client workspace.

### Managed Sheets

- PT coach library workbook now provisions:
  - `PT_Exercises`
  - `PT_Workouts`
  - `PT_Workout_Exercises`
  - `PT_Programs`
  - `PT_Program_Sessions`
- Client workbook now provisions PT tabs when PT Core is active:
  - `Training_Plan`
  - `Training_Plan_Exercises`
  - `Workout_Log`
  - `Workout_Log_Exercises`

## Verification Evidence

### Static correctness

- `npx tsc --noEmit`
  - not used as the final authority because this repo’s `tsconfig.json` includes stale `.next/types/**/*.ts` entries that fail before build-generated types exist
- `npm run build`
  - passed successfully after fixing:
    - `src/app/training/page.tsx` typo
    - missing form imports in `src/components/admin/client-detail-view.tsx`
    - strict typing issues in `src/lib/pt.ts`

### Runtime / release evidence

- Production build completed successfully and included the new routes:
  - `/admin/workouts`
  - `/admin/programs`
  - `/training`
  - `/api/admin/workouts`
  - `/api/admin/programs`
  - `/api/admin/clients/[id]/pt-assignment`
  - `/api/client/portal`
  - `/api/client/training`

## Known Risks

- PT Google tab provisioning is implemented, but full row-level PT Sheets sync for workouts/programs/assignments/logs is not yet mirrored from every CRUD/action path; the workbook structure is ready, but the app still treats the database as the primary live store for PT V1 behavior.
- Existing live client workbooks created before this cycle will not automatically gain new PT tabs unless the provisioning/re-provisioning path is rerun.
- `npx tsc --noEmit` remains noisy because of the repo’s current `.next/types` include behavior.
- Nutrition flows were preserved, but the meal-plan portal is now intentionally tied to `nutrition_core`, which may change the experience for coaches who disable that module on non-legacy workspaces.

## Next Step

- Commit only the intended PT/module files.
- Push `main` to trigger the existing GitHub Actions Vercel deployment.
- Julius tests the deployed build plus local migration/application behavior.
