# Change: Add Pre-Battle Force Comparison

## Why

Phase 1's pre-battle setup screen (`add-skirmish-setup-ui`) lets the
player pick units, pilots, and map settings — then commits them to a
match. But players have no snapshot of "is this a fair fight?" before
pressing Launch. In BattleTech a 30% BV imbalance usually decides the
match, a 50kg tonnage deficit is survivable, and a pilot-skill gap is
often decisive. Phase 2's decision-support promise is "see the
lopsided-ness before you commit". This change adds a force comparison
panel to the pre-battle screen showing BV delta, tonnage delta, heat
dissipation delta, average pilot skill delta, weapon DPT potential
delta, and SPA modifier summary — all side-by-side, so the player can
swap a mech before launching.

## What Changes

- Add `deriveForceSummary(side, force): IForceSummary` that aggregates
  per-side statistics: `{totalBV, totalTonnage, heatDissipation,
avgGunnery, avgPiloting, weaponDamagePerTurnPotential, spaSummary:
Array<{spaId, unitIds}>}`
- Add `compareForces(player, opponent): IForceComparison` returning
  each metric's delta (signed, player minus opponent) plus a
  normalized severity (low / moderate / high) based on documented
  thresholds
- Add a `ForceComparisonPanel` React component that renders the
  comparison as a two-column layout with delta badges
- Integrate the panel into the pre-battle page as a collapsible
  sidebar; default open when the encounter has both sides configured
- Add thresholds: BV ratio > 1.25 → high, 1.10–1.25 → moderate;
  tonnage delta > 20% → high; pilot-skill gap ≥ 1.0 → high; DPT delta
  > 25% → high
- SPA summary groups pilots by their active SPAs so the player can
  see "Opponent has Sniper × 2, Marksman × 1" at a glance

## Dependencies

- **Requires**: `add-skirmish-setup-ui` (pre-battle page where the
  panel mounts), `after-combat-report` (reuses aggregation shapes),
  `game-session-management` (force configuration input shape), Phase
  1 wiring for SPA modifiers (from `improve-bot-basic-combat-competence`
  and existing SPA catalog)
- **Required By**: none in Phase 2 (leaf pre-battle surface). Phase 3
  campaign integration will reuse this panel when accepting contracts.

## Impact

- Affected specs: `after-combat-report` (ADDED — `IForceSummary` and
  `IForceComparison` shapes colocated with existing summary types
  since they share aggregation patterns), `game-session-management`
  (MODIFIED — pre-battle handshake exposes an optional
  `onForcesChange` callback the panel subscribes to)
- Affected code: new
  `src/components/gameplay/ForceComparisonPanel.tsx`, new
  `src/utils/gameplay/forceSummary.ts`, new
  `src/utils/gameplay/forceComparison.ts`,
  `src/pages/gameplay/encounters/[id]/pre-battle.tsx` (adds the panel
  to the sidebar)
- Non-goals: suggesting substitution units (future), showing heatmap
  of terrain interactions (future), accounting for terrain pre-placed
  hazards (future), running a quick Monte Carlo from the pre-battle
  screen (that's the `add-quick-resolve-monte-carlo` button already
  reachable from the encounter detail page)
