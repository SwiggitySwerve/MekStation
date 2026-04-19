# Protomech Combat — Accumulated Learnings

## Architecture choice

- Follow the AEROSPACE pattern: subfolder at `src/utils/gameplay/protomech/` with one module per concern (`state.ts`, `events.ts`, `hitLocation.ts`, `damage.ts`, `criticalHits.ts`, `physicalAttacks.ts`, `glider.ts`, `pointFire.ts`, `heat.ts`, `aiBehavior.ts`, `dispatch.ts`, `index.ts`). Vehicle combat put everything in flat files; aerospace switched to subfolder — proto uses subfolder.
- Combat state lives in a separate interface (`IProtoMechCombatState`), NOT on `IProtoMechUnit`. Construction data stays immutable.
- Events emitted via a discriminated-union `ProtoEvent` (mirrors aerospace pattern), NOT attached to the global `GameEventType` enum. This keeps the touched surface area small.

## Key proto invariants

- 5-proto Clan Point — point fire is opt-in (default: 5 independent protos)
- Hit table is 6-entry (Head, Torso, MainGun, LeftArm, RightArm, Legs); Quad uses FrontLegs/RearLegs instead of arms+legs
- Damage is armor-then-structure, NO cross-location transfer — excess discarded
- Head or Torso destruction = proto destroyed; MainGun destruction removes weapon but proto survives; Legs = immobilized
- TAC trigger = roll of 2 (from tasks 3.1-3.3)
- Crit table: 2-7 none, 8-9 equipment, 10-11 engine (1st = -1 MP, 2nd = destroyed), 12 pilot killed (proto abandoned)
- Physical: kick = floor(tonnage/2), punch = floor(tonnage/5); no main-gun melee; quad cannot punch
- Glider: +1 TMM, any structure-exposing hit → fall roll vs TN 7, failure = 10×altitude damage + altitude reset
- Heat baseline: 2 engine-integrated heat sinks, shutdown check at heat ≥ 4

## Spec dice-roller convention

- Use `D6Roller` (returns single d6) from `./diceTypes` for all 2d6 rolls
- `roll2d6(diceRoller)` → `{dice: [d1, d2], total, isSnakeEyes, isBoxcars}`
- Tests inject deterministic rollers

## Direction semantics (matches vehicle)

- `'front' | 'left' | 'right' | 'rear'` — same pattern as VehicleAttackDirection
- Attack direction = which facing of the target the shot strikes

## Quad chassis special case

- `armorByLocation` keys are `FrontLegs` + `RearLegs` + `Head` + `Torso` + (optional `MainGun`)
- No `LeftArm`/`RightArm` entries at all
- Hit-table lookup for 3-4 "RightArm" and 8-9 "LeftArm" re-routes to FrontLegs and RearLegs respectively for Quad (per the BattleTech proto rules — quads have no arms to hit)

## Why no full GameEventType integration

- Vehicle combat DID add events to `GameEventType` enum. Aerospace went the discriminated-union route.
- Proto follows aerospace. Keeps `GameSessionInterfaces.ts` un-bloated and leaves wiring to the integration PR.
- Integration tests that would need GameEngine dispatch are DEFERRED (same pattern Wave 3 vehicle used for some integration scenarios).

## Verify commands

- `npx jest --testPathPattern="protomech" --silent` — run all proto tests
- `npx tsc --noEmit -p .` — typecheck
- `npx oxfmt --check <paths>` and `npx oxlint <paths>` — per spec
