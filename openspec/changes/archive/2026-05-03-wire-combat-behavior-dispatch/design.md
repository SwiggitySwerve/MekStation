# Design: Wire Combat-Behavior Dispatch

## Technical Approach

The four archived combat-behavior changes each delivered a per-type combat-state struct (`IAerospaceCombatState`, `IProtoMechCombatState`, `IInfantryCombatState`, `IBattleArmorCombatState`) plus a factory (`create{Type}CombatState{,FromUnit}`) — but stopped short of wiring those structs into `IUnitGameState`, the canonical envelope that the reducer and renderer share. As a result, `unitStateToToken` has no source for per-type fields and the four token components carry inline `?? <default>` fallbacks at:

- `src/components/gameplay/UnitToken/AerospaceToken.tsx:45` (`token.altitude ?? 1`, `token.velocity ?? 0`)
- `src/components/gameplay/UnitToken/InfantryToken.tsx:83` (`token.infantryCount ?? 28`)
- `src/components/gameplay/UnitToken/BattleArmorToken.tsx:75` (`token.trooperCount ?? 4`)
- `src/components/gameplay/UnitToken/ProtoMechToken.tsx:60` (`token.protoCount ?? 5`, `token.isGlider ?? false`, `token.hasMainGun ?? false`)

This change closes the gap with one envelope on the state side, one projection adapter on the rendering side, and one redaction branch on the fog side. Future per-type variants (vehicle in PR9+) become additive type-checker-driven changes.

## Architecture Decisions

### Decision: Envelope per-type combat data inside `IUnitGameState`, not as a parallel map

**Choice**: Add an optional `combatState` field directly on `IUnitGameState` carrying a discriminated union keyed by `kind`.

**Rationale**: The Oracle ruling in Council #1 was specific: per-type combat data must travel inside the existing single-message multiplayer-sync envelope (one `IUnitGameState` blob per unit per turn). Side-channels (parallel `Record<unitId, IInfantryCombatState>` maps on `IGameState`) would force every reducer, replay, and sync layer to learn about a second channel, and would break event-sourced replay determinism the moment the two channels could disagree.

**Alternatives considered**:
- **Parallel map on `IGameState`** (`infantryStates: Record<string, IInfantryCombatState>`) — rejected. Two channels = two sources of truth for the same unit; replay determinism leaks.
- **Type-narrowed `IUnitGameState` union** (`IMechUnitGameState | IInfantryUnitGameState | ...`) — rejected for PR7. That is the PR8 token-side flip Hephaestus pushed back on; doing it on the state side first would force every existing reducer call-site to update simultaneously. Slot-first keeps PR7 small.
- **Make `combatState` non-optional** — rejected. The legacy mech-only init path and ~80 fixtures would all need to be touched in this PR; optional+assertion confines blast radius to the four supported per-type unit types.

### Decision: Single shared `unitStateToToken` adapter

**Choice**: Extract one `unitStateToToken` function (currently duplicated at `GameplayLayout.tsx:181` and `SpectatorViewPanels.tsx:19`) into a shared module under `src/lib/gameplay/` and have both call-sites import it. The adapter is the *only* place that narrows on `combatState.kind`.

**Rationale**: Two divergent copies were the immediate cause of the per-type fields never reaching the renderer — the spectator copy at `SpectatorViewPanels.tsx:19` doesn't even take a `fogProjection` parameter. Unifying now (a) eliminates that drift, (b) makes the projection rule discoverable in one place for the future `kind: 'vehicle'` variant, (c) lets the fog-redaction branch live in exactly one switch arm.

**Alternatives considered**:
- **Per-token-component projection** (each `<{Type}Token>` reads `combatState` itself) — rejected. Would push narrowing into the renderer, recreate the duplication problem one level lower, and break the fog-redaction one-liner.
- **Reducer enriches the token at state-construction time** — rejected. Tokens are a render-time projection, not state. Storing them in state would require keeping `IUnitToken` and `IUnitGameState` synchronized through every reducer.

### Decision: Init-time discriminated assertion (throw, do not warn)

**Choice**: `createInitialUnitState` throws when an `IGameUnit` whose `unitType` is one of the four supported per-type discriminants arrives without the construction inputs needed to seed `combatState`.

**Rationale**: Soft warnings would let session creation succeed with a partially-wired unit, then surface as silent renders or null-deref crashes mid-battle. Hard throws at session-init keep the failure adjacent to the cause (compendium adapter, lobby builder, test fixture). Replay-from-events is unaffected because event replay rebuilds state from `createInitialUnitState`'s output, which by definition will have already passed the assertion.

**Alternatives considered**:
- **Console warn + use defaults** — rejected. Defaults silently wrong-render and never get cleaned up.
- **Type-only narrowing (no runtime check)** — rejected. `IGameUnit` arrives from JSON loaders; the type system can't catch missing fields at the boundary.

### Decision: Fog redaction in the projection adapter, not in the renderer

**Choice**: The `unitStateToToken` adapter takes the existing `fogProjection` parameter, and when the unit is hidden it explicitly omits per-type fields from the returned `IUnitToken`.

**Rationale**: Renderer-level redaction would have to repeat itself across four token components, and could only redact what the renderer happens to read — easy to miss. Adapter-level redaction stops the leak at the type boundary; the renderer never sees the values. One line, one test, one place to add the next redacted field.

### Decision: Defer `IAerospaceCombatState.velocity`; add `altitude` now

**Choice**: Add `altitude` to `IAerospaceCombatState` (Oracle open question #1; verified absent during Phase-4.5). Leave `velocity` unwired with a `// TODO: wire from movement slice 2` comment; the projection adapter passes `velocity: undefined` for now.

**Rationale**: `altitude` is the field that drives the `isLanded` visual branch in `AerospaceToken` and is trivially seedable at battle start (default `1` matches today's hard-coded fallback). `velocity` is a movement-tick-derived value and properly belongs to "movement slice 2" in the aerospace roadmap; faking it here would entrench the wrong owner.

## Per-type slot shape (verbatim TS)

The discriminated-union slot added to `IUnitGameState` (in `src/types/gameplay/GameSessionInterfaces.ts`, after line 1396 and before the closing `}` on line 1397):

```ts
import type { IAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import type { IBattleArmorCombatState } from '@/types/gameplay';
import type { IInfantryCombatState } from '@/utils/gameplay/infantry/state';
import type { IProtoMechCombatState } from '@/utils/gameplay/protomech/state';

// Inside `interface IUnitGameState { ... }`:
/**
 * Per-type combat-behavior envelope.
 *
 * Per Council #1 (`openspec/council-decisions/2026-05-02-cluster-F-combat-
 * behavior-wiring.md`), aerospace / protomech / infantry / BA units carry
 * their per-type combat struct here so renderers and fog redaction read a
 * single channel. Mech and vehicle units leave this `undefined` until the
 * `kind: 'vehicle'` variant lands in PR9+.
 *
 * Producers: `createInitialUnitState` (initial seed); per-type reducers
 * (combat events update the inner `state` and replace the envelope).
 *
 * Consumers: `unitStateToToken` (projection); fog-of-war redaction.
 */
readonly combatState?:
  | { readonly kind: 'aero'; readonly state: IAerospaceCombatState }
  | { readonly kind: 'proto'; readonly state: IProtoMechCombatState }
  | { readonly kind: 'platoon'; readonly state: IInfantryCombatState }
  | { readonly kind: 'squad'; readonly state: IBattleArmorCombatState };
```

`altitude` added to `IAerospaceCombatState` (in `src/utils/gameplay/aerospace/state.ts`, after line 100):

```ts
/** Current altitude band (0 = landed; 1+ = airborne). Defaults to 1. */
altitude: number;
```

And in `createAerospaceCombatState` (lines 171-198):

```ts
export function createAerospaceCombatState(params: {
  // ... existing fields ...
  readonly altitude?: number;          // NEW (defaults to 1)
}): IAerospaceCombatState {
  return {
    // ... existing fields ...
    altitude: params.altitude ?? 1,    // NEW
  };
}
```

## Projection adapter sketch

A new file `src/lib/gameplay/unitStateToToken.ts` exporting the unified function. The two existing copies become thin re-exports.

```ts
import type { GameSide, IUnitGameState, IUnitToken } from '@/types/gameplay';
import { TokenUnitType } from '@/types/gameplay';
import { getSurvivingTroopers as baSurvivors } from '@/utils/gameplay/battlearmor/state';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

export interface IFogProjection {
  fogStatus?: 'lastKnown';
  lastKnownPosition?: { q: number; r: number };
  sensorRange?: number;
}

export function unitStateToToken(
  unitId: string,
  state: IUnitGameState,
  unitInfo: { name: string; side: GameSide },
  flags: {
    isSelected?: boolean;
    isValidTarget?: boolean;
    isActiveTarget?: boolean;
  } = {},
  fog: IFogProjection = {},
  isHidden = false,                                  // NEW: drives redaction
): IUnitToken {
  const designation = unitInfo.name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  const base: IUnitToken = {
    unitId,
    name: unitInfo.name,
    side: unitInfo.side,
    position: state.position,
    facing: state.facing,
    isSelected: flags.isSelected ?? false,
    isValidTarget: flags.isValidTarget ?? false,
    isActiveTarget: flags.isActiveTarget ?? false,
    isDestroyed: state.destroyed,
    designation,
    ...fog,
  };

  // Fog redaction: never project per-type combat data for hidden enemies.
  if (isHidden) {
    return base;
  }

  const cs = state.combatState;
  if (!cs) {
    return base; // mech / vehicle path — no per-type fields populated.
  }
  switch (cs.kind) {
    case 'aero':
      return {
        ...base,
        unitType: TokenUnitType.Aerospace,
        altitude: cs.state.altitude,
        // velocity intentionally omitted: TODO movement slice 2.
      };
    case 'platoon':
      return {
        ...base,
        unitType: TokenUnitType.Infantry,
        infantryCount: cs.state.survivingTroopers,
        platoonCount: 1,
      };
    case 'squad':
      return {
        ...base,
        unitType: TokenUnitType.BattleArmor,
        trooperCount: baSurvivors(cs.state),
      };
    case 'proto':
      return {
        ...base,
        unitType: TokenUnitType.ProtoMech,
        protoCount: 1, // single proto per IUnitGameState; point=multiple states.
        isGlider: cs.state.chassisType === ProtoChassis.GLIDER,
        hasMainGun: cs.state.hasMainGun,
      };
  }
}
```

## Multiplayer sync interaction

Per Oracle's gating ruling, all per-unit data flows in a single envelope (`IUnitGameState`) per turn. The `combatState` slot rides inside that same envelope — no parallel sync channel, no out-of-band update path. The reducer creates a new `IUnitGameState` (with a new `combatState` object when the inner per-type state changes); the multiplayer layer ships the diff per its existing JSON-patch / event-sourced strategy. Replay determinism is preserved because `createInitialUnitState` always produces the same seed for the same `IGameUnit`.

## Fog redaction interaction (one-line branch + test)

The redaction is a single `if (isHidden) return base;` early-return at the top of `unitStateToToken` (after constructing `base`, before the `combatState` switch). The accompanying test in `src/lib/gameplay/__tests__/unitStateToToken.test.ts` asserts:

```ts
it('redacts combatState-derived fields when isHidden=true', () => {
  const state = makeInfantryState({ survivingTroopers: 22 });
  const token = unitStateToToken('u1', state, info, {}, {}, /* isHidden */ true);
  expect(token.infantryCount).toBeUndefined();
  expect(token.platoonCount).toBeUndefined();
});
```

Caller wiring in `GameplayLayout.tsx` derives `isHidden` from the existing fog visibility branch (the `else` arm of `canPlayerSeeUnit` at lines 421-427) and passes it through to the adapter.

## File Changes

- **New**: `src/lib/gameplay/unitStateToToken.ts` — unified projection adapter + re-exports.
- **New**: `src/lib/gameplay/__tests__/unitStateToToken.test.ts` — adapter unit tests (per-type projection + fog redaction + missing-combatState mech path).
- **New**: `src/utils/gameplay/gameState/__tests__/initialization.combatState.test.ts` — seeding tests + assertion-throws tests for each of the four per-type unit kinds.
- **Modified**: `src/types/gameplay/GameSessionInterfaces.ts` — add `combatState?` discriminated-union slot at line 1397.
- **Modified**: `src/utils/gameplay/aerospace/state.ts` — add `altitude` field to `IAerospaceCombatState` and `altitude?` parameter (default 1) to `createAerospaceCombatState`.
- **Modified**: `src/utils/gameplay/gameState/initialization.ts` — branch on `unit.unitType` to seed `combatState` via the matching factory; throw on missing inputs.
- **Modified**: `src/components/gameplay/GameplayLayout.tsx` — replace local `unitStateToToken` (line 181) with shared import; pass `isHidden` to adapter.
- **Modified**: `src/components/gameplay/SpectatorViewPanels.tsx` — replace local `unitStateToToken` (line 19) with shared import.
- **Modified**: `src/components/gameplay/UnitToken/AerospaceToken.tsx` — remove `?? 1` and `?? 0` defaults (lines 45-46).
- **Modified**: `src/components/gameplay/UnitToken/InfantryToken.tsx` — remove `?? 28` default (line 83); also remove `?? 1` from `platoonCount` (line 84).
- **Modified**: `src/components/gameplay/UnitToken/BattleArmorToken.tsx` — remove `?? 4` default (line 75).
- **Modified**: `src/components/gameplay/UnitToken/ProtoMechToken.tsx` — remove `?? 5`, `?? false`, `?? false` defaults (lines 60-62).
- **Modified**: existing test fixtures and Storybook stories that build `IUnitGameState` for non-mech types — add the matching `combatState` slot OR add `unitType: 'BATTLEMECH'` to the stub `IGameUnit` so the mech path is taken. Specific files surfaced in tasks §8.
