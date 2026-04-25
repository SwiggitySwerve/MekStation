# Decisions — add-bot-retreat-behavior

## [2026-04-24 apply] Structure-points formula needs a starting baseline somewhere

**Decision:** Add `IUnitGameState.startingInternalStructure: Record<string, number>` (optional) and seed it from two sources:

1. **`CompendiumAdapter.adaptUnitFromData`** — production path. Spreads the freshly-computed `structure` map into `startingInternalStructure` so they start equal at session creation (`src/engine/adapters/CompendiumAdapter.ts:521-528`).
2. **`applyDamageApplied` reducer** — bootstrap fallback. When a damage event fires for a location whose `startingInternalStructure[location]` is undefined, capture `unit.structure[location]` (the pre-damage value) as the starting baseline (`src/utils/gameplay/gameState/damageResolution.ts:32-49`). This handles legacy callers / test fixtures that didn't seed via the adapter — the first damage event becomes the canonical starting point.

**Rationale:** The spec says `sum(starting - current) / sum(starting)`. Without a baseline, only `0/0` ratios are computable. We considered two alternatives:

- **Standard structure table by tonnage** — rejected because tonnage isn't on `IGameUnit`; would require a new field migration.
- **Track destroyedLocations.length / total** (legacy) — rejected because it doesn't match the spec semantics. A glass-jaw mech with one 4-point arm gone would trigger at 1/8 = 12.5%, not the 9.3% the spec describes.

**Discovered during:** Tasks 2.2 (formula fix), 1.2 (defaults), 2.5 (trigger tests).

## [2026-04-24 apply] UnitRetreated emission lives at the engine wiring layer, not in BotPlayer

**Decision:** `BotPlayer.playMovementPhase` continues to return only the `MovementDeclared` event. The engine wiring (`GameEngine.phases.runMovementPhase` and `InteractiveSession.runAITurn`) calls `RetreatAI.hasReachedEdge(...)` after `lockMovement(...)` and emits `UnitRetreated` directly via `appendEvent + createUnitRetreatedEvent`.

**Rationale:** `BotPlayer` has no session reference and no event-creation infrastructure (game ID, sequence number, current phase). Pushing the emission into the engine layer keeps `BotPlayer` pure and side-effect-free, mirroring how `RetreatTriggered` is already emitted (`BotPlayer.evaluateRetreat` returns a payload-only event; the engine wraps it). Both phases that move bot units (autonomous + interactive) now have parity.

**Discovered during:** Task 7.2, 7.3.

## [2026-04-24 apply] hasRetreated excludes from victory check, destroyed stays false

**Decision:** `applyUnitRetreated` sets `hasRetreated: true` only — does NOT set `destroyed: true`. The victory predicate `getSurvivingUnitsForSide` (`gameStateReducer.ts:271-282`) is updated to filter on `!destroyed && !hasRetreated`. This way:

- Retreated units count as "out" for elimination victory.
- Post-battle summaries can list withdrawn units separately from combat losses (the `add-victory-and-post-battle-summary` sibling spec consumes the `hasRetreated` discriminator).

**Rationale:** Spec § 7.4 says "mark the retreated unit as destroyed: true for victory-check purposes but distinguish it from combat destruction". The cleanest implementation is to keep the two flags semantically distinct and have the victory predicate honor both, rather than overload `destroyed` with a "kind" sub-discriminator.

**Discovered during:** Task 7.4.

## [2026-04-24 apply] Arc filter via torsoTwist suppression, not weapon-list pre-filter

**Decision:** Spec § 6.2 says retreating units do NOT torso twist. Implementation: in `BotPlayer.playAttackPhase`, when `attacker.isRetreating === true`, build a clone with `torsoTwist: undefined` and pass that to `AttackAI.selectWeapons` (`BotPlayer.ts:288-296`). The existing arc-filter inside `selectWeapons` then keys off the unit's true forward facing — back-arc enemies become invisible to front-mounted weapons, but rear-mounted weapons (per `weapon.mountingArc === Rear`) still fire correctly because their arc matches the rear target's relative arc.

**Rationale:** Cleanest single-point intervention. No changes needed to `AttackAI` itself, no parallel "filter weapons by retreat arc" code path. The existing arc machinery already handles the rear-mount edge case (spec scenario "rear-mounted weapons cover the escape vector").

**Discovered during:** Task 6.2.
