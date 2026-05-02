# Council #1 Decision — Cluster F: Combat-Behavior Wiring TODOs

**Date**: 2026-05-02
**Variant**: Lean+ (5 Phase-2 seats + Phase 3 cross-attack)
**Verdict**: VERIFIED (Phase 4.5 Haiku)
**Survival Score**: 8/10

## Question

For 7 `// TODO: remove default when add-X-combat-behavior wires...` markers in MekStation, choose between:
- **(a) FIX-FORWARD** — re-author 4 archived openspec changes (`add-protomech-combat-behavior`, `add-infantry-combat-behavior`, `add-battlearmor-combat-behavior`, `add-aerospace-combat-behavior`) to wire the data flow.
- **(b) DELETE-DEFAULTS** — remove silent defaults; force callers to pass explicit values.

## Decision

**WIRE IT — via Oracle's `IUnitGameState.combatState?` discriminated-union slot. Ship in two sequential PRs.**

### PR7 — `wire-combat-behavior-dispatch` (~1 day)

1. Add `IUnitGameState.combatState?` discriminated-union slot in `src/types/gameplay/GameSessionInterfaces.ts:1397`:
   ```ts
   readonly combatState?:
     | { readonly kind: 'aero'; readonly state: IAerospaceCombatState }
     | { readonly kind: 'proto'; readonly state: IProtoMechCombatState }
     | { readonly kind: 'platoon'; readonly state: IInfantryCombatState }
     | { readonly kind: 'squad'; readonly state: IBattleArmorCombatState };
   ```
   (Verbatim match to all 4 archived spec.md files — `unit.combatState.{aero|proto|platoon|squad}`.)
2. Seed `combatState` in `src/utils/gameplay/gameState/initialization.ts` `createInitialUnitState` using existing `create{Type}CombatState` factories.
3. Write projection adapter in `unitStateToToken` (`src/components/gameplay/GameplayLayout.tsx:181`) that narrows on `combatState.kind` and populates per-type fields.
4. **Unify** the two divergent `unitStateToToken` copies (`GameplayLayout.tsx:181` + `SpectatorViewPanels.tsx:19`).
5. Remove the 4 token-component `?? <default>` defaults.
6. Add type-discriminated assertion in init: throw if `unitType === 'aerospace' && !combatState`.
7. Add fog redaction branch — explicitly strip `combatState` for hidden units (don't leak structure counts).
8. Author one NEW openspec change `wire-combat-behavior-dispatch` (NOT re-author the 4 archived specs).

### PR8 — discriminated-union token flip (~1.5 days)

Pure type refactor of `IUnitToken` from flat-with-optionals into `IMechToken | IVehicleToken | IAerospaceToken | IBattleArmorToken | IInfantryToken | IProtoMechToken`. Type-checker drives ~36 file edits + 12 test files mechanically. Closes Momus's god-type concern.

## Out of scope

- **Customizer TODOs** (`BattleArmorPipGrid.tsx:52`, `InfantryPlatoonCounter.tsx:33`) — design-time customizer components with misattributed comments. Separate cleanup.
- **Re-authoring the 4 archived specs** — they were intentionally archived with dispatch wave deferred. The missing artifact is ONE new dispatch spec, not 4 re-runs.
- **Vehicle combat-state migration** — `IVehicleCombatState` exists in a parallel structure. Plan for 5th `kind: 'vehicle'` variant in PR9+; do not ship in this cluster.

## Open questions tracked

1. **`IAerospaceCombatState.altitude` field existence** — Oracle flagged unverified. PR7 must verify; if absent, add it.
2. **`velocity` source** — genuinely missing on `IAerospaceCombatState`. Defer with TODO pointing at "movement slice 2."
3. **Fog redaction for `combatState`** — Oracle flagged: must explicitly strip combatState for hidden units.

## Phase 4.5 Verifier (VERIFIED)

All 4 deciding facts confirmed:
1. Archived spec text cites `unit.combatState.{aero|proto|platoon|squad}` verbatim ✓
2. `IUnitGameState` (line 1307-1410) has no per-type combat slot today ✓
3. Two divergent `unitStateToToken` copies exist (no import relationship) ✓
4. Production today never sets `unitType` on tokens — all non-mech token rendering is dead ✓

## Preserved dissent

- **Hephaestus** preferred keeping `IUnitToken` flat (Survival 8/10). Oracle's Phase-3 ruling overrode by splitting into PR7 (slot) + PR8 (union flip).
- **Momus's "Metis 20-line claim BUSTED"** — partially true; the slot prerequisite is real plumbing (~1 day, not 20 lines). Synthesis honors this.

## Council seats

| Seat | Position | Survival | Model |
|---|---|---|---|
| Hephaestus | proposer-wire (flat tokens) | 8/10 | opus |
| Prometheus | proposer-delete (discriminated-union tokens) | 9/10 | opus |
| Oracle | architecture (gating ruling) | n/a | opus |
| Explore-Deep | call-graph facts | n/a | sonnet |
| Momus | adversary | n/a | sonnet |
| Phase-3 Oracle | cross-attack (split A/B/C → B) | n/a | opus |
| Phase 4.5 verifier | VERIFIED | n/a | haiku |
