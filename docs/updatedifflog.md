# Chameleon Coach Diff Log

## Cycle Summary

- Production deploy completed for the current PT Core V1 app build.
- Module backbone is now live end to end for coach/client navigation and portal visibility.
- PT Core V1 now covers workout authoring, programs, assignment materialisation, client training delivery, workout logging, coach review context, and managed PT tab sync into linked Google workbooks.
- Documentation was updated after deployment so planning, current product state, and remaining validation tasks stay aligned.

## Files Changed

- `src/lib/google/sheets.ts`
- `src/lib/pt.ts`
- `src/app/api/admin/exercises/route.ts`
- `src/app/api/admin/exercises/[id]/route.ts`
- `PLATFORM_RESEARCH.md`
- `SPEC.md`
- `CHAMELEON_BRAND_TODO.md`
- `updatedifflog.md`

## Root Cause / Implementation Rationale

- The previous PT Core slice provisioned the right PT tabs in Google workbooks, but the app still treated Supabase as the only operational store during PT CRUD, assignment, and workout logging actions.
- This pass extends the existing Google helper layer instead of inventing a separate sync system.
- PT workbook sync is best-effort and safe: if a managed workbook is not linked yet, app behavior continues instead of failing the user-facing flow.
- Unrelated pre-existing dirty files remain untouched:
  - `package.json`
  - `package-lock.json`

## Verification Evidence

### Deployment

- Explicit production deploy completed through Vercel CLI.
- Deployment id: `dpl_J86SkziPnEvFj1LiMTWTUtQC92ms`
- Production alias: `https://g-fitness-eight.vercel.app`

### Static correctness

- `npx tsc --noEmit`
  - still noisy because `tsconfig.json` includes stale `.next/types/**/*.ts` paths before those generated files exist
- `npm run build`
  - passed locally after the PT Sheets sync pass
  - passed again in Vercel production build

### Behavioral evidence

- Production build includes:
  - `/admin/exercises`
  - `/admin/workouts`
  - `/admin/programs`
  - `/training`
  - PT admin/client API routes
- PT Google sync paths now run after:
  - exercise create/update
  - workout create/update
  - program create/update
  - client PT assignment
  - client workout log submission

## Open Risks

- PT sync still needs real-workspace validation against live connected Google accounts and actual provisioned workbooks.
- Older client workbooks created before PT tabs existed may need reprovisioning or a recovery path before PT sync can populate them cleanly.
- The app remains database-led for PT identity and permissions; Sheets mirror the operational rows but are not yet proven under all live edge cases.
- `npx tsc --noEmit` remains non-authoritative until the repo’s `.next/types` include behavior is cleaned up.

## Next Step

- Julius tests the deployed build on `https://g-fitness-eight.vercel.app`.
- Validate PT authoring, assignment, and logging on a real coach workspace with Google connected.
- If live PT workbook sync behaves correctly, the next implementation pass should focus on workbook backfill/recovery for older client sheets and QA hardening rather than widening scope.
