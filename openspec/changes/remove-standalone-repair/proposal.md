# Remove the standalone repair bay

## Why

A parallel, standalone repair system (`useRepairStore`, the `/gameplay/repair`
page, `RepairBayPage`, `src/components/repair/*`, `src/types/repair/*`) was
superseded by the campaign `RepairTicket` system and is no longer linked from
any navigation. Two repair authorities invite divergence (the
`repair-maintenance` spec already forbids a second completion authority). The
owner approved deleting the standalone stack on 2026-11-07 (ruling D1).

## What Changes

- Delete the `/gameplay/repair` route, the `RepairBayPage` stack,
  `src/components/repair/*`, the `useRepairStore` modules and
  `src/types/repair/*` with their tests.
- Remove the `repair` entry from the E2E store exposure and its window typing,
  and delete the repair e2e spec, page object and fixtures.
- Remove `/gameplay/repair` from the app-shell route manifest, the browser
  proof spec and the layout-sweep inventory (guard counts 29/65/34 become
  28/64/33), and delete the audit-capture and integration repair cases.
- REMOVED requirements: 18 of the 19 `repair` requirements. The 13 with source
  anchors cite only deleted files; `Damage Assessment`, `Repair Execution`,
  `Repair Costs`, `Field Repairs` and `Salvage for Repairs` describe behaviour
  (full/partial repair, costs, field repair, salvage offset) that no remaining
  code provides.

## Impact

Affected capability: `repair`. The campaign `RepairTicket` system, the
campaign repair-bay route (`/gameplay/campaigns/[id]/repair-bay`) and
`RepairBay.tsx` are untouched. `Repair Queue` is deliberately kept: the
campaign ticket queue provides progression and priority reordering, so it may
still be satisfied. A canonical sync should reconcile that requirement's
wording, the `repair-maintenance` sentence naming `useRepairStore.advanceRepairs`
(now moot), and the narrative sections of the living spec.
