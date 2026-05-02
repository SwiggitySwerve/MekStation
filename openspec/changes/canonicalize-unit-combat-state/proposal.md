# Canonicalize Unit Combat State

## Intent

Two parallel state representations exist for unit state in the gameplay/campaign domain. `ICampaignUnitState` (in `src/types/campaign/CampaignInterfaces.types.ts:113-136`) stores damage deltas plus orphan display fields (`status`, `repairCost`, `repairTime`, `pilotId`, `unitName`). `IUnitCombatState` (in `src/types/campaign/UnitCombatState.ts:47`) stores current remaining values and is wired into 9 production + test files. The two types serve orthogonal layers — UI store vs processor pipeline — but consumers reach across the boundary via cast-through hacks (`campaign as typeof campaign & { unitCombatStates?: ... }` at three test sites and via local `ICampaignInput` interfaces in two processors).

Council #3 (Lean++ thin variant, decision at `openspec/council-decisions/2026-05-02-cluster-H5-unit-combat-state.md`) ruled: keep `IUnitCombatState` as canonical (matches MegaMek `Entity`'s "current remaining values" convention); promote `unitCombatStates` onto `ICampaign`; delete `ICampaignUnitState` entirely; replace the roster store's unit shape with a thin display projection (NOT named `IUnitDamageState` — collides with three existing definitions).

This change ships the implementation in three sequential PRs (PR-A → PR-B → PR-C), eliminating the cast-through hack and the conflated UI-store-as-state-store anti-pattern. The new canonical spec at `openspec/specs/campaign-unit-combat-state/spec.md` (authored alongside the council decision) is the source-of-truth this change implements.

## Scope

### In

- Promote `unitCombatStates: Record<string, IUnitCombatState>` onto `ICampaign` (`src/types/campaign/Campaign.ts`).
- Remove the three cast-through sites in `phase3RoundTrip.test.ts:320`, `phase4CampaignRoundTrip.test.ts:385`, `phase4CampaignRoundTrip.test.ts:392`.
- Remove the local `ICampaignInput` interfaces in `postBattleProcessor.ts` (~line 68-80) and `repairQueueBuilderProcessor.ts` (~line 60-70). Both processors accept `ICampaign` directly post-promotion.
- Author `IRosterUnitProjection` type carrying only roster-identity + derived display fields: `unitId`, `unitName`, `pilotId`, `chassisVariant`, derived `readiness`. Name MUST avoid `IUnitDamageState` collision.
- Migrate `useCampaignRosterStore.units: ICampaignUnitState[]` → `units: IRosterUnitProjection[]` (`src/stores/campaign/useCampaignRosterStore.ts`).
- Migrate `RosterStateCards.tsx` damage bar to read `currentArmorPerLocation` from `campaign.unitCombatStates[unitId]` against `IUnitMaxState.maxArmorPerLocation` denominator.
- Migrate `RosterStateDisplay.tsx` to consume the projection type.
- Migrate `CreateCampaignPage.tsx` construct site to build the projection (not the deleted state shape).
- Add `useMemo` / `zustand/shallow` selector contract for damage-bar derivation to avoid full re-renders on unrelated campaign-store writes.
- Delete `ICampaignUnitState` from `CampaignInterfaces.types.ts:113-136` (and `ICampaignRoster.units` field if unused after PR-B).
- Delete or repoint `IRecordMissionOutcomeInput.unitUpdates: Partial<ICampaignUnitState>[]` (replace with `Partial<IUnitCombatState>[]` keyed by unit id).
- Delete or migrate `getOperationalUnits()` in `CampaignInterfaces.runtime.ts` if it returned the old shape.
- Update `useCampaignRosterStore.test.ts` (~30 references) to use the projection type.

### Out

- Per-Part hit-count escalation (engine 1/2/3 → MP penalty escalation, gyro 1/2 → +3 PSR mod / destroyed). Spec carve-out tracked under "Deferred extensions" in `openspec/specs/campaign-unit-combat-state/spec.md`. Future change.
- Pilot consciousness on `ICampaignRosterEntry` (combat-resolution Wave 5 gate). Spec already records the ownership decision.
- Zustand `persist` migration callback (pre-release product, zero released users — `package.json: "version": "0.1.1", "private": true`). First load post-PR-C rebuilds localStorage from defaults.
- Salvage inventory (owned by `repair` spec).
- Damage application math (owned by `combat-resolution` spec).

## Approach

Domains touched:
- `campaign-management` (`ICampaign.unitCombatStates` slot promotion).
- `campaign-roster` (`useCampaignRosterStore` projection-type migration).
- `repair` (no change — already consumes `IUnitCombatState`).
- `after-combat-report` (no change — already produces outcomes the post-battle processor merges).

Pattern: a single canonical state type (`IUnitCombatState`) lives on `ICampaign.unitCombatStates`; UI consumes it directly via shallow selectors; the roster store holds only display projection. Mirrors MekHQ's `Unit.entity` ownership: one state object is the truth, displays derive from it, repair tickets diff against `IUnitMaxState`. No transient bridge type because we're a single TS process (MekHQ has `ResolveScenarioTracker` only because of MegaMek's IPC boundary).

PR sequencing:
- **PR-A** (S, ~1h): Type promotion + cast removal. Type-only change; integration round-trip tests verify shape.
- **PR-B** (M, ~2-3h): Roster store + UI consumer migration. Largest PR — touches stores, components, test fixtures.
- **PR-C** (S, ~30m): Final deletion. After PR-B lands, `ICampaignUnitState` has zero remaining production references.

Each PR is independently shippable and testable. PR-B should not start until PR-A merges (PR-B's UI changes assume `campaign.unitCombatStates` is the readable source).

## Test Strategy

- **PR-A verification**: `phase3RoundTrip.test.ts` and `phase4CampaignRoundTrip.test.ts` continue to pass with cast hacks removed. Type-checker (`npx tsc --noEmit --skipLibCheck`) confirms `unitCombatStates` is on `ICampaign`. Unit tests for `postBattleProcessor` and `repairQueueBuilderProcessor` continue to pass.
- **PR-B verification**: `useCampaignRosterStore.test.ts` (30+ references) updated to projection type, all passing. `RosterStateCards.tsx` damage bar renders correctly for: unit at full health, unit at 50% armor, unit with destroyed location. Storybook stories for both `RosterStateCards` and `RosterStateDisplay` render without errors. Manual verification: open dashboard, confirm no excess re-renders on day-advance / XP-gain (selector memoization works).
- **PR-C verification**: `grep -r "ICampaignUnitState" src/` returns zero hits. Full test suite passes (~22.5k tests). Type-check clean.

## References

- Council #3 decision: `openspec/council-decisions/2026-05-02-cluster-H5-unit-combat-state.md`
- Canonical spec: `openspec/specs/campaign-unit-combat-state/spec.md`
- Reference pattern: MegaMek `Entity` (`E:/Projects/megamek/megamek/src/megamek/common/units/Entity.java:455-461`) + MekHQ `Unit.setEntity()` (`E:/Projects/mekhq/MekHQ/src/mekhq/campaign/unit/Unit.java:527-540`)
