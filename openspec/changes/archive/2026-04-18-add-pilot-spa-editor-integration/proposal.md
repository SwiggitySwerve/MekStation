# Change: Add Pilot SPA Editor Integration

## Why

The pilot detail page at `/gameplay/pilots/[id]` is where players manage a
pilot's career state — skills, wounds, awards, career stats. Phase 5 calls
for that same page to be the home of the "Abilities" editor: see current
SPAs, purchase new ones with XP, remove ones granted during pilot creation,
and see the XP impact of flaws. The `add-spa-picker-component` change
builds the browsing surface; this change wires it to the pilot record with
purchase semantics (XP deduction, origin-only gating, flaw XP grants, and
the create-vs-post-create removal rule).

Phase 5 runs in parallel with Phases 1, 2, and 3. This change touches only
the pilot detail page and the pilot service, so it will not collide with
Lane A engine wiring or Lane B combat UI.

## What Changes

- Add an "Abilities" section to the pilot detail page at
  `/gameplay/pilots/[id]` listing every SPA the pilot currently owns,
  with category color, displayName, designation (if any), source, and a
  "Remove" affordance that is only enabled during pilot creation.
- Add an "Add Ability" button that opens the `SPAPicker` in a modal,
  configured with the pilot's current ability ids in `excludedIds` so the
  player cannot select duplicates.
- On picker confirm: deduct XP for purchasable entries, credit XP for
  flaws, reject the action when the pilot's XP is insufficient, reject
  origin-only entries outside the creation flow, and append the SPA with
  its designation to the pilot record.
- Extend `PilotService` with `purchaseSPA(pilotId, spaId, designation?)`
  and `removeSPA(pilotId, spaId)` methods.

## Dependencies

- **Requires**: `add-spa-picker-component` (picker surface), existing
  `PilotService` (`src/services/pilots/PilotService.ts`), existing pilot
  types at `src/types/pilot/PilotInterfaces.ts`.
- **Related**: can land in parallel with Phases 1/2/3.
- **Required By**: `add-spa-display-on-pilot-sheet-and-unit-card`,
  `add-spa-designation-persistence`.

## Impact

- Affected specs: `pilot-system` (MODIFIED — adds purchase, flaw, and
  removal requirements), `spa-ui` (MODIFIED — adds editor embedding
  contract).
- Affected code: `src/pages/gameplay/pilots/[id].tsx` (abilities section),
  new `src/components/pilots/PilotAbilitiesPanel.tsx` (owns the list +
  add button + modal), `src/services/pilots/PilotService.ts` (new
  purchase and removal methods).
- Non-goals: SPA rendering on the record sheet / unit card (belongs to
  the display change), combat-side use of designation (belongs to the
  designation-persistence change), reworking existing pilot XP
  progression rules (out of scope).
- Database: no schema change — the existing `abilities` array on `IPilot`
  already accommodates both id and designation.
