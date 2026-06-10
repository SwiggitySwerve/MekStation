# movement-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.
## Requirements
### Requirement: Walk/Run MP Calculation

Movement points SHALL be calculated from engine rating and tonnage.

#### Scenario: Walk MP

- **WHEN** calculating walk MP
- **THEN** walkMP = floor(engineRating / tonnage)
- **AND** minimum walk MP = 1

#### Scenario: Run MP

- **WHEN** calculating run MP
- **THEN** runMP = floor(walkMP × 1.5)

### Requirement: Jump Jets

The system SHALL support 8 jump jet types.

#### Scenario: Standard jump jets

- **WHEN** using standard jump jets
- **THEN** jump MP = number of jump jets
- **AND** jump jets SHALL not exceed walk MP
- **AND** weight varies by tonnage class

### Requirement: Movement Enhancements

The system SHALL support MASC, TSM, Supercharger, and Partial Wing with accurate variable calculations using the `EquipmentCalculatorService`.

#### Scenario: MASC weight calculation (IS)

- **WHEN** calculating Inner Sphere MASC weight
- **THEN** weight = round(tonnage / 20) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** example: 85t mech = 4 tons (4.25 rounds to 4), 90t mech = 5 tons (4.5 rounds to 5)
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-is', context)`

#### Scenario: MASC weight calculation (Clan)

- **WHEN** calculating Clan MASC weight
- **THEN** weight = round(tonnage / 25) to nearest whole ton
- **AND** criticalSlots = weight
- **AND** cost = tonnage × 1000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('masc-clan', context)`

#### Scenario: Supercharger weight calculation

- **WHEN** calculating Supercharger weight
- **THEN** weight = ceil(engineWeight / 10) rounded to 0.5 tons
- **AND** criticalSlots = 1 (fixed, does not vary)
- **AND** cost = engineWeight × 10000 C-Bills
- **AND** calculation SHALL use `EquipmentCalculatorService.calculateProperties('supercharger', context)`

#### Scenario: Supercharger placement restrictions

- **WHEN** placing Supercharger on mech
- **THEN** Supercharger MUST be adjacent to engine
- **AND** Supercharger MUST be in torso location

#### Scenario: Partial Wing weight calculation

- **WHEN** calculating Partial Wing weight
- **THEN** weight = mechTonnage × 0.05 rounded to 0.5 tons
- **AND** criticalSlots = 3 per side torso (6 total)
- **AND** cost = weight × 50000 C-Bills

#### Scenario: TSM cost calculation

- **WHEN** calculating Triple Strength Myomer cost
- **THEN** cost = mechTonnage × 16000 C-Bills
- **AND** weight = 0 (replaces standard myomer)
- **AND** criticalSlots = 6 distributed across torso/legs

#### Scenario: Enhancement recalculation on engine change

- **WHEN** engine rating or engine type changes
- **AND** MASC or Supercharger is equipped
- **THEN** enhancement weight and slots SHALL be recalculated
- **AND** equipment instances SHALL be updated with new values

### Requirement: Variable Equipment Context

The system SHALL provide calculation context for variable equipment.

#### Scenario: Context availability

- **WHEN** calculating variable equipment properties
- **THEN** context SHALL provide mechTonnage
- **AND** context SHALL provide engineRating
- **AND** context SHALL provide engineWeight
- **AND** context SHALL provide directFireWeaponTonnage

### Requirement: Heat MP Reduction

Heat SHALL reduce available movement points using the formula `floor(heat / 5)`.

#### Scenario: Heat 9 reduces MP by 1

- **WHEN** a unit has heat level 9
- **THEN** available walking and running MP SHALL be reduced by `floor(9 / 5) = 1`

#### Scenario: Heat 15 reduces MP by 3

- **WHEN** a unit has heat level 15
- **THEN** available walking and running MP SHALL be reduced by `floor(15 / 5) = 3`

#### Scenario: Heat does not reduce MP below 0

- **WHEN** a unit with Walk 2 has heat level 15 (reduction of 3)
- **THEN** available Walk MP SHALL be 0 (not negative)
- **AND** the unit SHALL be unable to walk or run

### Requirement: Movement Generates Heat

Movement SHALL generate heat per the canonical rules and add it to the unit's heat accumulator for the current turn.

#### Scenario: Walking adds 1 heat

- **GIVEN** a unit that walked any distance this turn
- **WHEN** movement resolves
- **THEN** +1 heat SHALL be added

#### Scenario: Running adds 2 heat

- **GIVEN** a unit that ran this turn
- **WHEN** movement resolves
- **THEN** +2 heat SHALL be added

#### Scenario: Jump heat is max(3, jumpMP used)

- **GIVEN** a unit that jumped using 5 jump MP
- **WHEN** movement resolves
- **THEN** +5 heat SHALL be added

#### Scenario: Minimum jump heat of 3

- **GIVEN** a unit that jumped using 2 jump MP
- **WHEN** movement resolves
- **THEN** +3 heat SHALL be added (clamped at 3)

#### Scenario: Stationary unit generates no movement heat

- **GIVEN** a unit that did not move
- **WHEN** movement resolves
- **THEN** no heat SHALL be added from movement

### Requirement: Heat Reduces Effective Movement

Effective walk and run MP SHALL be reduced by `floor(heat / 5)` each turn the unit has heat.

#### Scenario: Heat 9 reduces effective MP by 1

- **GIVEN** a unit with walk 5, run 8, heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 4
- **AND** effective run SHALL be 7

#### Scenario: Heat 15 reduces effective MP by 3

- **GIVEN** a unit with walk 5, heat 15
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 2

#### Scenario: TSM interaction

- **GIVEN** a unit with walk 5 and TSM active at heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 6 (5 base + 2 TSM - 1 heat)

### Requirement: Terrain PSR Triggers

The movement system SHALL trigger piloting skill rolls when entering specific terrain types.

#### Scenario: Entering rubble triggers PSR

- **WHEN** a unit enters a rubble hex during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Running through rough terrain triggers PSR

- **WHEN** a unit running enters a rough terrain hex
- **THEN** a PSR SHALL be triggered

#### Scenario: Entering water triggers PSR

- **WHEN** a unit enters a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

#### Scenario: Exiting water triggers PSR

- **WHEN** a unit exits a water hex (depth 1+) during movement
- **THEN** a PSR SHALL be triggered

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the represented stand-up MP and require a
successful PSR unless represented unit rules make the stand-up automatic or
impossible.

#### Scenario: Playtest3 three-hit heavy-duty gyro stand-up remains rollable

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro with three gyro hits
- **WHEN** movement projection or committed movement evaluates a ground
  stand-up attempt
- **THEN** the destination SHALL remain reachable when the path is otherwise
  legal and within budget
- **AND** the projection SHALL expose a finite stand-up PSR target
- **AND** the projection SHALL include the represented heavy-duty gyro damage
  modifier
- **AND** committed movement SHALL resolve the same finite stand-up PSR instead
  of treating the gyro as destroyed

#### Scenario: Playtest3 four-hit heavy-duty gyro stand-up is impossible

- **GIVEN** `playtest_3` is enabled
- **AND** a prone Mek has a represented heavy-duty gyro with four gyro hits
- **WHEN** movement projection or committed movement evaluates a ground
  stand-up attempt
- **THEN** the destination SHALL be marked unreachable before commit
- **AND** the projection SHALL expose `Cannot stand with a destroyed gyro`
- **AND** committed movement SHALL keep the unit at its origin and prone
- **AND** committed movement SHALL NOT emit `UnitStood`

### Requirement: Shutdown Prevents Movement

A shutdown unit SHALL be unable to move during the movement phase.

#### Scenario: Shutdown unit cannot move

- **WHEN** a unit is in shutdown state during the movement phase
- **THEN** the unit SHALL NOT be permitted to move
- **AND** the unit SHALL skip the movement phase entirely

#### Scenario: Shutdown unit remains in place

- **WHEN** a shutdown unit's movement phase begins
- **THEN** the unit SHALL remain in its current hex
- **AND** movement type SHALL be set to "Stationary"

### Requirement: Movement Calculations Hook

The system SHALL provide a React hook for deriving movement statistics from unit configuration.

**Source**: `src/hooks/useMovementCalculations.ts:131-193`

#### Scenario: Compute Walk/Run MP from engine rating and tonnage

- **GIVEN** a unit with tonnage 50 and engine rating 200
- **WHEN** useMovementCalculations is called
- **THEN** walkMP SHALL be 4 (floor(200 / 50))
- **AND** runMP SHALL be 6 (ceil(4 × 1.5))

#### Scenario: Compute valid Walk MP range from tonnage

- **GIVEN** a unit with tonnage 50
- **WHEN** useMovementCalculations is called
- **THEN** walkMPRange.min SHALL be 1 (ceil(10 / 50) = 1)
- **AND** walkMPRange.max SHALL be 8 (floor(400 / 50) = 8)

#### Scenario: Compute max Jump MP for standard jump jets

- **GIVEN** a unit with walkMP 4 and jumpJetType STANDARD
- **WHEN** useMovementCalculations is called
- **THEN** maxJumpMP SHALL be 4 (standard jets limited to walk MP)

#### Scenario: Compute max Jump MP for improved jump jets

- **GIVEN** a unit with walkMP 4 and jumpJetType IMPROVED
- **WHEN** useMovementCalculations is called
- **THEN** maxJumpMP SHALL be 6 (improved jets can reach run MP = ceil(4 × 1.5))

#### Scenario: Compute enhanced max Run MP with MASC

- **GIVEN** a unit with walkMP 4 and enhancement MASC
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be 8 (floor(4 × 2.0) = 8)

#### Scenario: Compute enhanced max Run MP with TSM

- **GIVEN** a unit with walkMP 4 and enhancement TSM
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be 7 (floor(4 × 1.5) + 1 = 7)

#### Scenario: No enhanced max Run MP without enhancement

- **GIVEN** a unit with walkMP 4 and enhancement null
- **WHEN** useMovementCalculations is called
- **THEN** maxRunMP SHALL be undefined

#### Scenario: Detect max engine rating

- **GIVEN** a unit with engine rating 400
- **WHEN** useMovementCalculations is called
- **THEN** isAtMaxEngineRating SHALL be true

#### Scenario: Clamp Walk MP to valid range

- **GIVEN** a unit with tonnage 50 (valid range 1-8)
- **WHEN** clampWalkMP(10) is called
- **THEN** result SHALL be 8 (clamped to max)

#### Scenario: Clamp Jump MP to max allowed

- **GIVEN** a unit with walkMP 4 and jumpJetType STANDARD (maxJumpMP = 4)
- **WHEN** clampJumpMP(6) is called
- **THEN** result SHALL be 4 (clamped to maxJumpMP)

#### Scenario: Calculate engine rating for desired Walk MP

- **GIVEN** a unit with tonnage 50
- **WHEN** getEngineRatingForWalkMP(5) is called
- **THEN** result SHALL be 250 (50 × 5)

### Requirement: Engine Rating Constraints

Engine rating SHALL be constrained to the range 10-400 per BattleTech TechManual.

**Source**: `src/hooks/useMovementCalculations.ts:26-29`

#### Scenario: Minimum engine rating

- **WHEN** calculating valid Walk MP range
- **THEN** minimum engine rating SHALL be 10

#### Scenario: Maximum engine rating

- **WHEN** calculating valid Walk MP range
- **THEN** maximum engine rating SHALL be 400

#### Scenario: Walk MP range for 100-ton unit

- **GIVEN** a unit with tonnage 100
- **WHEN** calculating valid Walk MP range
- **THEN** walkMPRange.min SHALL be 1 (ceil(10 / 100) = 1)
- **AND** walkMPRange.max SHALL be 4 (floor(400 / 100) = 4)

### Requirement: Movement Enhancement Effects

The system SHALL calculate enhanced maximum Run MP based on active movement enhancements.

**Source**: `src/utils/construction/movementCalculations.ts:42-82`

#### Scenario: MASC enhancement

- **GIVEN** a unit with walkMP 4 and MASC equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** maxRunMP SHALL be floor(4 × 2.0) = 8

#### Scenario: Supercharger enhancement

- **GIVEN** a unit with walkMP 4 and Supercharger equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** maxRunMP SHALL be floor(4 × 2.0) = 8

#### Scenario: TSM enhancement

- **GIVEN** a unit with walkMP 4 and TSM equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** flatMPBonus SHALL be 1
- **AND** maxRunMP SHALL be floor(4 × 1.5) + 1 = 7

#### Scenario: Multiple enhancements (MASC + TSM)

- **GIVEN** a unit with walkMP 4, MASC, and TSM equipped
- **WHEN** calculating enhanced max Run MP
- **THEN** runMultiplierBonus SHALL be 0.5
- **AND** flatMPBonus SHALL be 1
- **AND** maxRunMP SHALL be floor(4 × 2.0) + 1 = 9

### Requirement: Hook Memoization

The hook SHALL memoize all computed values to prevent unnecessary recalculations.

**Source**: `src/hooks/useMovementCalculations.ts:137-180`

#### Scenario: Memoize walkMP

- **GIVEN** a unit with engineRating and tonnage
- **WHEN** useMovementCalculations is called multiple times with same inputs
- **THEN** walkMP SHALL be computed only once (useMemo dependency: [engineRating, tonnage])

#### Scenario: Memoize runMP

- **GIVEN** a unit with walkMP
- **WHEN** useMovementCalculations is called multiple times with same walkMP
- **THEN** runMP SHALL be computed only once (useMemo dependency: [walkMP])

#### Scenario: Memoize maxRunMP

- **GIVEN** a unit with walkMP and enhancement
- **WHEN** useMovementCalculations is called multiple times with same inputs
- **THEN** maxRunMP SHALL be computed only once (useMemo dependency: [enhancement, walkMP])

#### Scenario: Memoize helper functions

- **GIVEN** a unit with tonnage
- **WHEN** useMovementCalculations is called multiple times with same tonnage
- **THEN** getEngineRatingForWalkMP, clampWalkMP, clampJumpMP SHALL be stable references

### Requirement: Aerospace 2D Simplified Movement

Aerospace units SHALL move under a 2D-simplified flight model when `scenarioOptions.aerospaceMode === '2d-simplified'` (legacy default). When `scenarioOptions.aerospaceMode === '3d-tactical'` (new), the 3D thrust/velocity/altitude rules in `aerospace-deployment` SHALL apply instead, and this 2D rule SHALL NOT be used.

#### Scenario: 2D-simplified mode — legacy flying unit range

- **GIVEN** an ASF with safeThrust 6 in a scenario with `aerospaceMode: '2d-simplified'`
- **WHEN** computing legal movement for the turn
- **THEN** the unit SHALL be allowed to move up to `2 × safeThrust = 12 hexes`
- **AND** the path SHALL be a straight line from the current hex plus at most one ≤ 60° turn

#### Scenario: 2D-simplified mode — no altitude tracking

- **GIVEN** any flying unit in a `'2d-simplified'` scenario
- **WHEN** reading combat state
- **THEN** the unit SHALL NOT have an altitude property in use
- **AND** line-of-sight SHALL always treat flying units as "above the board"

#### Scenario: 2D-simplified mode — reaching board edge exits unit

- **GIVEN** a flying unit whose path reaches a board-edge hex in `'2d-simplified'` mode
- **WHEN** movement is resolved
- **THEN** an `AerospaceExited` event SHALL fire
- **AND** the unit SHALL enter off-map state for the scenario-defined return delay (default 2 turns)

#### Scenario: 2D-simplified mode — re-entry from off-map

- **GIVEN** a flying unit in off-map state whose return delay has elapsed
- **WHEN** its owner chooses a board-edge re-entry hex
- **THEN** an `AerospaceEntered` event SHALL fire
- **AND** the unit SHALL resume movement with the facing it had at exit

#### Scenario: 3D-tactical mode — this 2D rule does NOT apply

- **GIVEN** a scenario with `aerospaceMode: '3d-tactical'`
- **WHEN** an aerospace unit's movement resolves
- **THEN** the rules in `aerospace-deployment` SHALL apply
- **AND** this `Aerospace 2D Simplified Movement` rule SHALL NOT be used for that unit

### Requirement: Fuel Consumption per Turn

Flying units SHALL consume fuel equal to the thrust used each turn.

#### Scenario: Fuel burn

- **GIVEN** an ASF that moves its full 2 × safeThrust during a turn
- **WHEN** end-of-turn cleanup runs
- **THEN** fuel points SHALL decrease by the thrust actually used that turn
- **AND** when fuel reaches 0 a `FuelDepleted` event SHALL fire
- **AND** the unit SHALL leave the board at the next movement phase (cannot re-enter this scenario)

### Requirement: Fly-Over Strafe Movement

The system SHALL allow a flying unit to declare a strafe path during movement, applying attacks to ground units in the path hexes. The base +2 to-hit penalty SHALL apply in 2D-simplified mode; in 3D-tactical mode (`aerospaceMode === '3d-tactical'`), the altitude-tier modifier (low +0, med +1, high +2) from `aerospace-deployment → Air-to-Ground Combat` SHALL be added on top of the base +2.

#### Scenario: 2D-simplified strafe — base +2 only

- **GIVEN** an ASF in `'2d-simplified'` mode strafing 4 hexes, 2 of which contain enemy ground units
- **WHEN** the player declares strafe on those hexes
- **THEN** Nose or Wing weapons SHALL fire at ground units in those hexes during movement
- **AND** each strafed shot SHALL add +2 to-hit penalty
- **AND** an `AerospaceFlyOver` event SHALL record affected hexes and damage applied

#### Scenario: 3D-tactical strafe — base +2 + altitude modifier

- **GIVEN** an ASF at altitude 8 (high tier) in `'3d-tactical'` mode strafing 2 ground hexes
- **WHEN** the player declares strafe
- **THEN** each strafed shot SHALL add +2 base + 2 (high altitude) = +4 to-hit penalty
- **AND** an `AerospaceAirToGroundAttack` event SHALL fire (per `aerospace-deployment`) instead of the legacy `AerospaceFlyOver`

#### Scenario: 3D-tactical strafe at low altitude — minimal penalty

- **GIVEN** an ASF at altitude 1 (low tier) in `'3d-tactical'` mode strafing a ground hex
- **WHEN** the player declares strafe
- **THEN** the to-hit penalty SHALL be +2 base + 0 (low altitude) = +2
- **AND** the per-attack to-hit SHALL match the 2D-simplified penalty in this special case

### Requirement: Planned Movement UI Projection

The movement system SHALL expose a `plannedMovement` projection shape on the
gameplay store that represents the player's in-progress (uncommitted)
movement plan for a selected unit, so UI surfaces can render path previews
and facing pickers without mutating session state.

#### Scenario: Planned movement records destination, path, and facing

- **GIVEN** a selected Player-side unit during Movement phase
- **WHEN** the player hovers a reachable hex and commits it as destination
- **THEN** `plannedMovement` SHALL contain `unitId`, `destination`, `path`,
  `mpType`, and `facing`
- **AND** `facing` SHALL default to the travel direction of the final path
  segment

#### Scenario: Planned movement cleared on phase exit

- **GIVEN** `plannedMovement` is set for the current Movement phase
- **WHEN** the phase transitions to Weapon Attack
- **THEN** `plannedMovement` SHALL be cleared to `null`

#### Scenario: Planned movement cleared on deselection

- **GIVEN** `plannedMovement` is set for unit A
- **WHEN** the player selects unit B
- **THEN** `plannedMovement` for A SHALL be cleared
- **AND** the store SHALL hold at most one `plannedMovement` at a time

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Imported unit height feeds bridge clearance

- **GIVEN** a represented unit has an explicit imported entity height or a
  source-derived entity height for a supported Mek, VTOL, tank, small craft,
  dropship, or conventional infantry mount class
- **AND** LAM and QuadVee conversion-mode data, when represented, can change the
  source-derived entity height
- **AND** represented conventional infantry mount height, beast-size, or
  MegaMek mount identity data can source-derive the infantry entity height
- **AND** later runtime state may override the imported height directly, switch
  a LAM/QuadVee conversion mode, or mount/dismount conventional infantry
- **AND** the unit's movement capability is used for movement projection
- **WHEN** naval, hydrofoil, or submarine bridge-clearance movement is projected
  across represented water and bridge terrain
- **THEN** the projection SHALL use the runtime-resolved entity height, falling
  back to the imported entity height when no runtime override is present, for
  the bridge-clearance decision
- **AND** the committed movement validation SHALL reject or accept the same
  supplied path with the same bridge-clearance result

### Requirement: Movement Commit Event Emission

The movement system SHALL, on player-confirmed movement commit, append a
`MovementLocked` event to the session event stream whose payload contains
the committed path, final facing, and declared MP type.

#### Scenario: Commit path emits MovementLocked event

- **GIVEN** a valid `plannedMovement` for a Player-side unit
- **WHEN** the player clicks "Commit Move"
- **THEN** a `MovementLocked` event SHALL be appended with
  `{unitId, path, facing, mpType}`
- **AND** the unit's position SHALL update to the path's terminal hex
- **AND** the unit's facing SHALL update to the planned facing

#### Scenario: Commit with invalid destination rejected

- **GIVEN** a `plannedMovement` whose destination is now unreachable
  because an intervening event blocked the path
- **WHEN** the player clicks "Commit Move"
- **THEN** the commit SHALL be rejected
- **AND** no `MovementLocked` event SHALL be appended
- **AND** an error toast `"Destination no longer reachable"` SHALL
  display

### Requirement: Movement Animation Replay Backfill

The movement event consumers (animation layer, replay) SHALL handle
legacy event streams that lack full path data without crashing, so
older sessions remain replayable after the path-bearing event
contract (`MovementLocked` / `MovementCommitted`) lands.

#### Scenario: Backfill for legacy events

- **GIVEN** a replay stream with older events that only store
  destination
- **WHEN** the animation layer plays them back
- **THEN** the animation SHALL use an instant-snap fallback
- **AND** no crash SHALL occur from missing path data

### Requirement: Movement Phase Step Chain Emission

The simulation runner SHALL emit every committed move as a `movement_declared` event whose payload carries a `steps` array — the chain of micro-moves the unit executed in order. Each entry in the array SHALL be one of the discriminated `IMovementStep` variants:

- `'forward'` — straight movement (FORWARDS or BACKWARDS); carries `from`, `to`, `mpCost`, `terrainEntered`, `elevationDelta`, and a `direction: 'forward' | 'backward'` discriminator.
- `'turn'` — facing change (TURN_LEFT or TURN_RIGHT); carries `at`, `fromFacing`, `toFacing`, `mpCost`.
- `'lateral'` — sideslip (LATERAL_LEFT, LATERAL_RIGHT, LATERAL_LEFT_BACKWARDS, LATERAL_RIGHT_BACKWARDS); carries `from`, `to`, `mpCost`, `direction`.
- `'jump'` — jump segment (one event per START_JUMP committed); carries `from`, `to`, `mpCost`, `terrainEntered`.
- `'standUp'` — GET_UP; carries `at`, `mpCost` (typically 2), `psrTriggered: boolean`.
- `'goProne'` — voluntary prone; carries `at`, `mpCost`.
- `'chargeDeclared'` — CHARGE physical-attack declaration handoff; carries `at`, `targetId`, `straightLineHexes`.
- `'dfaDeclared'` — DFA physical-attack declaration handoff; carries `at`, `targetId`, `jumpHeight`.
- `'shakeOffSwarm'` — SHAKE_OFF_SWARMERS; carries `at`, `psrTriggered: boolean`.

Every step SHALL include `index: number` (0-based ordinal within the move) so consumers can correlate per-step PSR events back to the originating step.

The `steps` array is OPTIONAL on `IMovementDeclaredPayload` for back-compat — NDJSON event streams written before this change SHALL replay unchanged.

The runner MAY skip emitting a step type that is not yet implemented in the engine (e.g. SHAKE_OFF_SWARMERS in early scenarios), but SHALL NOT emit a step type with a kind discriminator that is not in the `IMovementStep` union.

#### Scenario: A walk-only move emits forward steps and turn steps in commit order

- **GIVEN** a unit committing a 5-MP walk that consists of: forward 2 hexes, turn right, forward 2 hexes, turn right, forward 1 hex
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL be exactly:
  ```
  [{kind:'forward', index:0, ...}, {kind:'forward', index:1, ...},
   {kind:'turn', index:2, ...},
   {kind:'forward', index:3, ...}, {kind:'forward', index:4, ...},
   {kind:'turn', index:5, ...},
   {kind:'forward', index:6, ...}]
  ```
- **AND** the sum of `step.mpCost` SHALL equal `payload.mpUsed`

#### Scenario: A jump move emits a single jump step (not a chain of forward steps)

- **GIVEN** a unit jumping 4 hexes from `(q=0, r=0)` to `(q=4, r=0)` for 4 MP
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL contain exactly one entry with `kind: 'jump'`
- **AND** that entry's `from` and `to` SHALL match the move's `from` and `to`
- **AND** that entry's `mpCost` SHALL equal `payload.mpUsed`
- **AND** `payload.movementType` SHALL be `'jump'`

#### Scenario: A charge declaration produces a chargeDeclared step at the end of the chain

- **GIVEN** a unit declaring a charge attack against opponent-1 at the end of a 3-hex straight-line forward move
- **WHEN** the runner emits the `movement_declared` event
- **THEN** the last entry in `payload.steps` SHALL have `kind: 'chargeDeclared'`
- **AND** that entry's `targetId` SHALL be `'opponent-1'`
- **AND** that entry's `straightLineHexes` SHALL be `3`

#### Scenario: A stand-up step records its MP cost and PSR trigger

- **GIVEN** a prone unit attempting to stand
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL begin with a `kind: 'standUp'` entry
- **AND** that entry's `mpCost` SHALL be 2 (per Total Warfare Errata)
- **AND** that entry's `psrTriggered` SHALL be `true` (the AttemptStand PSR fires regardless of stand outcome)

### Requirement: Movement Decomposition Fields

Every `movement_declared` event SHALL include four optional decomposition fields summarizing the chain:

- `hexesMoved: number` — total hex transitions (`path.length - 1`); equals the count of forward + lateral + jump steps that result in a hex-position change.
- `straightHexes: number` — number of hexes entered without a facing change in the same step (forward + backward + lateral, excluding turns and stand-up / go-prone steps).
- `turningMpCost: number` — `mpUsed - straightHexes - jumpMpCost - specialStepMpCost`; the residual MP that went to facing changes only.
- `netDisplacement: number` — `hexDistance(from, to)` computed via the existing axial-distance utility; equals the straight-line distance from start to end regardless of path.

These fields SHALL be derived deterministically from the `steps` array when both are present. When `steps` is omitted (legacy stream), consumers MAY treat the four fields as the only available decomposition.

#### Scenario: Decomposition fields satisfy the conservation invariant

- **GIVEN** a `movement_declared` event with `mpUsed: 5`, `straightHexes: 4`, `turningMpCost: 1`, no jump steps
- **WHEN** consumers read the event
- **THEN** `straightHexes + turningMpCost` SHALL equal `mpUsed`
- **AND** `straightHexes` SHALL equal the count of `kind: 'forward' | 'backward' | 'lateral'` entries in `payload.steps`

#### Scenario: Net displacement equals hexDistance regardless of path

- **GIVEN** a unit moving from `(q=0, r=0)` to `(q=3, r=0)` via a winding path of 5 hex transitions
- **WHEN** the runner emits the event
- **THEN** `payload.hexesMoved` SHALL be 5
- **AND** `payload.netDisplacement` SHALL be 3 (= `hexDistance({q:0,r:0}, {q:3,r:0})`)

### Requirement: Hex Coordinate Board Label Utility

The hex-math utility module (`src/utils/gameplay/hexMath.ts`) SHALL export a function `coordToBoardLabel(coord: IHexCoordinate): string` that converts an axial `(q, r)` coordinate to a MegaMek-standard 4-digit `NNNN` board-label string where the first two digits are the 1-indexed column and the last two digits are the 1-indexed row, both using `String.prototype.padStart(2, '0')` for zero-padding.

The function SHALL be the inverse of the existing `convertOffsetToAxial(col, row)` in `src/lib/parsers/megaMekBoard.ts:141` so that round-tripping is identity over the valid coordinate range.

#### Scenario: Axial origin maps to 4-digit `0101`

- **GIVEN** an axial coordinate `{q: 0, r: 0}`
- **WHEN** `coordToBoardLabel` is called
- **THEN** the return value SHALL be `'0101'`

#### Scenario: A typical board hex round-trips through axial and back

- **GIVEN** a MegaMek board hex at column 12, row 7 (`'1207'`)
- **AND** the axial coordinate produced by `convertOffsetToAxial(12, 7)`
- **WHEN** `coordToBoardLabel` is called on that axial coordinate
- **THEN** the return value SHALL be `'1207'`

### Requirement: Destroyed Gyro Nontracked Movement Projection

Movement projection and movement commit validation SHALL reject represented
non-prone destroyed-gyro movement when the active movement mode is not tracked
or wheeled.

#### Scenario: Standing destroyed-gyro Mek cannot use ordinary movement

- **GIVEN** a non-prone unit has represented destroyed-gyro damage
- **AND** the selected movement mode resolves to ordinary walk, run, jump, or
  another non-tracked/non-wheeled mode
- **WHEN** the player previews or commits movement to a destination hex
- **THEN** the destination SHALL be invalid
- **AND** the projection and commit rejection SHALL explain that destroyed gyro
  movement only permits tracked or wheeled movement.

#### Scenario: Tracked and wheeled destroyed-gyro movement remains legal

- **GIVEN** a non-prone unit has represented destroyed-gyro damage
- **AND** the active movement capability resolves to tracked or wheeled
  movement
- **WHEN** the player previews and commits a legal destination
- **THEN** the destination SHALL remain reachable when terrain and MP allow it
- **AND** committed movement SHALL use the same MP/path outcome as the preview.

### Requirement: Movement Declaration Captures Go-Prone Posture Attempts

The movement event model SHALL capture same-hex hull-down `GO_PRONE`
posture attempts as replay-safe movement declarations.

#### Scenario: Go-prone declaration carries posture metadata

- **GIVEN** a hull-down Mek-style unit commits the go-prone posture action
- **WHEN** the movement event is serialized
- **THEN** the `MovementDeclared` payload SHALL include `goProneAttempt: true`
- **AND** the payload SHALL include a `goProne` movement step at the unit's
  current hex with `mpCost: 0`
- **AND** the declaration SHALL preserve zero hex displacement and zero
  movement heat.

### Requirement: Movement Declaration Captures Hull-Down Entry Attempts

The movement event model SHALL capture same-hex standing `HULL_DOWN` posture
attempts as replay-safe movement declarations.

#### Scenario: Hull-down entry declaration carries posture metadata

- **GIVEN** a standing Mek-style unit commits the hull-down posture action
- **WHEN** the movement event is serialized
- **THEN** the `MovementDeclared` payload SHALL include
  `hullDownEntryAttempt: true`
- **AND** the payload SHALL include a `hullDown` movement step at the unit's
  current hex with the entry MP cost
- **AND** the declaration SHALL preserve zero hex displacement and walking
  movement heat.

### Requirement: Prone Hull-Down Entry Uses Source-Backed Location Costs

Movement declaration SHALL price a prone Mek-style unit's `HULL_DOWN` posture
entry from represented per-location leg/support damage.

#### Scenario: Prone hull-down entry pays actuator and hip costs

- **GIVEN** a prone Mek-style unit has represented actuator critical damage on
  its support locations
- **WHEN** it commits the hull-down posture action
- **THEN** the movement declaration SHALL stay in the current hex/facing
- **AND** the declaration SHALL include `hullDownEntryAttempt: true`
- **AND** the hull-down step MP cost SHALL be 1 MP plus one MP per represented
  non-hip leg actuator crit and one MP per represented hip crit
- **AND** replay SHALL clear prone and set hull-down without emitting a stand-up
  PSR.

#### Scenario: Destroyed support location blocks prone hull-down entry

- **GIVEN** a prone Mek-style unit has a destroyed required support location
- **WHEN** it attempts the hull-down posture action
- **THEN** no movement declaration SHALL be emitted
- **AND** movement invalid metadata SHALL report an impossible-cost 99 MP
  support-location blocker.

## Data Model Requirements

### JumpJetType

Jump jet type enumeration.

**Source**: `src/utils/construction/movementCalculations.ts:87-91`

```typescript
enum JumpJetType {
  STANDARD = 'Standard',
  IMPROVED = 'Improved',
  MECHANICAL = 'Mechanical Jump Boosters',
}
```

### MovementEnhancementType

Movement enhancement type enumeration.

**Source**: `src/types/construction/MovementEnhancement.ts`

```typescript
enum MovementEnhancementType {
  MASC = 'masc',
  TSM = 'tsm',
  SUPERCHARGER = 'supercharger',
}
```

### MIN_ENGINE_RATING

Minimum engine rating constant.

**Source**: `src/hooks/useMovementCalculations.ts:29`

```typescript
const MIN_ENGINE_RATING = 10;
```

### MAX_ENGINE_RATING

Maximum engine rating constant per BattleTech TechManual.

**Source**: `src/hooks/useMovementCalculations.ts:26`

```typescript
const MAX_ENGINE_RATING = 400;
```

### MovementCalculationsInput

Input parameters for movement calculations hook.

**Source**: `src/hooks/useMovementCalculations.ts:35-46`

```typescript
interface MovementCalculationsInput {
  /** Unit tonnage */
  readonly tonnage: number;
  /** Current engine rating */
  readonly engineRating: number;
  /** Current jump MP */
  readonly jumpMP: number;
  /** Jump jet type */
  readonly jumpJetType: JumpJetType;
  /** Movement enhancement (MASC, TSM, etc.) */
  readonly enhancement: MovementEnhancementType | null;
}
```

### MovementCalculationsResult

Result object returned by movement calculations hook.

**Source**: `src/hooks/useMovementCalculations.ts:48-67`

```typescript
interface MovementCalculationsResult {
  /** Current Walk MP (derived from engine rating / tonnage) */
  readonly walkMP: number;
  /** Current Run MP (ceil of walk × 1.5) */
  readonly runMP: number;
  /** Valid Walk MP range for this tonnage */
  readonly walkMPRange: { min: number; max: number };
  /** Maximum Jump MP based on walk MP and jump jet type */
  readonly maxJumpMP: number;
  /** Enhanced max Run MP when enhancement is active (undefined if no enhancement) */
  readonly maxRunMP: number | undefined;
  /** Whether engine is at maximum rating (400) */
  readonly isAtMaxEngineRating: boolean;
  /** Calculate new engine rating for a given Walk MP */
  readonly getEngineRatingForWalkMP: (walkMP: number) => number;
  /** Clamp Walk MP to valid range */
  readonly clampWalkMP: (walkMP: number) => number;
  /** Clamp Jump MP to valid range */
  readonly clampJumpMP: (jumpMP: number) => number;
}
```

### MovementModifiers

Movement enhancement modifiers.

**Source**: `src/utils/construction/movementCalculations.ts:35-40`

```typescript
interface MovementModifiers {
  /** Bonus added to base 1.5x run multiplier (e.g., MASC adds 0.5 for 2.0x total) */
  readonly runMultiplierBonus: number;
  /** Flat MP added after multiplication (e.g., TSM adds +1) */
  readonly flatMPBonus: number;
}
```

## Non-Goals

This specification does NOT cover:

- **Heat-based movement penalties**: Covered by heat-management spec
- **Terrain movement costs**: Covered by terrain-system spec
- **Piloting skill rolls**: Covered by personnel-management spec
- **Damage-based movement reduction**: Covered by damage-system spec
- **UI components**: Covered by customizer-tabs spec
- **Database persistence**: Covered by unit-services spec
