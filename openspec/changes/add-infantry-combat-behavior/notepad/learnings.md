# Learnings — add-infantry-combat-behavior

## [2026-04-18] Prior Wave Patterns
- Wave 3 (vehicle + aerospace combat) established a consistent module layout:
  - Vehicle combat: flat files (`src/utils/gameplay/vehicleDamage.ts`, `motiveDamage.ts`, etc.)
  - Aerospace combat: folder layout `src/utils/gameplay/aerospace/` with `state.ts`, `events.ts`, `damage.ts`, `dispatch.ts`, `index.ts`, etc.
  - **Proposal says flat files** (`infantryDamage.ts`, `infantryMorale.ts`, `fieldGunFire.ts`) but the scope now spans many concerns. Using a folder (`src/utils/gameplay/infantry/`) mirroring the aerospace pattern is cleaner. Both are acceptable.
- `damageDispatch.ts` currently knows about mech + vehicle only. Adding infantry means extending the discriminated union.
- GameEngine does NOT currently call `dispatchDamage` — wiring is deferred. That matches Wave 3's "simulation harness deferred" pattern.

## [2026-04-18] Infantry Canonical Types
- `IInfantry` lives in `src/types/unit/PersonnelInterfaces.ts` (NOT InfantryInterfaces.ts, which holds the construction-side details).
- `platoonStrength` = total troopers.
- `isInfantry(unit)` is the type guard already exported.
- `fieldGuns: readonly IInfantryFieldGun[]` — each has `equipmentId`, `name`, `crew`.
- `hasAntiMechTraining`, `canSwarm`, `canLegAttack`, `isAugmented` all on the interface.

## [2026-04-18] Combat-state pattern
- Aerospace: `IAerospaceCombatState` lives in `aerospace/state.ts`, created via `createAerospaceCombatState()`. NEVER mutates the construction-side `IAerospace` interface. The combat engine owns this separate state object.
- Infantry must follow the same pattern: build an `IInfantryCombatState` separate from `IInfantry`.

## [2026-04-18] Event pattern
- Discriminated union with a `type` enum (e.g. `AerospaceEventType.SI_REDUCED`).
- Each event has `readonly unitId: string` plus payload.
- Events returned inside the damage result (`events: readonly AerospaceEvent[]`) — not pushed to a bus by the resolver itself.

## [2026-04-18] Dice roller pattern
- `D6Roller` from `diceTypes.ts` — inject it as an optional param, default to `defaultD6Roller`. This keeps resolvers deterministic in tests.

## [2026-04-18] Tooling commands
- `npx tsc --noEmit -p .` — fastest TS check
- `npx jest src/utils/gameplay/infantry/__tests__/ --runInBand` — run just infantry suites
- `npx oxfmt --check <file>` — check format
- `npx oxfmt --write <file>` — auto-format
- `npx oxlint <file>` — lint
