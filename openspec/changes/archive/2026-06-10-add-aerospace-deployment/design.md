# Design: Add Aerospace Deployment

## Reference Material

- MegaMek `Aero.java` (99KB, 3111 LOC) — canonical aerospace combat + movement + altitude + velocity model
- MegaMek `Aero.java:182-310` — altitude tracking, altitude loss, surface-to-orbit transition
- MegaMek `Aero.java:687-720` — `setCurrentVelocity` / `setNextVelocity` velocity carry between turns
- MegaMek `Aero.java:1463-1510` — control-roll trigger conditions (thrust above safeThrust, velocity > 2× safeThrust, etc.)
- MegaMek `Aero.java:1502-1520` — stall conditions in atmospheric flight
- MegaMek `Aero.java:1912-1945` — vector-based velocity for space combat
- MegaMek `Aero.java:2448-2460` — altitude vs elevation distinction
- Local `openspec/specs/movement-system/spec.md:402-456` — existing 2D-simplified aero model (becomes legacy fallback)
- Local `openspec/specs/combat-resolution/spec.md:445-497` — existing aerospace dispatch / damage / control-roll (extended here)
- Local `openspec/specs/aerospace-unit-system/spec.md:338-352` — existing minimal `Aerospace Combat State` (extended here via `unit-entity-model` delta)
- Local `src/types/gameplay/GameplayUIInterfaces.ts:298-307` — existing `IAerospaceToken.velocity` TODO

## Architecture Decisions

### Decision A: New `aerospace-deployment` capability, not delta on `aerospace-unit-system`

**Choice**: airborne flight + combat mechanics live in a new `aerospace-deployment` capability. `aerospace-unit-system` stays construction-focused (1351 LOC of chassis/armor/thrust/fuel rules).

**Rationale**: same pattern as `add-battle-armor-combat` separating BA combat from BA construction. The construction spec is well-bounded; combat behavior is its own domain. Folding ~25 combat-flight requirements into a 1351-LOC construction spec pushes it past 1800 LOC and conflates two distinct concerns. The split also lets the Apply wave's scope be self-contained — Wave 9 doesn't have to load + understand the entire 1351-LOC construction spec to implement combat.

**Alternatives considered**:
- *Modify `combat-resolution` to absorb air-to-air / air-to-ground / dogfight*: rejected — `combat-resolution` is already 1264 LOC; the per-unit-type-combat pattern (BA, aerospace) is the cleaner factoring.
- *Bundle into existing `movement-system`*: rejected — movement-system is correctly focused on land/2D movement; aerospace flight is a parallel domain with its own combat tables and altitude tier.

### Decision B: 3D-tactical model opt-in via `scenarioOptions.aerospaceMode`

**Choice**: `scenarioOptions.aerospaceMode: '2d-simplified' | '3d-tactical'`. Existing scenarios default to `2d-simplified` (preserves Phase 6 behavior). New scenarios may set `3d-tactical` to opt into the full deployment rules.

**Rationale**: 25-40 file change is too large to flip-default on a single release. Opt-in lets Wave 9 ship the 3D engine without breaking Wave 5-7 scenarios that exercise the 2D path. After 2-3 weeks of 3D bake-in, the default may flip — that's a separate (trivial) Wave 10+ change.

**Alternatives considered**:
- *Flip default immediately*: rejected — high regression risk to existing playtest scenarios.
- *Drop 2D-simplified entirely*: rejected — existing 2D code is shipping, deleting it breaks live scenarios.
- *Make 3D-tactical the only mode and rewrite scenarios*: rejected — that's a much bigger Apply scope, beyond Wave-9 sizing.

### Decision C: Altitude scale 0-10 matching MegaMek

**Choice**: altitude 0-10 with tactical-map ceiling at 10; altitude 11+ exits the tactical map (orbit transition, out of scope this change).

**Rationale**: MegaMek parity. Players importing MegaMek scenarios expect altitude 5 to mean what they think it means. Inventing a new scale (e.g., 0-5) creates a parity friction cost forever.

**Alternatives considered**:
- *Use altitude bands (Low/Med/High) without numbers*: rejected — too coarse; thrust-cost for changing altitude needs integer arithmetic.
- *Use real-world altitude units (km / ft)*: rejected — game-design, not simulation; bands are the right abstraction for tactical play.

### Decision D: Velocity persists across turns; forced forward motion enforced

**Choice**: `currentVelocity` and `nextVelocity` separate fields. `currentVelocity` is the velocity FROM the previous turn (forcing forward motion this turn). `nextVelocity` is the velocity AFTER thrust spent this turn (used as next-turn's `currentVelocity`). Forced forward motion: must move at least `currentVelocity` hexes; failing triggers a control roll.

**Rationale**: matches MegaMek's velocity model exactly (`Aero.setCurrentVelocity` / `setNextVelocity` are explicit separate fields). Forced forward motion makes velocity meaningful — without it, velocity has no tactical consequence.

**Alternatives considered**:
- *Single velocity field*: rejected — loses the "what was my velocity entering this turn" data needed for the forced-forward check, and breaks event-log replay reconstruction.
- *No forced forward motion*: rejected — turns velocity into a meaningless number; loses the tactical "high velocity = committed to this direction" rule.

### Decision E: Air-to-air requires SAME hex and altitude band ±2

**Choice**: two airborne aero may engage in air-to-air combat when they share a hex and their altitude differs by ≤ 2. Cross-altitude engagement (e.g., low vs high) is not possible without a closing maneuver first.

**Rationale**: MegaMek allows cross-altitude shots with progressively-larger to-hit penalties; the simpler "same-hex within ±2 altitude" rule is more playable on the tactical map without losing fighter-combat character. Cross-altitude shots beyond ±2 can be added in a future polish change if needed.

**Alternatives considered**:
- *Allow any-altitude shots with deep penalty*: rejected — too permissive; makes high-altitude bombers safe sniping platforms.
- *Require same-altitude exactly*: rejected — too restrictive; pilots maneuvering for engagement should have a ±1 band of forgiveness.

### Decision F: Dogfight commits both units to same hex for the engagement turn

**Choice**: when a dogfight is initiated (mutual declaration during movement phase), both units commit to the same hex for the rest of the turn; they may not move further. Both get a forward-arc shot at each other at the end of the movement phase. Disengagement next turn requires breakaway thrust.

**Rationale**: tactical dogfights ARE close-quarters engagements; mutual commitment is the realism. Disengagement-via-thrust is a thematic consequence — you must accelerate away.

**Alternatives considered**:
- *Allow both to continue moving after dogfight shots*: rejected — defeats the dogfight committment; turns it into a sequence of pass-by attacks.
- *Make dogfight non-consensual (single-side initiation)*: rejected — both sides need to be willing for the dogfight to commit, otherwise the defender just keeps moving.

### Decision G: Bombs deviate with a separate event type

**Choice**: bomb drops emit a new `AerospaceBombDropped` event with `{ declaredHex, deviatedHex, scatterRoll, damage, bombType }` fields. Bomb damage is then applied to the deviated hex via the existing damage pipeline.

**Rationale**: bombs deviate differently from weapons (random scatter from declared target); a separate event keeps the replay log clean and makes it obvious in the columnar formatter that a bomb was dropped (not just a weapon fired).

**Alternatives considered**:
- *Fold into `WeaponDamageApplied`*: rejected — replays would have to back-compute "this WeaponDamageApplied event came from a bomb" from context, fragile.
- *Use existing weapon-fired event for declaration + WeaponDamageApplied for impact*: rejected — declaration vs impact two-step is the right shape, but bombs warrant their own discriminator for filter UX.

### Decision H: Ground-to-air uses altitude-tier penalty; indirect-fire weapons ineligible

**Choice**: ground unit firing at airborne aero applies a flat altitude-tier penalty: low=+1, med=+2, high=+3. Indirect-fire weapons (LRM in Indirect mode) SHALL NOT engage airborne targets — they need lock-on / line-of-sight which indirect fire lacks.

**Rationale**: MegaMek allows AAA-rated weapons to engage airborne targets more easily, but the simple tier penalty captures the playable essence. Indirect-fire ineligibility is canonical — you can't pop a missile arc-shot into an airborne fighter that's not where you aimed by the time the missiles arrive.

**Alternatives considered**:
- *AAA weapon distinction*: rejected — adds weapon-flag work without much tactical payoff for Wave-9. Future polish change can add it.
- *Allow indirect-fire vs airborne*: rejected — non-canonical and tactically broken.

## Data Flow

```
Scenario starts with mapEnvironment='atmospheric', aerospaceMode='3d-tactical'
Aero A starts grounded (altitude 0, velocity 0)
              ↓
Turn 1 — A declares takeoff:
  ├─ Pay 2 thrust → altitude 1
  ├─ Set currentVelocity = safeThrust (initial flight velocity)
  ├─ Pay control roll (mandatory on takeoff)
  └─ Emit AerospaceTakeoff event
              ↓
Turn 2 — A is airborne at altitude 1, velocity 6
  ├─ Forced forward motion: must move ≥ 6 hexes in facing direction
  ├─ A spends 2 thrust to ascend to altitude 2 (no velocity change)
  ├─ A spends 1 thrust to turn ≤60°
  ├─ A spends 3 thrust to accelerate (nextVelocity = 9)
  └─ Total thrust spent = 6. ≤ safeThrust=6, no control roll.
              ↓
Turn 3 — A at altitude 2, currentVelocity = 9, nextVelocity = 9
  ├─ Forced forward: must move ≥ 9 hexes
  ├─ Halfway, enemy aero E at same hex, altitude 1
  ├─ Altitude difference = 1 (within ±2)
  ├─ A and E both eligible for air-to-air engagement
  ├─ A declares forward-arc shot at E (to-hit base 4, +0 forward arc, +1 alt diff)
  └─ E's facing puts A in E's aft arc → E declares aft-arc shot (+3 modifier)
              ↓
End of movement phase — air-to-air resolution
  ├─ A's hit roll succeeds → aerospaceResolveDamage(E, A.weapons)
  ├─ E's hit roll fails → no damage
  ├─ Emit AerospaceAirToAirAttack events for both shots
              ↓
Turn 4 — A's currentVelocity = 9, no thrust spent yet
  ├─ A intends to bomb ground hex G (declared)
  ├─ A moves over G mid-path
  ├─ Bomb drops with deviation roll 2d6 = 8 → deviates 1 hex south
  ├─ Bomb hits deviated hex
  ├─ Emit AerospaceBombDropped { declaredHex: G, deviatedHex: G-south, scatterRoll: 8, damage: 20, bombType: 'HE' }
  └─ Bomb damage applied to ground units in deviated hex
              ↓
Turn 5 — A wants to disengage, decelerate, land
  ├─ Spend 5 thrust to decelerate from 9 → 4
  ├─ Descend 2 altitude bands (free, +1 velocity gravity assist → 5)
  ├─ Net velocity for landing = 5; with safeThrust 6, valid landing speed
  ├─ At altitude 1, declare landing transition
  └─ Land — rolling on runway 5 hexes, altitude 0, velocity 0 at end
```

## File Changes (Apply estimate — informational; not part of this change)

- New:
  - `src/lib/movement/aerospaceMovement.ts` — thrust accounting, velocity carry, turn cost, altitude cost, stall/crash detection (~800-1000 LOC)
  - `src/lib/combat/aerospaceCombat.ts` — air-to-air, air-to-ground, ground-to-air resolvers; dogfight resolution (~600-800 LOC)
  - `src/lib/combat/bombResolution.ts` — bomb deviation table + damage (~200-300 LOC)
- Modified:
  - `src/engine/InteractiveSession.ts` — aerospace movement-declaration handlers, altitude transitions, control-roll triggers, dogfight commitment
  - `src/lib/combat/combatResolution.ts` — aerospace dispatch branches (air-to-air, air-to-ground, ground-to-air)
  - `src/types/gameplay/CombatInterfaces.ts` — extend `IAerospaceCombatState` with `altitude`, `currentVelocity`, `nextVelocity`, `airborneState: 'grounded' | 'airborne' | 'taking-off' | 'landing'`; add ~15 new event types
  - `src/types/gameplay/GameplayUIInterfaces.ts` — resolve existing `IAerospaceToken.velocity` TODO, add takeoff/landing/dogfight UI hints
  - `src/components/gameplay/UnitToken.tsx` (or hex-board equivalent) — altitude badge, velocity arrow, airborne vs grounded indicator
  - `src/components/gameplay/AttackDeclarationPanel.tsx` — air-to-air, air-to-ground, dogfight action buttons
  - `src/components/gameplay/MovementDeclarationPanel.tsx` — thrust budget, altitude controls, dogfight initiation
  - `src/services/combat/replays/eventLogFormatter.ts` — ~15 new event types columnar formatting
- Deleted: none (2D-simplified path stays as legacy fallback)

## Risks

- **R1 (high)**: scope is 3-5× ground vehicle scope; the Apply wave will be the largest single OpenSpec change since `add-tactical-ai-difficulty-tiers`. Mitigation: explicit Apply deferral to dedicated Wave (likely Wave 9); break Apply into 3 sub-waves (Movement / Combat / UI).
- **R2 (medium)**: 2D-simplified vs 3D-tactical mode coexistence creates dual code paths in the resolver. Mitigation: clean dispatch on `scenarioOptions.aerospaceMode` — single branch at session-init time, never per-attack.
- **R3 (medium)**: parity testing against MegaMek requires aerospace-scenario regression harness. Mitigation: include 5-8 scenarios from MegaMek's own test set as part of the Apply wave; gate-merge on parity ratios.
- **R4 (medium)**: altitude/velocity state on the event log adds ~30 bytes per aero unit per turn. Mitigation: only emit altitude/velocity events when they change (delta-emit); steady-state flight has zero per-turn cost.
- **R5 (low)**: hex-board rendering needs altitude/velocity widgets. Mitigation: dedicated Apply-wave Storybook pass; widgets are well-bounded UI work.
- **R6 (low)**: dogfight commitment can be exploited (lock a flagship-aero in a dogfight to take it out of play). Mitigation: dogfight commitment is ONE turn; disengagement is available next turn with breakaway thrust cost.
- **R7 (low)**: bomb deviation may surprise players who expected pinpoint accuracy. Mitigation: declare-hex highlighting + deviated-hex outcome UI feedback; consider showing a scatter cone preview on the declaration UI.
