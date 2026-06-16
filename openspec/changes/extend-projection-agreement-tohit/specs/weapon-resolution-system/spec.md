# weapon-resolution-system Delta — extend-projection-agreement-tohit

## MODIFIED Requirements

### Requirement: TAG Designation for Semi-Guided To-Hit

TAG designation SHALL enable semi-guided ammunition to-hit behavior, nullified by enemy ECM. Semi-guided TAG SHALL cancel positive target-movement to-hit modifiers and apply source-backed indirect-fire relief. It SHALL NOT add a cluster-table bonus. The semi-guided TAG to-hit behavior SHALL be priced identically across the preview projection, the engine commit path, and the simulation weapon-attack phase: the resolved attack's recorded to-hit number for a semi-guided attack on a TAG-designated target SHALL equal a to-hit number recomputed independently from the resolved attacker/target state, NOT merely the projection number copied onto the resolved attack.

#### Scenario: Semi-guided LRM with TAG cancels target movement

- **WHEN** a semi-guided LRM fires at a TAG-designated target without ECM protection
- **THEN** positive target-movement to-hit modifiers SHALL be cancelled by an equal negative semi-guided TAG modifier
- **AND** the cluster roll SHALL NOT receive a semi-guided TAG modifier

#### Scenario: Semi-guided LRM without TAG

- **WHEN** a semi-guided LRM fires at a non-TAG-designated target
- **THEN** the semi-guided TAG to-hit modifiers SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: TAG nullified by ECM

- **WHEN** a semi-guided LRM fires at a TAG-designated target with ECM protection
- **THEN** the semi-guided TAG to-hit modifiers SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: TAG designation flag

- **WHEN** checking for TAG designation
- **THEN** the target status flags SHALL include tagDesignated
- **AND** the target status flags SHALL include ecmProtected
- **AND** semi-guided TAG to-hit relief SHALL be 0 if ecmProtected is true or tagDesignated is false

#### Scenario: TAG marker event

- **WHEN** a TAG hit sets the target's current-turn designation
- **THEN** the event log SHALL include `DesignatorMarkerApplied`
- **AND** the marker payload SHALL identify marker `tag`, the attacker, the target, the weapon, and persistent `false`

#### Scenario: Semi-guided equipment flag

- **WHEN** checking for semi-guided TAG to-hit behavior
- **THEN** the weapon equipment flags SHALL include isSemiGuided
- **AND** semi-guided TAG to-hit relief SHALL be 0 if isSemiGuided is false

#### Scenario: Resolved to-hit on a moving TAG target equals an independent engine recomputation

- **GIVEN** a semi-guided LRM fired at a TAG-designated target that moved
  enough hexes this turn to earn a positive target-movement modifier, with no
  ECM protection
- **WHEN** the attack is committed and the resolved `AttackDeclared` event is
  recorded
- **THEN** the recorded `toHitNumber` SHALL equal a to-hit number recomputed
  independently from the resolved attacker/target state with the same
  semi-guided TAG context
- **AND** that recorded number SHALL reflect the cancelled target-movement
  modifier
- **AND** the agreement assertion SHALL NOT be satisfied merely because the
  projection number was copied onto the resolved attack
