# Change: Add Aerospace Deployment

## Why

Aerospace units are constructed end-to-end today via the `aerospace-unit-system` capability (1351-LOC spec covering chassis, tonnage, armor-by-arc, thrust ratings, fuel, structural integrity, BLK round-trip, BV calculation, customizer UI). They have a minimal `Aerospace Combat State` requirement (combatState shape only). The `combat-resolution` capability ships `Aerospace Combat Dispatch`, `Aerospace Damage Chain`, and `Aerospace Control Roll` requirements — damage-side coverage. The `movement-system` capability ships `Aerospace 2D Simplified Movement`, `Fuel Consumption per Turn`, and `Fly-Over Strafe Movement` for Phase 6 simplification — a 2D no-altitude model.

What is missing — the gap surfaced by the Wave 7 OMO Council Librarian's sizing assessment (3-5× ground vehicle scope, MegaMek `Aero.java` is 99KB) — is the **deployment-and-flight layer**: the 3D thrust/velocity/altitude model, atmospheric vs space rule distinction, full aero-to-aero combat, aero-to-ground attack envelope (strafing as it exists today is a 2D path-attack — the airborne fighter envelope is bigger), dogfighting, landing/takeoff transitions, ground-grounded interaction, off-map exit and re-entry orchestration tied to the new altitude state.

The current 2D-simplified model was always meant as Phase-6 expediency. The 3D thrust/velocity/altitude model is what tabletop-canonical Aerospace combat actually looks like — and players importing MegaMek-derived aerospace scenarios need parity. This change establishes the spec authority for **a single deployment mode**: atmospheric 3D with altitude levels 0-10 (matching MegaMek Aero's altitude scale), velocity in thrust points carried between turns, the control-roll-on-velocity-mismatch rule, the dogfight resolution, the air-to-ground attack table, the strafe envelope at altitude.

**Scope discipline**: Aerospace **deployment + flight + combat** for ASF, conventional fighters, and small craft on the **standard tactical map**. Out: dropships, jumpships, warships (each gets its own Wave-8+ change). Out: AeroTech II strategic-map operations / jump-point combat (separate domain entirely). Out: orbit-to-surface bombardment (artillery domain). Out: VTOL/hover (those are ground units with `movement-system` jurisdiction — a small delta change `update-vtol-hover-mp-modifiers` is named as a future follow-up). Bombs ARE in (bomb-bay loadout already exists in `aerospace-unit-system` — Apply wave needs to wire the runtime drop). Atmospheric vs space rules ARE in (rule deltas between the two — space removes altitude bands, changes thrust mechanics, removes terrain).

**Apply deferral**: per the prompt, this change authors the spec only; Apply wave is deferred to its own dedicated Wave (likely Wave 9). The Apply work is sized at 3-5× ground-vehicle scope and would risk swamping Wave 7's other work.

## What Changes

### Capability deltas

- **NEW `aerospace-deployment`** — first-class capability for airborne aerospace combat:

  - ADDED **Altitude Bands**: altitude levels 0–10 representing nap-of-earth (0 = grounded), low (1–3), medium (4–6), high (7–10). Tactical map = altitudes 0–10; orbit transition at altitude 11+ leaves the tactical map for the strategic layer (out of scope this change). Mirrors MegaMek `Aero` altitude scale.
  - ADDED **Velocity in Thrust Points**: `currentVelocity` and `nextVelocity` in thrust points. Velocity persists across turns; movement next turn = `currentVelocity` hexes minimum (forced forward motion). Velocity changes by ±1 per thrust point spent (accelerate or decelerate). Atmospheric units halve velocity at altitude 0 (grounded landing); space units have no velocity halving.
  - ADDED **Safe vs Max Thrust Discrimination**: `safeThrust` is the unit's construction stat; `maxThrust = floor(safeThrust × 1.5)`. Spending more than safeThrust per turn SHALL require a Control Roll. Spending more than maxThrust SHALL be forbidden (movement rejected).
  - ADDED **Atmospheric vs Space Rule Toggle**: each scenario SHALL carry a `mapEnvironment: 'atmospheric' | 'space'` flag. Atmospheric environment SHALL apply terrain effects, gravity-driven altitude loss for grounded aero, velocity-halving at altitude 0; space SHALL not. The toggle SHALL be scenario-level, not per-unit.
  - ADDED **Forced Forward Motion**: an aero unit with `currentVelocity > 0` MUST move at least `currentVelocity` hexes in its facing direction each turn or take a control roll. Failing to move sufficient distance is treated as a stall.
  - ADDED **Turn Cost**: turning is limited to ≤ 60° per thrust point spent on turning. Sharper turns require multiple thrust points consumed in sequence. Mirrors MegaMek `Aero` turn-cost mechanics.
  - ADDED **Altitude Change Cost**: ascending one altitude band costs 2 thrust points; descending one altitude band is free but applies a +1 thrust to the unit's velocity (gravity assist). At altitude 0 the unit is grounded; ascending from 0 requires "takeoff" (2 thrust + control roll). Mirrors `Aero.checkAscend()` / `checkDescend()`.
  - ADDED **Stall and Crash Conditions**: failing a control roll while at altitude > 1 SHALL drop altitude by 1; failing at altitude 1 SHALL crash the unit (destroy). At velocity 0 in atmospheric environment, a control roll SHALL fail automatically. Mirrors MegaMek's stall/crash check chain.
  - ADDED **Air-to-Ground Attack Envelope**: an airborne aero may declare air-to-ground attacks against ground targets within its movement path this turn. To-hit modifier: `+2 base` (per existing strafe rule) + altitude modifier (`+0 at low, +1 at medium, +2 at high`). Available weapons: Nose-arc + Wing-arc forward firing weapons. Mirrors MegaMek's air-to-ground attack table.
  - ADDED **Air-to-Air Combat**: two airborne aero units in the same hex AND within ±2 altitude bands SHALL be eligible for air-to-air combat. To-hit modifier: `+0 base for forward-arc shot`, `+1 each for left/right-wing-arc shot`, `+3 for aft-arc shot`. Hit-location uses the existing `aerospaceResolveDamage()` per `combat-resolution`. Velocity differential applies an additional `+1` per 2 hexes of velocity difference. Mirrors MegaMek Aero combat tables.
  - ADDED **Dogfight Initiation**: opposing airborne aero in the same hex at same altitude SHALL be able to initiate a dogfight (mutually-declared, multi-round close-combat exchange). Dogfights resolve at the end of the movement phase using simultaneous declarations; both sides SHALL get a forward-arc shot at each other. Mirrors MegaMek's dogfight resolution.
  - ADDED **Strafe Path Update**: strafe path attacks SHALL apply altitude modifier to the existing `Fly-Over Strafe Movement` to-hit penalty in addition to the existing +2.
  - ADDED **Landing and Takeoff**: a grounded aero (altitude 0) SHALL be a stationary or rolling-on-runway unit; takeoff transitions to airborne with altitude 1 + initial velocity = safeThrust (paid in thrust points). Landing transitions from altitude 1 + velocity ≤ safeThrust to altitude 0 (rolling on runway over N hexes equal to landing-velocity).
  - ADDED **Bomb Drop Resolution**: aero with bombs loaded SHALL be able to declare bomb-drop attacks against ground hexes during movement. Bombs follow a deviation table (2d6 scatter from declared target hex per altitude). Bomb damage SHALL apply to the deviated hex per the existing bomb explosives rules. Mirrors MegaMek `BombType` resolution.
  - ADDED **Off-Map Exit / Re-Entry Tied to Altitude**: extends the existing 2D `AerospaceExited` / `AerospaceEntered` events to record exit altitude and velocity; re-entry SHALL preserve altitude and velocity from exit.

- **MODIFIED `combat-resolution`** — extend the existing `Aerospace Combat Dispatch` to handle the 3D model:
  - ADDED **Air-to-Air Dispatch**: when both attacker and target are airborne aero, route to the air-to-air resolver (delegates to existing `aerospaceResolveDamage` for damage application but uses air-to-air to-hit modifiers).
  - ADDED **Air-to-Ground Dispatch**: when attacker is airborne aero and target is a ground unit, route to the air-to-ground resolver.
  - ADDED **Ground-to-Air Dispatch**: when attacker is a ground unit and target is airborne aero, apply altitude-tier to-hit penalty: `+1 low`, `+2 medium`, `+3 high`; legal weapon types: any direct-fire weapon with sufficient range; indirect-fire weapons SHALL NOT engage airborne targets.

- **MODIFIED `unit-entity-model`** — formalize aerospace altitude + velocity at the entity-model level:
  - MODIFIED **Component References**: aerospace units' component references SHALL include `altitude`, `currentVelocity`, `nextVelocity` as part of the runtime combat-state shape (previously combat-state held only `currentSI`, `armorByArc`, `heat`, `fuelRemaining`, `controlRollsFailed`, `thrustPenalty`, `offMap`, `offMapReturnTurn` per `aerospace-unit-system`).

- **MODIFIED `movement-system`** — supersede the 2D-simplified aerospace movement with a 3D model when `mapEnvironment` is set:
  - MODIFIED **Aerospace 2D Simplified Movement**: remains valid as a fallback when `scenarioOptions.aerospaceMode === '2d-simplified'` (legacy). When `aerospaceMode === '3d-tactical'` (new default), the aerospace-deployment 3D rules SHALL apply.
  - MODIFIED **Fly-Over Strafe Movement**: gain the altitude-modifier to-hit per the new `Strafe Path Update` requirement in `aerospace-deployment`.

### Code touch points (Apply Wave — DEFERRED to its own future wave)

This change authors the spec only. The Apply wave is estimated at ~25-40 files, ~3000-5000 LOC, across engine/movement/combat/types/event-log/UI. Likely structure:

- `src/engine/InteractiveSession.ts` — aerospace movement-declaration handlers, altitude transitions, control-roll triggers
- `src/lib/movement/aerospaceMovement.ts` (new) — thrust accounting, velocity carry, turn cost, altitude change cost, stall/crash detection (~800-1000 LOC)
- `src/lib/combat/aerospaceCombat.ts` (new) — air-to-air, air-to-ground, ground-to-air resolvers; dogfight resolution (~600-800 LOC)
- `src/lib/combat/bombResolution.ts` (new) — bomb deviation table + damage (~200-300 LOC)
- `src/lib/combat/combatResolution.ts` — aerospace dispatch branches
- `src/types/gameplay/CombatInterfaces.ts` — extend `IAerospaceCombatState` with altitude/velocity, add ~15 new event types
- `src/types/gameplay/GameplayUIInterfaces.ts` — resolve the existing `IAerospaceToken.velocity` TODO, add takeoff/landing/dogfight UI hints
- `src/components/gameplay/UnitToken.tsx` — render altitude badge, velocity arrow, airborne vs grounded indicator
- `src/components/gameplay/AttackDeclarationPanel.tsx` — air-to-air, air-to-ground, dogfight action buttons
- `src/components/gameplay/MovementDeclarationPanel.tsx` — thrust budget, altitude change controls, dogfight initiation
- `src/services/combat/replays/eventLogFormatter.ts` — ~15 new event types columnar formatting

## Capabilities

### New

- `aerospace-deployment` — airborne aero combat: altitude/velocity model, atmospheric vs space, air-to-air, air-to-ground, ground-to-air, dogfight, landing/takeoff, bomb drop, off-map tied to altitude

### Modified

- `combat-resolution` — air-to-air / air-to-ground / ground-to-air dispatch branches
- `unit-entity-model` — formalize aerospace altitude + velocity in entity component references
- `movement-system` — 2D-simplified becomes legacy fallback; 3D-tactical is new default when scenario `mapEnvironment` is set; strafe altitude modifier

## Impact

- **Affected source files (Apply estimate)**: ~25-40 files, ~3000-5000 LOC. Single largest scope change in Wave 7 batch — explicitly deferred Apply to a dedicated future wave per the Council Librarian's sizing.
- **No new transport** — existing Zustand stores + typed event-log + JSONL replay.
- **No DB migration**.
- **Storybook deltas (Apply wave)**: 5-8 stories — altitude badge, velocity arrow, takeoff/landing animations, dogfight engagement marker, bomb-drop deviation indicator.
- **Test footprint estimate (Apply wave)**: ~100-150 new unit tests + 10-15 scenario tests (takeoff/landing roundtrip, air-to-air at altitude 5, air-to-ground strafe across 3 hexes, dogfight resolution, bomb-drop deviation accuracy against MegaMek parity).
- **Performance**: aerospace altitude state adds ~30 bytes per aero unit per turn to the event log; replay JSONL grows ~5-10% for aero-heavy scenarios. Acceptable.

## Non-Goals

- **Dropships, JumpShips, WarShips, Space Stations** — each gets its own future change. Their combat is a superset of aerospace deployment and includes capital weapons, bay attacks, K-F drive considerations, multi-crew piloting.
- **AeroTech II strategic-map operations** — out; strategic-map jump-point combat is a separate domain.
- **Orbit-to-surface bombardment** — out; artillery / capital-from-orbit is a future `add-orbital-bombardment` change.
- **VTOL/hover ground units** — out; those are ground units governed by `movement-system`. A small future delta change `update-vtol-hover-mp-modifiers` SHALL handle the VTOL hover/MP modifier audit; noted as the next follow-up after this change ships.
- **Atmospheric environment terrain effects on aero** — beyond altitude-band terrain (mountains blocking low-altitude flight); detailed weather, ECM clouds, etc. are out. Core terrain effects (mountains forcing altitude ≥ peak elevation; water for landing crashes; smoke columns blocking LOS at certain altitudes) ARE in.
- **Conversion of existing 2D-simplified scenarios** — they continue to work via the `aerospaceMode: '2d-simplified'` legacy flag. Migration to 3D mode is opt-in per scenario.
- **Crew quality / aerospace pilot skills** — Pilot skill enters via existing `personnel-system`. This change does NOT introduce new pilot stats.
- **AI heuristics for aerospace** — bot decision-making (when to ascend, when to engage, when to disengage) is a follow-up `add-aerospace-ai` change once the engine path stabilizes.

## Open Questions

- **Should hex-distance vs facing-distance be the basis for forced forward motion?** Decision: hex-distance projected onto the facing vector (allows ±60° drift while satisfying forward motion). Documented in spec.
- **Should a grounded aero (altitude 0) be hit-able by ground-fire normally?** Decision: YES — grounded aero is treated as a ground unit for hit-location and is engageable by direct-fire weapons. The aero loses its altitude-tier to-hit bonus when grounded. Documented in spec.
- **Should dogfight engagements lock both units in the same hex for the whole dogfight (preventing other movement)?** Decision: dogfight commits both units to the same hex for the engagement turn only; they may disengage next turn via mutual breakaway. Documented in spec.
- **Should bombs use a separate JSONL event variant or fold into existing `WeaponDamageApplied`?** Decision: separate event variant `AerospaceBombDropped` carrying `{ declaredHex, deviatedHex, scatterRoll, damage, bombType }` — bombs deviate differently from weapons; separate event keeps the replay clean.
- **Should the 3D-tactical mode become default for ALL scenarios, or opt-in via flag?** Decision: opt-in via `scenarioOptions.aerospaceMode === '3d-tactical'` for Wave 9. New scenarios may default to `3d-tactical`; legacy scenarios stay on `2d-simplified`. After 3 Apply-wave bake-in waves, consider flipping the default.
