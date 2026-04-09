# Nutrition Core Plan

## Current State vs Target

### What exists now

- client meal plan view
- coach meal plan editor inside client workspace
- client workbook `Meal Plan` tab
- coach recipe library
- reusable meal-plan templates
- nutrition habit template library
- nutrition library workbook sync
- module-layer nutrition tool links
- client-workspace template application using coach-owned nutrition templates
- client nutrition habit assignment flow
- client habit logging surface
- client nutrition check-in surface
- client nutrition notes / log surface
- coach-side nutrition adherence and review context inside client workspaces
- coach-side follow-up radar for missed habits, off-plan logs, and stale/low-signal check-ins
- coach notes on habit logs inside the client workspace review flow
- nutrition input validation and duplicate same-day habit-log protection in the write layer
- client workbook tabs for `Nutrition_Habits`, `Nutrition_Habit_Log`, `Nutrition_Check_Ins`, and `Nutrition_Log`

### What is still missing

- more end-to-end validation and hardening across onboarding, workbook sync, and client usage
- final coach-side review polish after live usage feedback

Nutrition Core is still materially thinner than PT Core.

---

## Nutrition Core Build Phases

## Phase 1: Coach Nutrition Foundation

Goal:

- create coach-owned nutrition assets at the workspace level

Deliver:

- recipe library
- reusable meal-plan templates
- nutrition library workbook sync
- module-layer tool access from `Modules`

## Phase 2: Client Nutrition Assignment

Goal:

- apply coach nutrition templates into client-specific delivery

Deliver:

- apply template to client meal plan
- coach-side client nutrition assignment flow
- nutrition template usage inside client workspace
- initial client nutrition habit assignment in client workspace

## Phase 3: Nutrition Accountability Loop

Goal:

- make nutrition a recurring coaching workflow instead of a static plan

Deliver:

- nutrition habits
- nutrition habit logging
- weekly nutrition check-ins
- client nutrition notes/reflections
- nutrition log entries

## Phase 4: Coach Nutrition Review

Goal:

- give coaches a proper nutrition review layer inside client workspaces

Deliver:

- nutrition adherence overview
- recent check-ins
- recent nutrition logs
- coach follow-up context

Status:

- initial coach review layer is now implemented in client workspaces
- the current hardening pass added coach follow-up radar, editable habit-log coach notes, and safer nutrition write validation
- additional polish and validation still remain before this should be treated as fully hardened

---

## Exact V1 Nutrition Core Schema

### Coach-scoped entities

- `nutrition_recipes`
- `nutrition_meal_plan_templates`
- `nutrition_meal_plan_template_days`
- `nutrition_habit_templates`

### Later client-scoped entities

- `client_nutrition_habit_assignments`
- `client_nutrition_habit_logs`
- `client_nutrition_check_ins`
- `client_nutrition_log_entries`

### Coach workbook tabs

- `Recipe Library`
- `Nutrition_Templates`
- `Nutrition_Template_Days`
- `Nutrition_Habit_Templates`

### Client workbook tabs

- `Meal Plan`
- `Nutrition_Habits`
- `Nutrition_Habit_Log`
- `Nutrition_Check_Ins`
- `Nutrition_Log`

---

## Surface Ownership

### Workspace-level nutrition surfaces

- recipe library
- meal-plan templates

### Client-workspace nutrition surfaces

- assigned meal plan
- later habits
- later check-ins
- later nutrition review

This mirrors the PT Core rule:

- coach libraries/build tools at workspace level
- client delivery and review inside client context

---

## First Implementation Slice

The first nutrition slice should deliver:

1. recipe library page
2. recipe CRUD
3. meal-plan template page
4. template CRUD
5. nutrition library workbook sync
6. tool links from the Modules page

Once that exists, Nutrition Core becomes a real coach-side module rather than just a meal sheet editor.
