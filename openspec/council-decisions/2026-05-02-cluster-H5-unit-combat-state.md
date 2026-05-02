# Council #3 Decision — Cluster H pair #5: Unit Combat State Canonicalization

**Date**: 2026-05-02
**Variant**: Lean++ thin (Phase 0 Metis + 3 Phase-2 seats: Explore-Deep + Oracle-as-adversary + general-purpose for spec scoping)
**Verdict**: VERIFIED (Phase 4.5 Haiku — all 4 deciding facts confirmed)
**Survival Score**: 8/10
**Execution status**: Decision + spec authoring complete this session. Implementation deferred to next session per ULTRAWORK loop scope cap.

---

## Question

The original triage plan asked: "ICampaignUnitState (delta-based) vs IUnitCombatState (absolute-based) — which representation wins, and what's the migration?"

Phase 0 Metis reframed the question. The "delta vs absolute" framing was wrong — the two types track orthogonal concerns:

- `IUnitCombatState` (`src/types/campaign/UnitCombatState.ts`) — processor/engine layer. Stores current remaining values. Already wired into 9 files including `postBattleProcessor`, `repairQueueBuilderProcessor`, `repairQueueBuilder`, and round-trip integration tests.
- `ICampaignUnitState` (`src/types/campaign/CampaignInterfaces.types.ts:113-136`) — Zustand UI store type. Stores damage deltas (`armorDamage`, `structureDamage`) plus orphan display fields (`status`, `repairCost`, `repairTime`, `pilotId`, `unitName`).

The real question became: how do we collapse to one canonical state shape, where does the display projection live, and what spec crystallizes it?

## Reference pattern: MegaMek + MekHQ

Phase 0 research grounded the determination in the canonical Java reference implementation at `E:/Projects/megamek` and `E:/Projects/mekhq`:

| Layer | Type | What it owns |
|---|---|---|
| Combat engine (MegaMek) | `Entity` (inside `Game`) | Current remaining values: `armor[loc]`, `internal[loc]`, `shotsLeft` per ammo bin |
| Transient bridge (MekHQ) | `ResolveScenarioTracker` + `UnitStatus` | Lives ~5 min during the resolve wizard, then garbage-collected |
| Persistent campaign (MekHQ) | `Unit` wraps a single `Entity`; `Part` collection per unit | The Entity IS the persistent state. Damage absorbed via `unit.setEntity(en)`. Per-Part deltas computed on demand by `runDiagnostic()`. |

**Three load-bearing observations:**

1. **One canonical state type.** MekHQ doesn't keep two parallel representations. `Entity` is the truth, full stop.
2. **Current remaining values, not deltas.** Deltas are computed on demand by `Part.updateConditionFromEntity()`.
3. **Transient bridge exists only because of an IPC boundary.** MegaMek runs in a separate JVM and hands MekHQ an `Entity` via `IGameListener.gameVictory(PostGameResolution)`. Without that boundary, MekHQ would update Unit directly. We're a single TS process; the post-battle handoff is an in-process function call.

## Decision

**KEEP `IUnitCombatState`. DELETE `ICampaignUnitState`. PROMOTE `unitCombatStates` onto `ICampaign`. REPLACE the roster store's unit shape with a thin projection type. AUTHOR a canonical spec.**

Specifically:

1. **`IUnitCombatState` is canonical** — matches MegaMek `Entity`'s "current remaining values" convention. `IDestroyedComponent` already carries `slot: number` (verified at `UnitCombatState.ts:31`), enabling per-slot repair targeting.
2. **`unitCombatStates: Record<string, IUnitCombatState>` is promoted to `ICampaign`** — eliminates the cast-through pattern (`campaign as typeof campaign & { unitCombatStates?: ... }`) used in 3 test sites and the local `ICampaignInput` interfaces in 2 processor files.
3. **`ICampaignUnitState` is deleted entirely** — it stores deltas (anti-pattern) AND it conflates damage state with display caches.
4. **`useCampaignRosterStore` gets a thin projection type** carrying only `unitId`, `unitName`, `pilotId`, `chassisVariant`, derived `readiness`. **The projection type SHALL NOT be named `IUnitDamageState`** — that name has 3 independent definitions in the repo (`lib/combat/acar.ts`, `utils/gameplay/damage/types.ts`, current roster store). Suggested name: `IRosterUnitProjection`.
5. **`repairCost` / `repairTime` are computed on demand by `repair`** — they are not stored on combat state. Mirrors MekHQ's `Part.updateConditionFromEntity()` pattern.
6. **No transient bridge type** — single TS process, in-process function calls.
7. **No Zustand `persist` migration needed** — pre-release product, zero released users (verified via `package.json: "version": "0.1.1", "private": true`). First load post-deletion rebuilds localStorage from defaults.

## Critical Phase 2 findings

### Explore-Deep call-graph verification

- **9 files for `IUnitCombatState`**: 3 production (`UnitCombatState.ts` def, `postBattleProcessor`, `repairQueueBuilderProcessor`, `repairQueueBuilder`) + 6 test files. Metis claim VERIFIED.
- **7 files for `ICampaignUnitState`**: definition, 1 store, 2 UI components, 1 construct site, 1 runtime util, 1 test. VERIFIED.
- **`IDestroyedComponent` HAS slot index** (`UnitCombatState.ts:31`): `readonly slot: number`. Per-slot repair costing is feasible; spec gap on this is closed.
- **5 fields on `ICampaignUnitState` with NO equivalent on `IUnitCombatState`**: `status`, `repairCost`, `repairTime`, `pilotId`, `unitName`. Migration plan handles each:
  - `unitName`, `pilotId` → roster projection type
  - `status` → derived view, not stored
  - `repairCost`, `repairTime` → computed by repair queue
- **`RosterStateCards.tsx:73-74`** uses coarse `armorDamage` / `structureDamage` Records for damage bar display. Migration item: switch to `currentArmorPerLocation` with `IUnitMaxState` denominator.

### Adversary objections (Oracle in red-team role)

Three required revisions to the determination, all incorporated above:

1. **`IUnitDamageState` name collision** — confirmed 3 independent definitions. Renaming the roster projection to a non-colliding name is mandatory.
2. **Save/load round-trip** — flagged as critical, but the pre-release context (zero users) defuses it. No `persist` migration callback required.
3. **Per-Part hit-count escalation** (engine 1/2/3, gyro 1/2) — current `destroyedComponents` is binary. Spec carve-out added under "Deferred extensions"; tracked as `TODO(per-part-hit-escalation)` in `IDestroyedComponent`.

Performance caveat (dashboard re-render on every campaign-store write): noted in spec migration notes; will need `useMemo` or `zustand/shallow` selector contract during execution.

### Spec authoring guardrails (5 traps avoided)

1. Spec does not pin field-level location codes (varies by chassis).
2. Spec does not re-spec damage application math (owned by `combat-resolution`).
3. Spec separates "status" (derived view) from "combatReady" (stored field).
4. Spec uses negative requirements to lock down anti-fields (no `unitName`, `pilotId`, `repairCost`, `repairTime`, `status` on combat state).
5. Spec stays silent on persistence mechanism (Zustand / localStorage) — owned by store specs.

## What ships from this session

- **`openspec/specs/campaign-unit-combat-state/spec.md`** — canonical spec, 11 requirements, ~30 scenarios, deferred extensions section, migration notes.
- **`openspec/council-decisions/2026-05-02-cluster-H5-unit-combat-state.md`** — this document.

## Execution scope (deferred to next session)

The implementation breaks cleanly into 3 sequential PRs. None are blocking on each other beyond ordering:

### PR-A — Promote `unitCombatStates` to `ICampaign` (S, ~1 hour)

- Add `unitCombatStates: Record<string, IUnitCombatState>` to `ICampaign` type
- Remove 3 cast-through sites in `phase3RoundTrip.test.ts:320`, `phase4CampaignRoundTrip.test.ts:385`, `phase4CampaignRoundTrip.test.ts:392`
- Remove local `ICampaignInput` interfaces in `postBattleProcessor.ts` and `repairQueueBuilderProcessor.ts` — accept `ICampaign` directly
- Verify via integration round-trip tests

### PR-B — Replace roster store unit shape with projection type (M, ~2-3 hours)

- Author `IRosterUnitProjection` type (5 fields: `unitId`, `unitName`, `pilotId`, `chassisVariant`, derived `readiness`)
- Migrate `useCampaignRosterStore.units: ICampaignUnitState[]` → `units: IRosterUnitProjection[]`
- Migrate `RosterStateCards.tsx` damage bar to read `currentArmorPerLocation` from `campaign.unitCombatStates`
- Migrate `RosterStateDisplay.tsx` to use projection type
- Migrate `CreateCampaignPage.tsx` construct site to build projection (not full state)
- Add `useMemo` / shallow selector for damage-bar derivation
- All 30+ test references in `useCampaignRosterStore.test.ts` updated

### PR-C — Delete `ICampaignUnitState` (S, ~30 min)

- Delete `ICampaignUnitState` from `CampaignInterfaces.types.ts:113-136`
- Delete `ICampaignRoster.units: ICampaignUnitState[]` field if unused after PR-B
- Delete `IRecordMissionOutcomeInput.unitUpdates: Partial<ICampaignUnitState>[]` (replace with `Partial<IUnitCombatState>[]` keyed by unit id)
- Delete `getOperationalUnits()` in `CampaignInterfaces.runtime.ts` if it returned the old shape
- Final grep: `ICampaignUnitState` count = 0 in `src/`

## Survival score breakdown

- **Architectural soundness**: 9/10 — matches canonical reference implementation
- **Migration risk**: 7/10 — 3 cast sites + roster store rewrite + name collision avoidance — non-trivial but bounded
- **Spec quality**: 8/10 — explicit anti-fields, deferred extensions called out, cross-spec boundaries enumerated
- **Verification depth**: 8/10 — Phase 0 + 3 Phase-2 seats + Phase 4.5 Haiku verification confirmed all 4 deciding facts

**Overall: 8/10**.

## Council seats

| Seat | Position | Model |
|---|---|---|
| Phase 0 Metis | reframer (overruled "delta vs absolute" framing; flagged roster store dependency understatement) | sonnet |
| Explore-Deep | call-graph verification (9 IUnitCombatState files; 7 ICampaignUnitState files; IDestroyedComponent slot field; 5 fields with no equivalent) | sonnet |
| Oracle (adversary role) | red-team objections (name collision; persist migration; hit-count escalation; perf caveat) | opus |
| general-purpose (spec scoping) | spec outline + 5 authoring guardrails | sonnet |
| Phase 4.5 Haiku verifier | VERIFIED (4/4 deciding facts confirmed) | haiku |

## Effort estimate

PR-A + PR-B + PR-C = approximately 4-6 hours of focused work. All three can ship in a single follow-up session.

## Phase 6 status

**Skipped this session.** Per ULTRAWORK loop cap, Council #3 deliverable is decision-doc + spec authoring. PR-A through PR-C are the implementation chain, deferred to next session.
