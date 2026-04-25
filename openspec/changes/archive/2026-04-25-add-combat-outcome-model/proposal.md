# Change: Add Combat Outcome Model

## Why

Phase 3 wires combat outcomes back into the campaign. The Phase 1 game engine
produces a rich event-sourced `IGameSession` — full turn log, per-unit damage,
heat excursions, pilot consciousness rolls, weapons fired. The campaign
consumer (XP awards, medical, repair, salvage, contract progression) cannot
ingest a raw event stream — it needs a single, serialized, versioned payload
with every fact the downstream processors need. Without this bridge, a
completed battle is an orphan: the session ends but nothing persists.

## What Changes

- Add `ICombatOutcome` interface — the canonical hand-off shape from Phase 1
  engine to Phase 3 campaign processors (derived from event log, deterministic)
- Add `IUnitCasualty` per participating unit: armor lost per location,
  structure lost per location, destroyed components, critical hits taken,
  ammo consumed, weapons fired, max heat reached, shutdowns, final status
  (intact / damaged / destroyed / crippled)
- Add `IPilotOutcome` per pilot: XP-eligible events (kills, task completions,
  mission role), wounds taken, consciousness rolls, pilot status (active /
  wounded / unconscious / KIA / MIA)
- Add `deriveCombatOutcome(session: IGameSession): ICombatOutcome` — pure
  derivation, no mutation, same session produces identical outcome
- Add `combatOutcomeVersion` for forward compatibility as engine evolves
- Add match-side metadata (winner, reason, turn count, scenario id, encounter
  id, contract id) so downstream processors can route effects correctly

## Dependencies

- **Requires (Phase 1)**: `add-interactive-combat-core-ui`,
  `integrate-damage-pipeline` (A1–A7 — correct damage/crit/heat math must land
  first or outcomes will be wrong), `add-victory-and-post-battle-summary` (B6
  — provides `IPostBattleReport` which this change supersets)
- **Required By**: `add-post-battle-processor` (consumes `ICombatOutcome`),
  `add-salvage-rules-engine`, `add-repair-queue-integration`,
  `add-post-battle-review-ui`, `wire-encounter-to-campaign-round-trip`

## Impact

- Affected specs: `after-combat-report` (MODIFIED — supersedes
  `IPostBattleReport` with the richer `ICombatOutcome`), `combat-resolution`
  (MODIFIED — adds outcome derivation as terminal step), `game-session-management`
  (MODIFIED — session exposes `toCombatOutcome()` on completion)
- Affected code: new `src/lib/combat/outcome/combatOutcome.ts` (derivation),
  new `src/types/combat/CombatOutcome.ts` (interfaces), extends
  `src/engine/InteractiveSession.ts` with `getOutcome()`, extends
  `/api/matches` to persist outcomes alongside existing post-battle reports
- Non-goals: applying the outcome (that's `add-post-battle-processor`),
  salvage calculation (that's `add-salvage-rules-engine`), UI rendering
  (that's `add-post-battle-review-ui`)
