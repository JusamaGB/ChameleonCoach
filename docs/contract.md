# Chameleon Coach Contract

## Coach Data Ownership and No-Lock-In Contract

This contract defines the build standard for Chameleon Coach modules.

### Core principle

Operational coaching data belongs to the coach and client.

Chameleon may provide workflow, permissions, automation, and convenience, but it must not become the only place where meaningful coaching work exists.

### No-lock-in rule

If a coach stops using Chameleon, they should still be able to continue working with their clients from the Google Drive workspace and Google Sheets structures created during use of the platform.

This means:

- coach-owned reusable module data must exist in coach-owned Google assets
- client-specific delivery data must exist in each client's workbook
- client feedback and logging data must exist in each client's workbook
- the sheet structures must be readable and usable without the Chameleon app

### What may remain app-owned

The platform database may remain the owner of app-specific metadata, including:

- authentication data
- billing state
- permissions and access control
- internal identifiers
- sync metadata
- platform-only relationship metadata
- UI and workflow state that does not block coach/client continuity

### Module completion standard

A module is not considered complete unless:

1. coach-created operational data is mirrored into coach-owned Google structures
2. client-assigned operational data is mirrored into client-owned workbook structures
3. client-entered feedback or logging is mirrored into client-owned workbook structures
4. the resulting workbook tabs are readable enough for manual continuation outside the app
5. leaving the app does not trap the coach's live service data behind Chameleon-only interfaces

### PT Core interpretation

For PT Core, the contract means:

- reusable exercises, workouts, and programs belong in the coach PT library workbook
- assigned sessions and assigned session exercises belong in the client workbook
- workout logs and logged exercise performance belong in the client workbook
- coach notes and progression context that affect delivery should also be present in workbook-backed PT tabs

### Nutrition Core interpretation

For Nutrition Core, the same standard will apply:

- coach nutrition libraries and templates must live in coach-owned Google structures
- client meal-plan delivery must live in client workbook structures
- client nutrition feedback and tracking must live in client workbook structures where relevant

### Wellness Core interpretation

For Wellness Core, the same standard now applies:

- coach wellness goals and wellness habit templates live in a coach-owned wellness library workbook
- client wellness goals, client wellness habits, client habit logs, client weekly check-ins, and coach session notes live in the client workbook
- app-only state can still own permissions, internal IDs, and sync metadata, but the operational coaching record must remain usable in Google Sheets

### Build rule for future modules

Every new module should define, before implementation:

1. coach-owned operational data
2. client-owned operational data
3. app-only metadata
4. Google tab structure
5. no-lock-in continuation path

### Practical standard

If Chameleon disappeared tomorrow, the coach should still retain enough structured Google-based data to keep serving clients manually.
