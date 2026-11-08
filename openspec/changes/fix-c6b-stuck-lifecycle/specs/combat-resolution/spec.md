## MODIFIED Requirements

### Requirement: Source-Backed Swamp Bog-Down Stuck State

Terrain PSR validation SHALL queue MegaMek's BattleMech swamp bog-down rule as a stuck-state PSR when a BattleMech-like unit enters swamp by ground movement. The catalog SHALL NOT model swamp bog-down as a normal failed-PSR fall. A failed swamp bog-down PSR SHALL emit `UnitStuck`, set `isStuck`, clear pending PSRs, and SHALL NOT emit `UnitFell` or pilot fall damage. Jumping into swamp SHALL mark BattleMech-like units stuck immediately without queueing a fall PSR. Terrain Master: Swamp Beast bog-down relief SHALL apply as `-1` to swamp bog-down PSRs. MegaMek mud bog-down SHALL remain excluded from BattleMech swamp bog-down coverage because biped and quad movement modes do not bog down in mud. Only a failed bog-down PSR from a ground-movement step SHALL grant jump eligibility (`canUnstickByJumping`), recorded on the unit and the `UnitStuck` payload; jumping into swamp and displacement bog-down SHALL NOT grant it. The eligibility field SHALL be written only when true. Stuck state and eligibility SHALL persist across the per-turn movement reset. At the start of each runner movement phase, before any unit moves, every stuck unit that can act SHALL roll a swamp recovery PSR (`swamp_unstuck`) against base piloting plus `+1` swamp terrain and `+3` for quicksand (swamp level above 1); a pass SHALL clear `isStuck` and eligibility, and a failure SHALL leave the unit stuck without `UnitFell` or pilot damage. A stuck unit SHALL NOT move except by jumping while eligible, and that jump SHALL clear `isStuck` and eligibility. The reducer SHALL apply the same transitions from replayed `UnitStuck`, `PSRResolved`, and `MovementDeclared` events, so legacy journals without the new code or field replay unchanged.

#### Scenario: Swamp bog-down queues stuck-state PSR

- **GIVEN** a BattleMech-like unit enters swamp by ground movement
- **WHEN** movement terrain PSRs are queued
- **THEN** a swamp bog-down PSR SHALL be queued with MegaMek source references
- **AND** a pilot with `tm_swamp_beast` SHALL receive a `-1` Swamp Beast bog-down modifier

#### Scenario: Failed swamp bog-down marks unit stuck

- **GIVEN** a BattleMech-like unit has a pending swamp bog-down PSR
- **WHEN** the PSR fails during runner or event-sourced PSR resolution
- **THEN** the unit SHALL be marked `isStuck`
- **AND** a `UnitStuck` event SHALL preserve the failed PSR reason and reason code
- **AND** no `UnitFell`, `PilotHit`, or fall-damage side effect SHALL be emitted for that failure

#### Scenario: Jumping into swamp marks unit stuck immediately

- **GIVEN** a BattleMech-like unit jumps into swamp
- **WHEN** the movement phase applies terrain PSR handling
- **THEN** the unit SHALL be marked `isStuck` immediately
- **AND** the terrain handling SHALL emit `UnitStuck` without queueing a normal fall PSR

#### Scenario: Mud is not promoted to a BattleMech bog-down gap

- **GIVEN** the terrain PSR support catalog is generated
- **WHEN** mud terrain support is inspected
- **THEN** mud SHALL remain integrated for the existing BattleMech movement-cost and terrain-modifier coverage

#### Scenario: Failed ground-movement bog-down grants jump eligibility

- **GIVEN** a BattleMech-like unit fails a swamp bog-down PSR queued by a ground-movement step
- **WHEN** the failure is applied
- **THEN** the unit SHALL be stuck with `canUnstickByJumping`
- **AND** the `UnitStuck` payload SHALL carry `canUnstickByJumping: true`
- **AND** a jump-in or displacement bog-down SHALL leave no eligibility key

#### Scenario: Movement-start recovery roll

- **GIVEN** a stuck unit that can act at the start of a runner movement phase
- **WHEN** the recovery PSR passes
- **THEN** `PSRTriggered` and `PSRResolved` SHALL carry reason code `swamp_unstuck`
- **AND** the unit SHALL no longer be stuck or eligible before it moves
- **AND** a failed roll SHALL leave it stuck with no `UnitFell` or `PilotHit`

#### Scenario: Eligible stuck unit jumps free

- **GIVEN** a stuck unit with `canUnstickByJumping`
- **WHEN** it jumps
- **THEN** the jump SHALL be legal and SHALL clear `isStuck` and eligibility
- **AND** a stuck unit without eligibility SHALL still be refused any movement

#### Scenario: Replay matches the runner

- **GIVEN** the events a runner emitted across bog-down, recovery, and jump
- **WHEN** the reducer replays them
- **THEN** it SHALL reach the same `isStuck` and eligibility state at each step

#### Scenario: Interactive commit and projection agree on stuck units

- **GIVEN** a stuck unit in an interactive, engine, multiplayer, or P2P session
- **WHEN** a movement is committed or its reachability is projected
- **THEN** commit readiness SHALL refuse it with `UnitImmobile` before the projection runs, unless it is a jump by an eligible unit
- **AND** the projection SHALL show no reachable destination except eligible jumps
- **AND** a GM unit reload SHALL preserve `isStuck` and `canUnstickByJumping`
