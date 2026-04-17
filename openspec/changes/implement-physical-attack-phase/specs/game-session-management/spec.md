# game-session-management (delta)

## ADDED Requirements

### Requirement: Physical Attack Phase Runs Resolution

The session turn loop SHALL execute a full physical-attack resolution when transitioning through `GamePhase.PhysicalAttack`: declaration → validation → to-hit → damage → PSR triggers → phase advance. The previous pass-through (empty branch that only advanced the phase) SHALL NOT remain.

#### Scenario: Phase emits declaration and resolution events

- **GIVEN** a session entering the physical-attack phase with at least one valid declaration
- **WHEN** the phase runs
- **THEN** a `PhysicalAttackDeclared` event SHALL be emitted for each declaration
- **AND** a `PhysicalAttackResolved` event SHALL be emitted for each resolution

#### Scenario: Phase produces damage events through pipeline

- **GIVEN** a successful physical attack
- **WHEN** resolution completes
- **THEN** the damage SHALL flow through `resolveDamage` (same pipeline as weapon attacks)
- **AND** `DamageApplied`, `LocationDestroyed`, `CriticalHit`, `PilotHit` events SHALL be emitted as applicable

#### Scenario: Phase queues PSRs through PSR system

- **GIVEN** a physical attack that hits or misses per rules
- **WHEN** resolution completes
- **THEN** the appropriate PSR trigger SHALL be queued on the PSR queue
- **AND** those PSRs SHALL resolve per `wire-piloting-skill-rolls`

#### Scenario: Phase advances after all attacks resolve

- **GIVEN** all physical attacks this phase have resolved
- **WHEN** the resolution step completes
- **THEN** the phase SHALL advance to `GamePhase.Heat`
