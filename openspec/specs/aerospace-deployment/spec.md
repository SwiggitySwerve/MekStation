# aerospace-deployment Specification

## Purpose
TBD - created by archiving change add-aerospace-deployment. Update Purpose after archive.
## Requirements
### Requirement: Scenario Aerospace Mode Toggle

Each scenario SHALL carry an `aerospaceMode: '2d-simplified' | '3d-tactical'` flag. The 2D-simplified mode SHALL preserve the existing `movement-system → Aerospace 2D Simplified Movement` Phase-6 behavior. The 3D-tactical mode SHALL apply the full aerospace-deployment rules in this capability. The default value for legacy scenarios SHALL be `'2d-simplified'`; new scenarios MAY opt in to `'3d-tactical'`.

#### Scenario: Legacy scenario uses 2D-simplified by default

- **GIVEN** a scenario authored before this change ships
- **WHEN** session-init reads `scenarioOptions.aerospaceMode`
- **THEN** the value SHALL be `'2d-simplified'` (default)
- **AND** the existing Phase-6 aerospace movement rules SHALL apply unchanged

#### Scenario: New scenario opts into 3D-tactical

- **GIVEN** a scenario explicitly sets `aerospaceMode: '3d-tactical'`
- **WHEN** session-init reads the value
- **THEN** the 3D-tactical rules in this capability SHALL apply
- **AND** the 2D-simplified path SHALL NOT be reachable for that scenario

#### Scenario: Mode dispatch at session-init only

- **GIVEN** any scenario with `aerospaceMode` set
- **WHEN** session begins
- **THEN** the dispatch path SHALL be selected once at session-init
- **AND** the per-attack resolver SHALL NOT re-check `aerospaceMode` on every action

### Requirement: Scenario Environment Toggle

Each scenario SHALL carry a `mapEnvironment: 'atmospheric' | 'space'` flag. Atmospheric environment SHALL apply terrain effects, velocity halving at landing, gravity assist on altitude descent, and stall conditions at velocity 0. Space environment SHALL omit those rules.

#### Scenario: Atmospheric stall at velocity 0

- **GIVEN** a scenario with `mapEnvironment: 'atmospheric'`
- **WHEN** an airborne aero's `currentVelocity` reaches 0
- **THEN** a control roll SHALL be triggered automatically with reason `'Atmospheric stall at velocity 0'`
- **AND** the control roll SHALL auto-fail

#### Scenario: Space environment — no stall at velocity 0

- **GIVEN** a scenario with `mapEnvironment: 'space'`
- **WHEN** an aero's velocity reaches 0
- **THEN** no control roll SHALL be triggered (no stall in vacuum)

#### Scenario: Atmospheric gravity assist on descent

- **GIVEN** an atmospheric scenario
- **WHEN** an airborne aero descends one altitude band
- **THEN** `nextVelocity` SHALL be increased by +1 (gravity assist)

#### Scenario: Space environment — no gravity assist on descent

- **GIVEN** a space scenario
- **WHEN** an aero descends one altitude band
- **THEN** `nextVelocity` SHALL be unchanged (no gravity in vacuum)

### Requirement: Altitude Bands

Tactical-map airborne aero units SHALL operate at altitude levels 0 through 10. Altitude 0 SHALL represent a grounded unit. Altitudes 1-3 SHALL be the low tier; 4-6 medium; 7-10 high. Altitudes 11+ SHALL be considered orbit transition and are out of scope for the tactical map (the resolver SHALL reject altitude increases beyond 10 with an `AerospaceOrbitTransitionAttempted` warning event).

#### Scenario: Altitude tier classification

- **GIVEN** an airborne aero at altitude 5
- **WHEN** the altitude tier is computed
- **THEN** the tier SHALL be `'medium'`

#### Scenario: Orbit transition rejected

- **GIVEN** an aero at altitude 10
- **WHEN** the player attempts to ascend one more band
- **THEN** the ascent SHALL be rejected
- **AND** an `AerospaceOrbitTransitionAttempted` event SHALL be emitted
- **AND** the aero SHALL remain at altitude 10

#### Scenario: Grounded aero is altitude 0

- **GIVEN** an aero in `airborneState: 'grounded'`
- **WHEN** combat state is read
- **THEN** `altitude` SHALL equal 0

### Requirement: Velocity in Thrust Points

Airborne aero SHALL carry two velocity fields: `currentVelocity` (the velocity entering this turn, drives forced-forward motion) and `nextVelocity` (the velocity at end of turn after thrust spending, becomes next turn's `currentVelocity`). Velocity SHALL be denominated in thrust points (each thrust point spent on acceleration changes velocity by ±1). At end of turn, `currentVelocity ← nextVelocity` for the next turn.

#### Scenario: Velocity carries across turns

- **GIVEN** an aero ending turn 3 with `nextVelocity = 8`
- **WHEN** turn 4 begins
- **THEN** `currentVelocity` SHALL equal 8

#### Scenario: Thrust accelerates velocity

- **GIVEN** an aero with `currentVelocity = 6` on turn 4
- **WHEN** the pilot spends 3 thrust on acceleration
- **THEN** `nextVelocity` SHALL be `6 + 3 = 9`

#### Scenario: Thrust decelerates velocity

- **GIVEN** an aero with `currentVelocity = 9`
- **WHEN** the pilot spends 5 thrust on deceleration
- **THEN** `nextVelocity` SHALL be `9 - 5 = 4`

### Requirement: Safe vs Max Thrust

The unit's `safeThrust` SHALL be its construction-time thrust rating. `maxThrust` SHALL equal `floor(safeThrust × 1.5)`. Spending more than safeThrust in a single turn SHALL trigger a control roll at end-of-turn. Spending more than maxThrust SHALL be forbidden — the movement declaration SHALL be rejected.

#### Scenario: Thrust within safeThrust — no control roll

- **GIVEN** an aero with `safeThrust = 6, maxThrust = 9`
- **WHEN** the pilot spends 6 thrust total this turn
- **THEN** no control roll SHALL be triggered

#### Scenario: Thrust > safeThrust triggers control roll

- **GIVEN** the same aero
- **WHEN** the pilot spends 8 thrust this turn (above safe, below max)
- **THEN** a control roll SHALL be triggered at end of turn
- **AND** the control roll SHALL include `+2` modifier (one per excess thrust above safe)

#### Scenario: Thrust > maxThrust rejected

- **GIVEN** the same aero
- **WHEN** the pilot attempts to spend 10 thrust (above max)
- **THEN** the movement declaration SHALL be rejected with reason `'Thrust exceeds max'`

### Requirement: Forced Forward Motion

An aero with `currentVelocity > 0` MUST move at least `currentVelocity` hexes in its facing direction during the movement phase. Failing to move sufficient distance SHALL trigger a control roll with reason `'Insufficient forward motion at velocity'`. Hex-distance SHALL be measured as the projection onto the facing vector, permitting ±60° drift while satisfying the forward requirement.

#### Scenario: Sufficient forward motion

- **GIVEN** an aero with `currentVelocity = 6, facing = N`
- **WHEN** the pilot moves 6 hexes due-N
- **THEN** the forced-forward check SHALL pass
- **AND** no control roll SHALL be triggered

#### Scenario: Insufficient forward motion

- **GIVEN** the same aero
- **WHEN** the pilot moves only 4 hexes due-N
- **THEN** a control roll SHALL be triggered with reason `'Insufficient forward motion at velocity'`

#### Scenario: Projected distance via drift

- **GIVEN** an aero with `currentVelocity = 6, facing = N`
- **WHEN** the pilot moves 7 hexes diagonally (NE at 60° drift)
- **THEN** the N-projected distance SHALL be `7 × cos(60°) = 3.5 → 3`
- **AND** the forced-forward check SHALL FAIL (3 < 6)

### Requirement: Turn Cost

Turning the aero's facing SHALL cost one thrust point per ≤60° turn. Sharper turns SHALL require multiple thrust points consumed sequentially (e.g., a 180° turn costs 3 thrust). Turns may interleave with hex movement (i.e., turn at a hex boundary, then move).

#### Scenario: 60° turn costs 1 thrust

- **WHEN** the pilot turns from N to NE
- **THEN** 1 thrust SHALL be deducted from the turn budget

#### Scenario: 180° turn costs 3 thrust

- **WHEN** the pilot turns from N to S
- **THEN** 3 thrust SHALL be deducted (3 × 60° = 180°)

### Requirement: Altitude Change Cost

Ascending one altitude band SHALL cost 2 thrust points. Descending one altitude band SHALL be free; in atmospheric environment, descending SHALL increase `nextVelocity` by +1 per band descended (gravity assist). Ascending from altitude 0 (taking off) SHALL be a separate `Takeoff` action subject to its own rules.

#### Scenario: Ascend 0→2 costs 4 thrust

- **GIVEN** an airborne aero at altitude 0 (already taken off this turn — see Takeoff requirement)
- **WHEN** the pilot ascends 2 bands during this turn
- **THEN** 4 thrust SHALL be deducted

#### Scenario: Descend 5→3 gains 2 velocity (atmospheric)

- **GIVEN** an atmospheric aero at altitude 5 with `nextVelocity = 6`
- **WHEN** the pilot descends 2 bands
- **THEN** no thrust SHALL be deducted for the descent
- **AND** `nextVelocity` SHALL increase to 8 (+2 gravity assist)

#### Scenario: Descend in space — no velocity change

- **GIVEN** a space-environment aero at altitude 5 with `nextVelocity = 6`
- **WHEN** the pilot descends 2 bands
- **THEN** `nextVelocity` SHALL remain 6 (no gravity in vacuum)

### Requirement: Takeoff and Landing

A grounded aero (altitude 0, `airborneState: 'grounded'`) SHALL transition to airborne via a Takeoff action: 2 thrust spent, altitude set to 1, `currentVelocity` set to `safeThrust`, mandatory control roll. Landing transitions an airborne aero at altitude 1 with `currentVelocity ≤ safeThrust` to grounded: the aero SHALL roll on a runway for N hexes equal to landing velocity, then settle at altitude 0 with velocity 0.

#### Scenario: Takeoff transition

- **GIVEN** an aero at altitude 0, `airborneState: 'grounded'`, safeThrust = 6
- **WHEN** the pilot declares Takeoff
- **THEN** 2 thrust SHALL be deducted
- **AND** altitude SHALL become 1
- **AND** `currentVelocity` SHALL become 6
- **AND** `airborneState` SHALL become `'taking-off'` for the current turn, then `'airborne'` next turn
- **AND** an `AerospaceTakeoff` event SHALL be emitted
- **AND** a mandatory control roll SHALL be performed

#### Scenario: Landing transition

- **GIVEN** an airborne aero at altitude 1, currentVelocity = 4, safeThrust = 6
- **WHEN** the pilot declares Landing
- **THEN** `airborneState` SHALL become `'landing'`
- **AND** the aero SHALL move 4 hexes forward in facing direction
- **AND** altitude SHALL become 0
- **AND** `currentVelocity` SHALL become 0
- **AND** an `AerospaceLanding` event SHALL be emitted

#### Scenario: Landing rejected at high velocity

- **GIVEN** an airborne aero at altitude 1 with currentVelocity = 9, safeThrust = 6
- **WHEN** the pilot attempts Landing
- **THEN** the action SHALL be rejected with reason `'Landing velocity exceeds safeThrust'`
- **AND** the pilot SHALL decelerate first

### Requirement: Stall and Crash

A failed control roll while at altitude > 1 SHALL cause the aero to drop altitude by 1 band. A failed control roll at altitude 1 SHALL crash the aero to altitude 0 with crash damage equal to `currentVelocity × 5` applied equally to all armor arcs, and SHALL set `airborneState: 'grounded'`. In atmospheric environment, velocity 0 SHALL auto-fail any control roll (stall).

#### Scenario: Control roll fail at altitude 5 — drop 1

- **GIVEN** an airborne aero at altitude 5 failing a control roll
- **WHEN** the failure resolves
- **THEN** altitude SHALL become 4
- **AND** an `AerospaceControlRollFailed { newAltitude: 4 }` event SHALL be emitted

#### Scenario: Control roll fail at altitude 1 — crash

- **GIVEN** an airborne aero at altitude 1, currentVelocity = 4, failing a control roll
- **WHEN** the failure resolves
- **THEN** altitude SHALL become 0
- **AND** crash damage SHALL be `4 × 5 = 20` applied equally to all arcs (5 per arc)
- **AND** an `AerospaceCrashed { damagePerArc: 5 }` event SHALL be emitted
- **AND** `airborneState` SHALL become `'grounded'`

### Requirement: Air-to-Air Combat

Two airborne aero units in the same hex AND with altitude difference ≤ 2 SHALL be eligible for air-to-air combat. To-hit modifiers: forward-arc shot +0, left/right-wing-arc shot +1, aft-arc shot +3. Velocity differential SHALL add +1 per 2 hexes of velocity difference between attacker and target. Hit-location + damage SHALL delegate to `aerospaceResolveDamage` per the existing `combat-resolution` capability.

#### Scenario: Forward-arc air-to-air shot

- **GIVEN** attacker A at altitude 5, target T at altitude 5, same hex, A's facing places T in forward arc
- **WHEN** A declares an air-to-air attack
- **THEN** the to-hit base SHALL be A's pilot gunnery skill
- **AND** the arc modifier SHALL be +0

#### Scenario: Aft-arc shot — +3

- **GIVEN** A at altitude 5, T at altitude 5, same hex, A's facing places T in aft arc
- **WHEN** A declares an air-to-air attack
- **THEN** the arc modifier SHALL be +3

#### Scenario: Velocity differential modifier

- **GIVEN** A with currentVelocity = 9, T with currentVelocity = 3 (diff 6)
- **WHEN** A declares an air-to-air attack
- **THEN** the velocity-differential modifier SHALL be `floor(6/2) = +3`

#### Scenario: Altitude diff > 2 — ineligible

- **GIVEN** A at altitude 7, T at altitude 3 (diff 4)
- **WHEN** A attempts an air-to-air attack
- **THEN** the attack SHALL be rejected with reason `'Altitude difference exceeds engagement window (±2)'`

### Requirement: Air-to-Ground Combat

An airborne aero SHALL be able to declare air-to-ground attacks against ground units in hexes the aero passes over during its movement path this turn. To-hit modifier: +2 base (extends the existing `Fly-Over Strafe Movement` rule) + altitude tier (low +0, med +1, high +2). Eligible weapons: Nose-arc + Wing-arc forward-firing weapons.

#### Scenario: Air-to-ground at low altitude

- **GIVEN** ASF at altitude 2 (low tier) strafing a ground hex containing enemy mech
- **WHEN** the attack resolves
- **THEN** the to-hit modifier SHALL be +2 (base strafe) + 0 (low) = +2

#### Scenario: Air-to-ground at high altitude

- **GIVEN** ASF at altitude 8 (high tier) strafing a ground hex
- **WHEN** the attack resolves
- **THEN** the to-hit modifier SHALL be +2 (base strafe) + 2 (high) = +4

#### Scenario: Aft-arc weapon ineligible for air-to-ground

- **GIVEN** ASF with weapon mounted in Aft arc
- **WHEN** the pilot attempts to fire it air-to-ground
- **THEN** the attack SHALL be rejected with reason `'Aft-arc weapon cannot fire air-to-ground'`

### Requirement: Ground-to-Air Combat

A ground unit SHALL be able to fire at an airborne aero target with a to-hit penalty based on altitude tier: low +1, medium +2, high +3. Eligible weapons: any direct-fire weapon with sufficient range. Indirect-fire weapons (LRM in Indirect mode, Arrow IV indirect, etc.) SHALL NOT engage airborne targets — they SHALL be rejected with reason `'Indirect-fire weapons cannot engage airborne targets'`.

#### Scenario: AC/20 fires at airborne aero at high altitude

- **GIVEN** a mech with AC/20 within range of airborne ASF at altitude 8
- **WHEN** the pilot declares the attack
- **THEN** the to-hit penalty SHALL include +3 (high tier)

#### Scenario: LRM in Indirect mode rejected

- **GIVEN** a mech with LRM-15 in `weapon.mode: 'Indirect'` targeting an airborne aero
- **WHEN** the pilot attempts the attack
- **THEN** the attack SHALL be rejected
- **AND** a warning event SHALL be emitted: `'Indirect-fire weapons cannot engage airborne targets'`

### Requirement: Dogfight Resolution

Two opposing airborne aero in the same hex at the same altitude SHALL be eligible for dogfight initiation. Mutual declaration during the movement phase SHALL commit both units to the current hex for the remainder of the turn (no further movement). At end of movement phase, before air-to-air resolution, each dogfighter SHALL receive one forward-arc shot at the other. Disengagement SHALL be available next turn (either side may decline a continued dogfight).

#### Scenario: Mutual dogfight initiation

- **GIVEN** A and B in the same hex at same altitude
- **WHEN** A declares Dogfight against B AND B declares Dogfight against A
- **THEN** both units SHALL set `dogfightWith` to each other's ID
- **AND** both units SHALL be locked to the current hex for the turn
- **AND** an `AerospaceDogfightInitiated` event SHALL be emitted

#### Scenario: Dogfight shots resolve at end of movement phase

- **GIVEN** A and B engaged in a dogfight
- **WHEN** the movement phase ends
- **THEN** A SHALL receive one forward-arc shot at B
- **AND** B SHALL receive one forward-arc shot at A
- **AND** both shots SHALL resolve through `aerospaceResolveDamage`

#### Scenario: Unilateral dogfight declaration — not committed

- **GIVEN** A declares Dogfight against B but B does NOT reciprocate
- **WHEN** the movement phase resolves
- **THEN** no dogfight SHALL be initiated
- **AND** A and B may continue moving normally

#### Scenario: Disengagement next turn

- **GIVEN** A and B engaged in a dogfight last turn
- **WHEN** the new turn begins
- **THEN** either side MAY decline a continued dogfight by not re-declaring
- **AND** if declined, both units SHALL be free to move
- **AND** an `AerospaceDogfightDisengaged` event SHALL be emitted

### Requirement: Bomb Drop Resolution

An airborne aero with bombs loaded in its bomb bay SHALL be able to declare a bomb-drop attack against a ground hex during the movement phase. Bombs SHALL deviate from the declared target hex per a 2d6 scatter table, with deviation distance scaling by altitude tier: low 0-1 hex, medium 1-2 hex, high 2-3 hex. Bomb damage SHALL apply to the deviated hex per the existing bomb explosives rules.

#### Scenario: Bomb at low altitude — minimal deviation

- **GIVEN** an aero at altitude 2 dropping an HE bomb at declared hex G
- **WHEN** the scatter roll is computed
- **THEN** deviation distance SHALL be 0-1 hex (low-tier scatter)

#### Scenario: Bomb at high altitude — large deviation

- **GIVEN** an aero at altitude 9 dropping an HE bomb at declared hex G
- **WHEN** the scatter roll is computed
- **THEN** deviation distance SHALL be 2-3 hexes (high-tier scatter)

#### Scenario: Bomb-drop event records both hexes

- **GIVEN** a bomb drop with declared = G, deviated = G-southeast, scatter roll = 8
- **WHEN** the bomb resolves
- **THEN** an `AerospaceBombDropped { declaredHex: G, deviatedHex: G-SE, scatterRoll: 8, damage, bombType }` event SHALL be emitted

### Requirement: Off-Map Exit and Re-Entry Tied to Altitude

Existing `AerospaceExited` events SHALL include `exitAltitude` and `exitVelocity` fields. Re-entry SHALL preserve both altitude and velocity from exit. The existing 2-turn re-entry delay rule SHALL remain unchanged.

#### Scenario: Exit records altitude + velocity

- **GIVEN** an aero exits the board at altitude 5, currentVelocity 8
- **WHEN** the `AerospaceExited` event is emitted
- **THEN** the event SHALL include `exitAltitude: 5, exitVelocity: 8`

#### Scenario: Re-entry preserves altitude + velocity

- **GIVEN** an aero in off-map state with `exitAltitude: 5, exitVelocity: 8`
- **WHEN** the re-entry timer elapses and the pilot returns at a board edge
- **THEN** the aero SHALL re-enter at altitude 5 with currentVelocity = 8

### Requirement: Grounded Aero Behaves as Ground Unit

A grounded aero (altitude 0, `airborneState: 'grounded'`) SHALL be hit-able by ground-fire weapons normally and SHALL NOT receive any altitude-tier to-hit bonus when targeted. Its hit-location table SHALL be the standard aerospace arc table (Nose, Wings, Aft).

#### Scenario: Grounded aero hit by ground attacker

- **GIVEN** a grounded ASF (altitude 0)
- **WHEN** a mech fires at it with a Large Laser
- **THEN** no altitude-tier penalty SHALL apply
- **AND** hit-location SHALL roll against the standard aerospace arc table

