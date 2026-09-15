# Campaign Unit Combat State Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-05-02
**Dependencies**: campaign-management, unit-entity-model
**Affects**: repair, after-combat-report, campaign-roster, post-battle-processor

---

## Overview

### Purpose

Crystallize the canonical **runtime damage state** carried per unit between scenarios. Distinguish "what the unit was built with" (construction state, owned by `unit-entity-model`) from "what it currently has after wear" (combat state, owned here). Eliminate parallel/conflated shapes that mix display caches, repair-cost estimates, and damage state.

This spec is the source-of-truth for `IUnitCombatState` and `ICampaign.unitCombatStates`. It supersedes the inline conventions previously embedded in `postBattleProcessor`, `repairQueueBuilder`, and the `useCampaignRosterStore` Zustand store.

### Scope

**In Scope:**

- Canonical `IUnitCombatState` shape and field semantics (armor / structure remaining, destroyed locations + components, ammo remaining, end-of-battle heat, `combatReady` flag, idempotency keys).
- `IUnitMaxState` reference shape (full-health snapshot for diff-based repair).
- Ownership: `ICampaign.unitCombatStates: Record<string, IUnitCombatState>` is the single canonical map.
- Lifecycle: when state is created (`createInitialCombatState`), updated (post-battle processor), and reset (post-repair).
- Deploy gate semantics (`isUnitCombatReady`).
- Idempotency contract via `lastCombatOutcomeId` for re-applying the same `matchId`.
- Explicit anti-fields (what combat state SHALL NOT carry).

**Out of Scope:**

- Damage application math (owned by `combat-resolution`).
- Repair cost / time / queue construction (owned by `repair`).
- Pilot status (`WOUNDED` / `MIA` / `KIA`) — lives on `ICampaignRosterEntry`, not on combat state.
- Unit display name / chassis / variant (cached on `ICampaignRosterEntry`, not duplicated here).
- Salvage inventory (owned by `repair`).
- Persistence mechanism (Zustand / localStorage / IndexedDB details belong to store specs).
- Per-Part hit-count escalation (engine 1 / 2 / 3, gyro 1 / 2). See "Deferred extensions" below.

### Key Concepts

- **Construction state** vs **Combat state** vs **Roster entry** — three orthogonal type families with one-way derivation: construction → combat (at deploy), combat → roster projection (for display).
- **Current remaining values, not deltas** — combat state stores positive-space "what's left" values, never damage-taken deltas (mirrors MegaMek `Entity.armor[loc]`).
- **Idempotent post-battle merge** — keyed by `matchId` via `lastCombatOutcomeId`; re-applying the same outcome SHALL NOT double-decrement.
- **Deploy gate** — `combatReady && CT > 0` is the canonical predicate (`isUnitCombatReady`).
- **Max-state diff** — `IUnitMaxState` baseline lets `repair` compute diff-driven tickets without inspecting construction state.

---

## Requirements

### Requirement: ICampaign owns the canonical unit combat state map

`ICampaign` SHALL declare `unitCombatStates: Record<string, IUnitCombatState>` as a first-class field. All callers SHALL access the map directly via `campaign.unitCombatStates`. Cast-through patterns (`campaign as typeof campaign & { unitCombatStates?: ... }`) SHALL be removed.

#### Scenario: Reading current armor for a deployed unit

- **WHEN** a consumer needs current armor for unit `u-42`
- **THEN** it reads `campaign.unitCombatStates['u-42']?.currentArmorPerLocation['LT']`
- **AND** it SHALL NOT read `campaign.roster.units[*].armorDamage` (deleted shape).

#### Scenario: Missing entry indicates undeployed unit

- **WHEN** `campaign.unitCombatStates['u-42']` is `undefined`
- **THEN** the unit has not yet been deployed (or its combat state was reset post-repair)
- **AND** `createInitialCombatState` SHALL run on first deploy to populate the entry.

#### Scenario: ICampaignUnitState is removed from the type system

- **WHEN** searching `src/` for `ICampaignUnitState` references
- **THEN** the count SHALL be 0 (the doomed shape from `CampaignInterfaces.types.ts`).

### Requirement: Combat state shape is normative and positive-space

`IUnitCombatState` SHALL store current remaining values, not damage-taken deltas. Numeric maps keyed by location SHALL hold the post-damage current value. Destroyed components SHALL be deduped by `(location, slot)`. Ammo SHALL be keyed by ammo bin id, not weapon name.

#### Scenario: Armor encoding

- **WHEN** a location loses 4 of 12 armor in battle
- **THEN** `currentArmorPerLocation['RT']` is `8` (remaining)
- **AND** the value `4` (damage taken) SHALL NOT appear anywhere in combat state.

#### Scenario: Destroyed component dedup

- **WHEN** the same critical slot is reported destroyed by multiple match outcomes
- **THEN** `destroyedComponents` contains exactly one entry for that `(location, slot)` pair.

#### Scenario: Ammo bin keying

- **WHEN** a unit carries two SRM-6 ammo bins
- **THEN** each bin has its own entry in `ammoRemaining` keyed by bin id
- **AND** depleting bin A SHALL NOT affect bin B's count.

### Requirement: Initial combat state is derived from construction at deploy time

`createInitialCombatState` SHALL accept full-health values from the construction layer (`armorPerLocation`, `structurePerLocation`, optional `ammoPerBin`) and SHALL NOT introspect `unit-entity-model` types directly. The function output SHALL be a fresh `IUnitCombatState` with `combatReady: true` and no destroyed components.

#### Scenario: Mech with no ammo

- **WHEN** a laser-only mech is deployed
- **THEN** `ammoRemaining` is `{}` (empty record, valid).

#### Scenario: Construction layer is the source of max values

- **WHEN** `createInitialCombatState` is called
- **THEN** the caller SHALL pass armor / structure / ammo from construction
- **AND** combat state SHALL NOT call into construction services itself.

### Requirement: Post-battle merge is idempotent

`postBattleProcessor` SHALL track `lastCombatOutcomeId` on each `IUnitCombatState`. Re-applying an outcome with the same `matchId` SHALL produce a structurally equal state.

#### Scenario: Same matchId applied twice

- **WHEN** an outcome with `matchId='m-7'` is applied to a unit, then applied again
- **THEN** `destroyedComponents` length is unchanged after the second application
- **AND** `ammoRemaining` values are unchanged after the second application.

#### Scenario: New matchId proceeds normally

- **WHEN** `lastCombatOutcomeId` is `'m-7'` and a new outcome with `matchId='m-8'` arrives
- **THEN** the merge proceeds and `lastCombatOutcomeId` updates to `'m-8'`.

### Requirement: Deploy gate predicate is centralized

`isUnitCombatReady(state: IUnitCombatState): boolean` SHALL be the only place encoding deploy eligibility. UI and processor callers SHALL use this helper rather than inlining `state.combatReady && state.currentStructurePerLocation['CT'] > 0`.

#### Scenario: Combat-ready flag false

- **WHEN** `state.combatReady` is `false`
- **THEN** `isUnitCombatReady` returns `false`.

#### Scenario: CT destroyed

- **WHEN** `state.currentStructurePerLocation['CT']` is `0`
- **THEN** `isUnitCombatReady` returns `false` regardless of `combatReady`.

#### Scenario: Non-mech unit with absent CT entry

- **WHEN** `state.currentStructurePerLocation['CT']` is `undefined` (vehicle / aerospace / infantry) AND `state.combatReady` is `true`
- **THEN** `isUnitCombatReady` returns `true` (treat unknown-CT as intact for non-mech chassis).

#### Scenario: Repair completion flips combatReady

- **WHEN** a "rebuild destroyed unit" repair job completes
- **THEN** the repair flow flips `combatReady` from `false` back to `true`.

### Requirement: Max-state companion shape supports repair diff

`IUnitMaxState` SHALL hold full-health reference values built once at deploy from construction state. The repair ticket generator SHALL diff `IUnitCombatState` against `IUnitMaxState` to build `IDamageAssessment`. Locations absent from the max-state SHALL be skipped (no spurious tickets for partial-data units).

#### Scenario: Diff-driven ticket generation

- **WHEN** `currentArmorPerLocation['LT']` is `4` and `IUnitMaxState.maxArmorPerLocation['LT']` is `12`
- **THEN** the repair queue contains an `armor` ticket for `LT` with `points = 8`.

#### Scenario: Absent max-state entry

- **WHEN** `IUnitMaxState.maxArmorPerLocation['LT']` is `undefined`
- **THEN** no armor ticket is generated for `LT` (skipped).

### Requirement: Combat state SHALL NOT carry display, cost, or roster fields

`IUnitCombatState` SHALL NOT contain any of the following fields. UI display, repair pricing, and roster identity belong to other types per the cleavage above.

#### Scenario: No display name field

- **WHEN** searching `IUnitCombatState` for `unitName`
- **THEN** the field is absent (display name is cached on `ICampaignRosterEntry`).

#### Scenario: No repair cost field

- **WHEN** searching `IUnitCombatState` for `repairCost` or `repairTime`
- **THEN** both fields are absent (computed on demand by `repair` spec).

#### Scenario: No pilot id field

- **WHEN** searching `IUnitCombatState` for `pilotId`
- **THEN** the field is absent (lives on `ICampaignRosterEntry`).

#### Scenario: No status enum field

- **WHEN** searching `IUnitCombatState` for `status` or `CampaignUnitStatus`
- **THEN** both are absent. Any displayed "status" is a derived view from `combatReady` + `destroyedLocations` + roster context, not a stored field.

### Requirement: Roster store consumes combat state via thin projection type

`useCampaignRosterStore` SHALL expose a thin display projection (suggested name: `IRosterUnitProjection`) carrying only roster-identity and derived display fields (`unitId`, `unitName`, `pilotId`, `chassisVariant`, derived `readiness`). The projection SHALL NOT duplicate damage-state fields from `IUnitCombatState`. Components needing damage values SHALL read from `campaign.unitCombatStates[unitId]` directly.

#### Scenario: Damage bar rendering

- **WHEN** `RosterStateCards.tsx` renders a damage bar
- **THEN** it reads `currentArmorPerLocation` and `currentStructurePerLocation` from `IUnitCombatState`
- **AND** computes the bar percentage against `IUnitMaxState.maxArmorPerLocation` and `IUnitMaxState.maxStructurePerLocation`, skipping locations the max-state does not name
- **AND** does not derive the percentage from destroyed-component or destroyed-location counts
- **AND** does not read `armorDamage` from a roster projection (deleted field).

#### Scenario: Absent max-state entry at the damage bar

- **WHEN** `RosterStateCards.tsx` renders a unit that has canonical `IUnitCombatState` but no `campaign.unitMaxStates[unitId]` entry
- **THEN** it renders an explicit "maxima unavailable" affordance
- **AND** it renders no percentage, no stock-substituted maximum, and no `0%` placeholder.

#### Scenario: Projection name does not collide

- **WHEN** the projection type is named
- **THEN** it SHALL NOT be `IUnitDamageState` (collides with three existing definitions in `lib/combat/acar.ts`, `utils/gameplay/damage/types.ts`, and the prior `useCampaignRosterStore`).

### Requirement: Cross-spec consumption boundaries

Other specs that reference unit-state data SHALL consume `IUnitCombatState`, `IUnitMaxState`, or `IRosterUnitProjection` per their audience and SHALL NOT reference the deleted `ICampaignUnitState` interface or `CampaignUnitStatus` enum.

#### Scenario: Repair spec consumption

- **WHEN** `repair/spec.md` describes damage assessment input
- **THEN** it consumes `IUnitCombatState` + `IUnitMaxState` to drive `IDamageAssessment` and `IRepairJob`.

#### Scenario: After-combat report production

- **WHEN** `after-combat-report/spec.md` describes the post-battle data flow
- **THEN** it produces the outcome data the post-battle processor merges into `unitCombatStates`.

#### Scenario: Unit entity model upstream relationship

- **WHEN** `unit-entity-model/spec.md` describes construction state
- **THEN** combat state is its post-deploy projection, derived once via `createInitialCombatState`.

---

## Deferred extensions

### Per-Part hit-count escalation

MegaMek tracks engine hits (1 / 2 / 3 → MP penalty escalation, 3rd hit destroys) and gyro hits (1 → +3 PSR mod, 2 → destroyed) as accumulating counters, not binary destroyed flags. The current `IDestroyedComponent` shape encodes binary destruction. A future spec extension SHALL add an optional `hitCount?: number` to `IDestroyedComponent` and update merge semantics to escalate rather than dedupe for engine / gyro components.

**Status**: Not required for current waves. Tracked as `TODO(per-part-hit-escalation)` in `IDestroyedComponent`.

### Pilot consciousness

`pilotConscious` is unreachable in current waves (combat-resolution Wave 5 gate). When wired, it SHALL live on `ICampaignRosterEntry`, not on `IUnitCombatState` — keeps the cleavage between unit-state and pilot-state intact.

---

## Migration status

This spec replaces the implicit conventions previously held by `useCampaignRosterStore` and the cast-through hacks in integration tests. Four type/source migration boundaries are complete in this candidate. That is source-type completion, not full runtime proof of deploy, post-battle, repair, or roster journeys.

1. **Promote `unitCombatStates` to `ICampaign` (1 type file + 3 test cast-removals). — Completed as a type boundary.** `ICampaign.unitCombatStates` in `src/types/campaign/Campaign.ts` is the canonical post-deploy map. No remaining work is a missing type field.
2. **Replace `useCampaignRosterStore`'s `units: ICampaignUnitState[]` with the projection type (rename to avoid `IUnitDamageState` collision). — Completed as a type boundary.** Store `units` is `IRosterUnitProjection[]` (`src/types/campaign/RosterUnitProjection.ts`). Current damage remains on `ICampaign.unitCombatStates[unitId]`. No live `ICampaignUnitState` declaration or reference remains. A separate carry-forward payload in `campaignRosterStore.types.ts` still uses the colliding name `IUnitDamageState`; that is not the roster `units` array.
3. **Migrate `RosterStateCards.tsx` damage bar to read `currentArmorPerLocation` against `IUnitMaxState`. — Closed by PR #1734 `efd8a136d523adfa81fda303adb608e3563575ee` (2026-09-15, `R9.roster-damage` S1).** `computeDamageBarData` now diffs current armor and structure per location against `campaign.unitMaxStates[unitId]`, skipping locations the max-state does not name; the destroyed-component/location heuristic (`destroyedCount * 2 + destroyedLocationCount * 4`) is deleted, so the bar is no longer derived from destroyed counts. When no `IUnitMaxState` entry exists for a unit, the card renders an explicit "maxima unavailable" affordance rather than a stock-substituted maximum or a fabricated percentage - see the "Absent max-state entry at the damage bar" scenario above. Exact-main proof `openspec/planning/2026-09-12-roadmap-completion/evidence/r9-roster-damage-s1-1734-main-proof-20260915.json`: blob-identical to the reviewed head `6759b3066`, jest 62 suites/619 tests exit 0, tsc/openspec-strict/purpose/terminology/qc-openspec-ci all exit 0; independent review APPROVE (`evidence/r9-roster-damage-review-20260915.json`). Population of `campaign.unitMaxStates` itself through the canonical/custom source authority is now on main by PR #1735 `17525370e00bfd8f022783f2bf1f6b9250422ca6` (2026-09-15, `R9.roster-damage` S2): `resolveMissingUnitMaxStates` (`src/lib/campaign/maxState/unitMaxStateResolver.ts`) resolves each roster unit's max state via `adaptUnit`, which routes `custom-*` refs to the custom-unit source and canonical refs to the compendium; `ensureCampaignUnitMaxStates` (`src/stores/campaign/campaignUnitMaxStates.ts`) is idempotent and is called both at campaign creation (`src/components/gameplay/pages/campaigns/create/CreateCampaignPage.submit.ts`) and at campaign load (`src/stores/campaign/useCampaignPersistenceStore.ts`) to backfill existing campaigns saved before construction maxima were populated. Exact-main proof `openspec/planning/2026-09-12-roadmap-completion/evidence/r9-roster-damage-s2-1735-main-proof-20260915.json`: blob-identical to the PR head, jest 273 suites/3606 tests exit 0, tsc/openspec-strict/purpose/terminology/qc-openspec-ci all exit 0. Disclosed limits: scoped jest only, no browser proof of the populated card; the load-path backfill runs only on the deserialize branch.
4. **Delete `ICampaignUnitState` from `CampaignInterfaces.types.ts` and `CampaignInterfaces.runtime.ts`. — Completed as a type boundary.** The legacy roster-unit state is deleted; those modules document the independent `IRosterUnitProjection[]` store and campaign-level `unitCombatStates` map.
5. **Remove local `ICampaignInput` interfaces in `postBattleProcessor` and `repairQueueBuilderProcessor` — accept `ICampaign` directly. — Completed for the named legacy interfaces.** Neither processor has a local `ICampaignInput`; both use `ICampaign` with typed extensions (`ICampaignWithBattleState`, `IPostBattleCampaignExtensions`). Integration/order proof for those processors is still required.

This cutover does not complete every campaign migration or runtime journey.

Pre-release context (zero released users, hard-cutover policy): no Zustand `persist` migration callback required. First load post-deletion rebuilds localStorage from defaults.
