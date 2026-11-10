## ADDED Requirements

### Requirement: Single Movement Terrain PSR Producer

Movement terrain PSRs SHALL come from one producer, `planMovementTerrainEffects` in `src/utils/gameplay/movement/terrainPsrTriggers.ts`. It returns, in step order, each PSR to queue and each jump-entry bog-down that sticks a unit without a roll. The standalone runner and every interactive movement path SHALL apply these effects and SHALL NOT re-derive terrain triggers. Each committed movement SHALL apply its effects exactly once.

#### Scenario: Runner and interactive paths agree

- **GIVEN** the same unit, path, movement type and terrain
- **WHEN** the runner and an interactive session commit that movement
- **THEN** both SHALL queue PSRs with the same reason codes, modifiers, terrain levels and trigger sources

#### Scenario: Effects apply once per committed movement

- **WHEN** a movement through one rubble hex is committed on any path
- **THEN** exactly one `entering_rubble` PSR SHALL be queued for that step
- **AND** replaying the recorded events SHALL NOT queue another

### Requirement: Terrain PSR Fall Eligibility

Water entry, rubble, skid and ice PSRs SHALL be produced only for a unit that can fall under MegaMek 48fcb2f64 `Mek.canFall` (`Mek.java` L2154-L2156): a BattleMech-like unit that is not prone. Water entry SHALL also be skipped for hover, naval, hydrofoil, submarine, UMU, VTOL, WiGE and swim movement modes (`Entity.checkWaterMove`, L9615-L9641). Vehicle terrain outcomes are out of scope.

#### Scenario: A tracked vehicle entering water queues nothing

- **WHEN** a tracked vehicle enters a depth-1 water hex
- **THEN** no `entering_water` PSR SHALL be queued

#### Scenario: A BattleMech entering water still rolls

- **WHEN** a standing BattleMech walks into a depth-1 water hex
- **THEN** one `entering_water` PSR with modifier -1 SHALL be queued

### Requirement: Interactive Movement Terrain PSRs

Every interactive movement commit (the interactive session, its AI turn, `GameEngine` movement including `runToCompletion`, and P2P host translation) SHALL apply the shared terrain effects after the `MovementDeclared` event and before the `MovementLocked` event. Queued PSRs SHALL resolve in the existing End-phase PSR drain. A failed ground-movement bog-down SHALL emit `UnitStuck` with `canUnstickByJumping: true`, as in the runner.

#### Scenario: A session walk into water queues a PSR resolved at End

- **WHEN** an interactive session commits a BattleMech walk into depth-1 water
- **THEN** a `PSRTriggered` event with `reasonCode: entering_water` SHALL follow `MovementDeclared` and precede `MovementLocked`
- **AND** the End phase SHALL emit its `PSRResolved`

#### Scenario: A failed interactive bog-down grants jump eligibility

- **WHEN** an interactive bog-down PSR from a ground movement step fails
- **THEN** `UnitStuck` SHALL carry `canUnstickByJumping: true`

#### Scenario: Movement on clear terrain appends nothing new

- **WHEN** an interactive movement crosses only clear terrain
- **THEN** the appended events SHALL be unchanged from before this requirement

### Requirement: Movement-Start Stuck Recovery In Every Path

When an interactive session, `GameEngine.runToCompletion` or the standalone runner enters the Movement phase, every stuck unit that can act SHALL roll the shared recovery PSR before any unit moves (MegaMek 48fcb2f64 `TWGameManager.doTryUnstuck`, L31368-L31419). A pass SHALL free the unit and clear jump eligibility; a failure SHALL leave it stuck with no fall and no pilot damage. With no stuck unit, no event SHALL be emitted and no die SHALL be drawn.

#### Scenario: Recovery precedes movement in a session

- **GIVEN** a stuck BattleMech in a depth-1 swamp at the start of a turn
- **WHEN** the session advances from Initiative into Movement
- **THEN** a `swamp_unstuck` `PSRTriggered` and `PSRResolved` pair SHALL be emitted before any `MovementDeclared` of that turn

#### Scenario: No stuck unit draws no dice

- **WHEN** no unit is stuck as Movement begins
- **THEN** no recovery event SHALL be emitted and the dice stream SHALL be unchanged

### Requirement: Auto-Resolve Drains Pending PSRs

`GameEngine.runToCompletion` SHALL resolve every pending PSR at the End phase of each turn with its seeded dice, as the interactive session does, before the next turn clears the queue.

#### Scenario: A queued PSR resolves in auto-resolve

- **WHEN** a unit has a pending PSR at the End phase of an auto-resolved turn
- **THEN** a `PSRResolved` event SHALL be emitted for it before the next `TurnStarted`

## MODIFIED Requirements

### Requirement: Movement-Step PSR Trigger-Source Stamping

When the simulation runner triggers a `psr_triggered` event during the resolution of a movement step (skid on ice, leaping leg damage on elevation drop, jump landing on rough terrain, AttemptStand from a `'standUp'` step, swarm-dislodge from a `'shakeOffSwarm'` step, etc.), the runner SHALL populate `IPSRTriggeredPayload.triggerSource` with the string `'movement-step:<index>'` where `<index>` is the 0-based ordinal of the step in the corresponding `movement_declared.payload.steps` array.

Interactive movement paths SHALL stamp the same `'movement-step:<index>'` form for terrain PSRs, where `<index>` is the 0-based ordinal of the step in the canonical decomposition of the declared path (`decomposeMovementSteps` with the declared origin, destination, facings, movement type, MP used, path, grid and movement capability). Interactive `movement_declared` payloads do not carry those steps; a consumer that needs them re-derives the decomposition from the same inputs.

This contract lets consumers correlate per-step PSR events back to the originating step without joining on hex coordinate or timing alone. The `triggerSource` field is REQUIRED on `IPSRTriggeredPayload` (already in the type), so this requirement narrows the value space for movement-induced PSRs without adding a new field.

For PSRs that fire OUTSIDE of movement-step resolution (damage-induced, heat-induced, recovery-induced), `triggerSource` SHALL retain its existing free-string semantics — for example `'damage-20-threshold'`, `'heat-26'`, `'gyro-destroyed'`, `'cockpit-recovery'`. PR E (`structure-psr-reason-as-discriminated-code`) tightens these into a discriminated `PSRReasonCode` union; this requirement does NOT depend on PR E.

#### Scenario: Skid PSR fired during a forward step references that step

- **GIVEN** a unit running across an ice hex at step index 2 of its movement chain
- **AND** the runner triggers a Skid PSR
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:2'`
- **AND** the corresponding `movement_declared.payload.steps[2]` SHALL be a `'forward'` step entering an ice hex

#### Scenario: AttemptStand PSR from a stand-up step references the stand-up step's index

- **GIVEN** a prone unit whose movement chain begins with a `'standUp'` step at index 0
- **AND** the runner triggers an AttemptStand PSR (always fires for stand-up)
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:0'`

#### Scenario: Damage-induced PSR retains its original trigger-source string

- **GIVEN** a unit takes 21+ damage in a phase, triggering a damage-PSR via the existing damage-threshold check
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL NOT have `triggerSource` starting with `'movement-step:'`
- **AND** the event payload's `triggerSource` SHALL retain its existing free-string value (e.g. `'damage-20-threshold'`)

#### Scenario: Interactive terrain PSR references the canonical decomposition step

- **GIVEN** an interactive session commits a walk whose second decomposed step enters rubble
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:1'`
- **AND** the `movement_declared` payload SHALL be unchanged by the stamping
