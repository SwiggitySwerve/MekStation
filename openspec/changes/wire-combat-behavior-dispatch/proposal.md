# Wire Combat-Behavior Dispatch

## Intent

The four archived per-type combat-behavior changes (`add-aerospace-combat-behavior`, `add-protomech-combat-behavior`, `add-infantry-combat-behavior`, `add-battlearmor-combat-behavior`) each declare per-unit combat state at `unit.combatState.{aero|proto|platoon|squad}` — yet `IUnitGameState` carries no such slot today. As a result, four token components (`AerospaceToken`, `InfantryToken`, `BattleArmorToken`, `ProtoMechToken`) silently fall back to hard-coded defaults (altitude=1, troopers=28, troopers=4, protos=5) for every render. Council #1 (`openspec/council-decisions/2026-05-02-cluster-F-combat-behavior-wiring.md`) ruled "wire it via Oracle's discriminated-union slot" so the existing per-type combat factories actually reach the renderer.

This change ships the missing dispatch wiring as PR7 of two: it (a) introduces the `IUnitGameState.combatState?` discriminated-union slot, (b) seeds it from the existing `create{Type}CombatState` factories at session-init time, (c) projects it into `IUnitToken` via a single shared adapter, and (d) removes the four `?? <default>` fallbacks. PR8 (out of scope here) will follow with the discriminated-union flip of `IUnitToken` itself.

## Scope

### In

- Add `IUnitGameState.combatState?` discriminated-union slot in `src/types/gameplay/GameSessionInterfaces.ts` (kinds: `aero` / `proto` / `platoon` / `squad`).
- Verify `IAerospaceCombatState.altitude` field existence; add it when absent (Oracle-flagged open question #1).
- Seed `combatState` in `createInitialUnitState` (`src/utils/gameplay/gameState/initialization.ts`) using existing factories: `createAerospaceCombatState`, `createInfantryCombatStateFromUnit`, `createProtoMechCombatState`, `createBattleArmorCombatState`.
- Add type-discriminated assertion in init: throw when an aerospace / proto / infantry / BA `IGameUnit` arrives without the inputs needed to seed `combatState`.
- Write a single `unitStateToToken` projection adapter that narrows on `combatState.kind` and populates per-type token fields (`altitude`, `velocity`, `infantryCount`, `trooperCount`, `protoCount`, `isGlider`, `hasMainGun`).
- Unify the two divergent `unitStateToToken` copies (`src/components/gameplay/GameplayLayout.tsx:181`, `src/components/gameplay/SpectatorViewPanels.tsx:19`) onto the new shared adapter.
- Remove the four token-component `?? <default>` fallbacks (`AerospaceToken.tsx:45-46`, `InfantryToken.tsx:83-84`, `BattleArmorToken.tsx:75`, `ProtoMechToken.tsx:60-62`).
- Add fog-of-war redaction branch: explicitly strip `combatState` (and the projected per-type fields) for hidden-enemy tokens so structure / trooper counts cannot leak through `lastKnown` projections.
- Update unit-test fixtures and Storybook stories that build `IUnitGameState` or `IUnitToken` for non-mech types so the new slot is present and the renderers receive concrete values.

### Out

- **Customizer TODOs** (`BattleArmorPipGrid.tsx:52`, `InfantryPlatoonCounter.tsx:33`) — design-time customizer components with misattributed comments (council ruling). Separate cleanup.
- **Re-authoring the 4 archived specs** — the missing artefact is one new dispatch spec, not four reruns (council ruling).
- **Vehicle combat-state migration** — `IVehicleCombatState` lives in a parallel structure; plan for a fifth `kind: 'vehicle'` variant in PR9+ (council ruling).
- **Discriminated-union flip of `IUnitToken`** — PR8 follow-up (~1.5 days, type-checker driven). Closes Momus's god-type concern; out of scope here.
- **`IAerospaceCombatState.velocity`** — genuinely missing. Defer with a TODO pointing at "movement slice 2" (Oracle open question #2).

## Approach

Domains touched:
- `game-state-management` (`IUnitGameState.combatState` slot + `createInitialUnitState` seeding + discriminated-union assertion).
- `tactical-map-interface` (single shared `unitStateToToken` projection adapter; removal of four token-default fallbacks).
- `fog-of-war` (redaction branch that strips `combatState` and per-type token fields for hidden enemies).

Pattern: a typed *envelope* on the game-state side (immutable per-unit slot keyed by `kind`) plus a *projection adapter* on the rendering side. The envelope keeps Oracle's single-message multiplayer sync model intact (one `IUnitGameState` blob per unit per turn — no parallel side-channels). The projection adapter is the only place that ever narrows on `combatState.kind`, so adding the future `kind: 'vehicle'` variant becomes an additive type-checker-driven change.

## Test Strategy

- Infrastructure: exists (Jest + ts-jest + storybook, see `MEMORY.md` "CI Infrastructure (2026-04-24)").
- Tests: tests-after — implementation tasks land first; unit-test additions in §8 of tasks.md cover (a) `createInitialUnitState` seeds the right `kind` per `IGameUnit.unitType`, (b) `unitStateToToken` populates per-type fields from the envelope, (c) fog redaction strips `combatState` and projected per-type fields for hidden enemies, (d) the init-time assertion throws on missing inputs.
- Agent QA: `npx tsc --noEmit` clean, `npm test` clean, `npm run validate-bv` parity = 0 deltas (BV calc untouched), `npm run lint` + `oxfmt --check` clean. Storybook fixtures for each per-type token render visibly identical to pre-change snapshots when the envelope provides values that match the old defaults.
