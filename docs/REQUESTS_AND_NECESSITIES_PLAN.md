# Requests and Necessities Page Plan

## Purpose

This document defines the full product plan for a Chameleon Coach `Requests` or `Necessities` feature.

The goal is not to create a dead-end feedback form. The goal is to create a visible, interactive, high-trust request system that:

- gives coaches and clients a meaningful voice in the platform
- helps Chameleon prioritise the right module and feature work
- rewards the people who help shape the platform
- strengthens retention by making contributors feel seen, valued, and invested

This should be treated as a real product surface, not a support inbox.

---

## Core Product Idea

Chameleon should offer a shared request space where coaches can submit needs, attach real-world context, vote on other requests, and track the lifecycle of those requests from submission through release.

Clients may also generate demand, but the platform should remain coach-led in how it interprets and prioritises requests.

The best framing is:

`Community-powered roadmap input with visible status, weighted demand, and contributor rewards.`

---

## Main Outcomes

### Value for coaches

- coaches can ask for the exact things they need
- coaches can see that others need the same workflows
- coaches can help prioritise the roadmap
- coaches can gain recognition and rewards for high-value contributions
- coaches feel they are helping shape a platform built around their needs

### Value for clients

- clients can surface friction points that affect their coaching experience
- clients can help their coach advocate for useful improvements
- clients feel their experience matters, even if coach-led moderation stays in place

### Value for Chameleon

- better roadmap signal than ad hoc messages
- clearer prioritisation across PT, Nutrition, client portal, billing, platform tooling, and future modules
- less duplicate feedback
- better language for real-world problems and use cases
- stronger retention through participation, transparency, and reward loops

---

## Product Principles

### 1. The board must feel alive

Users should not feel like they are submitting ideas into a void.

Every request should have:

- visible vote count
- visible status
- visible module / niche tags
- visible discussion or supporting context
- clear signals that requests are reviewed and acted on

### 2. Requests must describe a problem, not just a feature

The board should encourage:

- what the user needs
- why they need it
- who it affects
- what workflow it supports

This creates much better roadmap input than one-line feature titles.

### 3. Duplicate demand should be consolidated

The same need should not fragment into ten weak requests. The product should eventually support merging duplicates into one stronger canonical request.

### 4. Contribution should be rewarded

If a coach materially helps improve the platform, that contribution should be acknowledged in ways that feel concrete, not symbolic only.

### 5. Visibility must be balanced with moderation

The board should feel open, but quality must stay high enough that the requests surface remains useful instead of chaotic.

---

## Naming Direction

Potential names:

- Requests
- Necessities
- Roadmap Requests
- Community Requests
- Product Requests

Recommended working label:

`Requests`

Reason:

- shortest and clearest
- easy to understand in navigation
- broad enough to include features, modules, improvements, and workflow needs

`Necessities` can still be used in copy and tone, for example:

`Submit a request or highlight a coaching necessity.`

---

## User Roles

### Coaches

Coaches should be able to:

- create requests
- vote on requests
- comment with use cases
- follow requests
- tag urgency and affected module
- see status and reward outcomes

Coaches should be the primary signal owners.

### Clients

Clients may be allowed to:

- submit requests through a lighter flow
- vote on visible requests
- support coach-led requests with usage context

But client participation should not outweigh coach signal in prioritisation.

### Chameleon team/admin

Internal product admins should be able to:

- review new requests
- merge duplicates
- edit tags
- change status
- add public reasoning notes
- mark implemented requests
- issue rewards

---

## Feature Scope

## Request Object

Each request should ideally include:

- title
- problem statement
- desired outcome
- requester role
- linked coach account
- linked client account when relevant
- module area
- feature area
- niche / audience tag
- urgency level
- votes
- followers
- comments
- status
- duplicate-of reference
- reward eligibility state
- implementation outcome note

---

## Taxonomy

### Module tags

- PT Core
- Nutrition Core
- Shared Core
- Client Portal
- Billing
- Appointments
- Branding
- Reporting
- Future Module

### Niche / audience tags

- Personal Training
- Nutrition Coaching
- Hybrid Coach
- Sports Performance
- Rehab / Corrective
- Weight Loss
- Strength and Hypertrophy
- Endurance
- Studio / Gym
- Group Coaching
- General

### Urgency tags

- Nice to Have
- Important
- High Impact
- Blocking

### Request type tags

- New Feature
- Module Expansion
- Workflow Improvement
- UX Improvement
- Bug / Friction
- Integration
- Data / Reporting

---

## Voting and Prioritisation

The board should not rely on raw vote count alone.

### Base public signal

Users should see:

- total votes
- number of supporters
- role mix where useful, such as coach-led vs client-led support

### Internal prioritisation signal

Chameleon can internally weight requests using:

- coach votes
- client votes
- urgency
- number of affected niches
- strategic module relevance
- retention or revenue relevance
- implementation complexity

Publicly, the board should remain simple. Internally, prioritisation can be smarter.

### Suggested public sorting options

- Most Voted
- Newest
- Trending
- Most Urgent
- Recently Updated
- Planned
- Released

---

## Status Model

Every request should have a visible status.

Recommended statuses:

- Submitted
- Under Review
- Gathering Demand
- Planned
- In Design
- In Build
- Released
- Merged
- Not Now
- Declined

Each status change should support:

- a short public note
- optional ETA language where appropriate
- a reason for `Not Now`, `Merged`, or `Declined`

This is essential for trust.

---

## Interaction Design

## Main board

The main Requests page should include:

- search
- filters
- sort controls
- featured requests
- trending requests
- request cards with votes, tags, status, and short summary

Each card should quickly show:

- title
- one-line problem summary
- vote count
- status
- module tag
- urgency tag
- audience tag

### Submission flow

The create flow should ask for:

- what do you need?
- what problem does it solve?
- who is it for?
- which module or area is affected?
- how urgent is it?
- any example workflow or client scenario?

Submission should suggest similar existing requests before final creation.

### Request detail page

The detail page should include:

- full problem statement
- use case examples
- module and niche tags
- vote button
- follow button
- discussion/comments
- status history
- public team notes
- implementation outcome once shipped

### Community feeling

The feature should visibly acknowledge participation through:

- contributor names or handles where appropriate
- top contributors area
- request supporters count
- badges or reputation markers
- release notes linking shipped work back to original requests

---

## Reward System

This feature becomes much stronger if Chameleon rewards useful product contributions.

### Reward principles

- rewards should feel earned, not random
- rewards should be tied to meaningful contribution
- rewards should support goodwill and retention without creating entitlement chaos
- rewards should be visible enough to motivate participation

### Rewardable actions

- suggesting a request that gets implemented
- supplying critical use-case detail that helps shape implementation
- merging duplicate demand into a clearer canonical request
- repeatedly contributing high-signal ideas
- identifying high-value workflow friction early

### Reward options

- account credit
- extended free trial
- free month
- module unlock for a period
- premium feature access
- early access to new module features
- contributor badge
- founding contributor recognition

### Recommended reward model

For requests that materially influence shipped work:

- primary requester may receive a defined reward
- major supporting contributors may receive a lighter reward

Possible reward tiers:

- Tier 1: request implemented with minimal shaping
  - badge or recognition
- Tier 2: request materially shapes a shipped workflow
  - account credit or free month
- Tier 3: request becomes a meaningful module or high-impact platform feature
  - larger credit, module access, extended premium time, or founder-level recognition

### Important guardrails

- rewards are discretionary, not automatic legal entitlement
- duplicate requests should not all receive the same reward
- merged requests should preserve contributor attribution
- rewards should be governed by clear internal policy

Suggested wording:

`Chameleon may reward high-impact contributors whose requests materially shape shipped product improvements.`

---

## Top Contributors System

This should feel motivating but not gimmicky.

### What it should recognise

- implemented request authors
- high-value commenters
- users whose requests receive strong community support
- repeated constructive contributors

### Possible visible metrics

- requests implemented
- total supported requests
- community votes received
- featured contributor status

### Display options

- top contributors panel on the Requests page
- contributor badges on profiles
- release note callouts
- contributor leaderboard by season or all-time

This should stay tasteful and professional, not game-like in a cheap way.

---

## Coach and Client Participation Model

Recommended model:

- coaches can submit directly
- clients can support or suggest through a lighter surface
- coach-originated requests receive stronger weighting
- clients should still be able to validate pain points in the portal experience

This keeps the feature useful for product prioritisation without letting the board turn into uncontrolled consumer-style support noise.

---

## Moderation and Quality Controls

The board will need structure from the beginning.

### Required controls

- duplicate detection
- merge duplicate requests
- spam moderation
- request editing by admins
- comment moderation
- archive or close stale low-signal requests

### Submission quality helpers

- require a title
- require a problem statement
- encourage use-case examples
- suggest similar requests before submission

### Merge behavior

When duplicates are merged:

- one canonical request remains
- vote/support counts should be preserved where possible
- contributor attribution should be retained
- merged request authors should still be eligible for acknowledgement

---

## UX Notes for High Perceived Value

This page will only matter if it feels like a living relationship with the product team.

### To make users feel heard

- show recent status changes
- show public reasoning from the team
- show what is trending
- show requests that came from real coaches
- show shipped features tied back to the original ask

### To make users feel rewarded

- visible contributor acknowledgement
- meaningful perks
- occasional featured contributor highlights
- “requested by coaches like you” messaging

### To make users feel the feature is useful

- filters by module and niche
- ability to discover requests from similar coaches
- visible roadmap progress
- evidence that votes and context influence what gets built

---

## Suggested Information Architecture

### Coach side

- top-level page under admin: `Requests`
- board view
- create request flow
- detail page
- my requests view
- my rewards / contributions area later

### Client side

- optional lighter feedback/request surface in portal later
- client requests should route into the same ecosystem but remain coach-account contextual

---

## Suggested Data Model

### Core entities

- requests
- request_votes
- request_comments
- request_followers
- request_status_history
- request_tags
- request_merge_links
- contributor_rewards

### Useful fields on requests

- id
- title
- summary
- problem_statement
- desired_outcome
- requester_user_id
- requester_role
- coach_id
- client_id nullable
- module_area
- feature_area
- urgency
- niche
- status
- duplicate_of_request_id nullable
- reward_state
- implementation_note
- created_at
- updated_at

---

## Rollout Plan

## Phase 1: Foundational request board

Deliver:

- request list page
- request creation
- vote support
- tagging
- status labels
- comments
- basic filters and sorting

Goal:

- establish the loop of ask, support, review, and visible status

## Phase 2: Prioritisation and trust features

Deliver:

- follow requests
- status history
- admin reasoning notes
- duplicate detection
- merge flow
- trending and featured requests

Goal:

- improve signal quality and make the board feel alive

## Phase 3: Contribution and reward system

Deliver:

- contributor profiles or badges
- implemented-by-community attribution
- credit or free-time rewards
- module unlock rewards
- contributor ranking or featured section

Goal:

- create a meaningful return loop for high-value users

## Phase 4: Advanced roadmap intelligence

Deliver:

- coach vs client vote weighting
- niche-aware prioritisation
- internal scoring support
- request-to-release linkage
- analytics for demand clusters

Goal:

- make the system a strategic product decision engine

---

## Success Metrics

This feature is useful if it increases:

- number of quality requests submitted
- number of votes and comments per active request
- number of merged duplicate requests
- number of implemented features that map back to requests
- contributor retention
- coach trust in roadmap transparency

This feature is unhealthy if it produces:

- lots of duplicate low-quality posts
- no visible status movement
- no reward follow-through
- no evidence that requests affect build order

---

## Risks

### Risk: noisy low-quality board

Mitigation:

- required problem statements
- duplicate suggestions
- moderation

### Risk: reward abuse

Mitigation:

- discretionary reward policy
- merged request attribution logic
- contribution review before issuing rewards

### Risk: false expectation of guaranteed delivery

Mitigation:

- clear status model
- transparent reasoning
- explicit language that requests guide prioritisation but do not guarantee implementation

### Risk: coach trust loss if the board feels ignored

Mitigation:

- visible review cadence
- public notes
- shipped-request linkage

---

## Recommended Contract Alignment

This feature should align with the Chameleon no-lock-in contract.

Requests should improve the platform without creating reliance on opaque product decisions. The board should make roadmap direction more transparent, more collaborative, and more rewarding for the coaches who contribute to it.

---

## Working Recommendation

This should become a dedicated roadmap/community feature, not just a feedback inbox.

The strongest version of it is:

- coach-led
- publicly visible within the platform
- structured by module and niche
- interactive through votes, comments, follows, and status updates
- rewarding for users whose contributions materially shape shipped product

If built well, this can become one of the clearest trust-building features in the whole platform.
