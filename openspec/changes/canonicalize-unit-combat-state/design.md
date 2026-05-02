# Design: Canonicalize Unit Combat State

> Source-of-truth references: Council #3 decision at `openspec/council-decisions/2026-05-02-cluster-H5-unit-combat-state.md` and canonical spec at `openspec/specs/campaign-unit-combat-state/spec.md`. This document covers implementation-level design decisions only.

## Decision: Type promotion shape

`ICampaign` gains a single new field. The `Record<string, IUnitCombatState>` shape (rather than `Map`) keeps serialization free for free under the existing JSON-friendly campaign persistence pipeline.

```ts
// src/types/campaign/Campaign.ts
export interface ICampaign {
  // ... existing fields ...

  /**
   * Canonical post-deploy combat state per unit, keyed by unitId.
   * Populated by createInitialCombatState at first deploy, updated by
   * postBattleProcessor, reset by repair completion. Absent entry means
   * unit not yet deployed (or combat state was reset post-repair).
   *
   * See openspec/specs/campaign-unit-combat-state/spec.md for the
   * canonical shape contract and idempotency rules.
   */
  readonly unitCombatStates: Readonly<Record<string, IUnitCombatState>>;
}
```

Rationale:
- `Record` (not `Map`) — matches existing `ICampaign` field serialization patterns (`forces`, `personnel` are exceptions on the way out via Cluster E).
- `Readonly` wrapper — consistent with the rest of `ICampaign` immutability conventions.
- Required field (not `?`) — pre-release / hard-cutover policy. Initialize empty `{}` for fresh campaigns; serialization always emits the field.

## Decision: Roster projection type shape and naming

Name: `IRosterUnitProjection` (NOT `IUnitDamageState` — collides with definitions in `lib/combat/acar.ts`, `utils/gameplay/damage/types.ts`, current roster store).

```ts
// src/stores/campaign/useCampaignRosterStore.ts (or new file src/types/campaign/RosterUnitProjection.ts)
export interface IRosterUnitProjection {
  readonly unitId: string;
  readonly unitName: string;
  readonly pilotId?: string;
  readonly chassisVariant: string;
  readonly readiness: 'Ready' | 'Damaged' | 'Destroyed';
}

// Derive readiness from canonical state — does NOT belong on the projection itself
// (the projection caches it for selector stability, but the source-of-truth derivation
// lives in a helper that takes IUnitCombatState).
export function deriveRosterReadiness(state: IUnitCombatState | undefined): 'Ready' | 'Damaged' | 'Destroyed' {
  if (!state || !state.combatReady) return 'Destroyed';
  // Unit-deployed-but-clean = Ready; deployed-with-damage = Damaged
  const hasDamage =
    Object.values(state.currentArmorPerLocation).some((a, i, arr) => /* compare against max */ false) ||
    state.destroyedComponents.length > 0;
  return hasDamage ? 'Damaged' : 'Ready';
}
```

Rationale for the projection:
- 5 fields, all display-only — no damage state, no repair cost, no ammo.
- `readiness` is derived but cached on the projection so Zustand subscribers don't re-render on unrelated combat-state changes.
- Selector contract: components subscribe to `useCampaignRosterStore((s) => s.units)` (shallow-stable) for the projection list, then look up `IUnitCombatState` separately when needed (e.g., damage bar).

## Decision: Selector memoization for damage bar

`RosterStateCards.tsx` damage bar reads from canonical state. To avoid re-renders on every unrelated campaign-store write:

```tsx
// In RosterStateCards.tsx
const damageBarData = useCampaignStore(
  useShallow((state) => {
    const combatState = state.campaign.unitCombatStates[unitId];
    const maxState = state.campaign.unitMaxStates?.[unitId];
    if (!combatState || !maxState) return null;
    return {
      armorRatio: computeArmorRatio(combatState, maxState),
      structureRatio: computeStructureRatio(combatState, maxState),
      destroyedCount: combatState.destroyedComponents.length,
    };
  })
);
```

`useShallow` from Zustand prevents re-render unless the computed object's fields actually change. Per-frame stability for the most common case (no damage change between renders).

## Decision: Init-time campaign creation

Fresh campaigns start with `unitCombatStates: {}`. Units are added via `createInitialCombatState` at deploy time (existing factory at `src/types/campaign/UnitCombatState.ts:84`). The campaign creation flow at `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.tsx` does NOT seed combat states — that happens later in the deploy flow.

## Decision: Migration of `IRecordMissionOutcomeInput.unitUpdates`

Current: `unitUpdates: readonly Partial<ICampaignUnitState>[]` (line 335 of `CampaignInterfaces.types.ts`).

Replacement options considered:
1. `unitUpdates: readonly Partial<IUnitCombatState>[]` keyed implicitly by entry order — REJECTED, fragile.
2. `unitUpdates: Readonly<Record<string, Partial<IUnitCombatState>>>` keyed by unitId — CHOSEN. Explicit, lookup-friendly, matches `unitCombatStates` map shape.
3. Delete the field if no consumer reads it — INVESTIGATE first; might be the case.

PR-C task includes a grep for `unitUpdates` consumers before committing to option 2 vs option 3.

## Decision: No persist migration callback

Pre-release product (`package.json: "version": "0.1.1", "private": true`). Zero released users. Zustand `persist` middleware will rehydrate localStorage with the deleted shape on first load post-PR-C. The load will silently produce undefined fields, the store will reset to defaults, the user sees an empty roster.

This is acceptable because:
1. No production users affected.
2. Hard-cutover policy explicitly endorsed by user.
3. Adding a `version` bump + `migrate` callback would be carrying compat code for zero users.

If post-release this becomes an issue, the conventional Zustand `version` + `migrate` pattern is well-documented and trivially additive.

## Decision: Test coverage strategy

PR-B is the riskiest. Tests required:
- **Snapshot regression**: `RosterStateCards` storybook snapshot at full health, 50% armor, full damage. Catches projection-shape errors.
- **Selector memoization test**: render `RosterStateCards` once, dispatch unrelated campaign-store action (e.g., `addPersonnel`), assert no re-render. Use `@testing-library/react` `renderHook` with a render counter.
- **Round-trip integration**: `phase3RoundTrip.test.ts` and `phase4CampaignRoundTrip.test.ts` continue passing with both cast removal (PR-A) and roster store migration (PR-B).

## Decision: PR-A blocking on PR-B

PR-A (type promotion) does NOT block on PR-B. PR-A removes 5 sites total: 3 test casts + 2 local `ICampaignInput` interfaces. PR-B touches the roster store + UI which still type-check independently (the cast hack stays in roster store land until PR-B addresses it directly).

PR-B DOES block on PR-A: the new `RosterStateCards` damage bar reads `campaign.unitCombatStates[unitId]` directly, which only type-checks after PR-A promotes the field.

PR-C blocks on PR-B: `ICampaignUnitState` cannot be deleted until the roster store has been migrated off it.

## Open questions (to verify during PR-A)

1. Does `ICampaign` already use any field that conflicts with `unitCombatStates` naming? (Unlikely, but grep.)
2. Does `phase3RoundTrip.test.ts:320` cast pattern leak into other test files we missed in the Phase 2 scan?
3. Is `IRecordMissionOutcomeInput.unitUpdates` actually consumed anywhere or is it dead?

PR-A author should grep these BEFORE committing the type promotion.
