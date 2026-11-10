## MODIFIED Requirements

### Requirement: InteractiveSession Phase Advancement

The InteractiveSession SHALL provide an advancePhase method that progresses the game through the 6-phase turn loop. Straggler locking SHALL treat Locked, Revealed, and Resolved units as complete and SHALL NOT lock those units again during that advance.

**Rationale**: Interactive mode requires manual phase advancement to allow player decision-making.

**Priority**: Critical

#### Scenario: Advance from Initiative

**GIVEN** an InteractiveSession in Initiative phase
**WHEN** calling advancePhase
**THEN** the session SHALL call rollInitiative
**AND** the session SHALL advance to Movement phase

#### Scenario: Advance from Movement

**GIVEN** an InteractiveSession in Movement phase
**WHEN** calling advancePhase
**THEN** the session SHALL lock all unlocked units
**AND** the session SHALL advance to WeaponAttack phase

#### Scenario: Advance from WeaponAttack

**GIVEN** an InteractiveSession in WeaponAttack phase
**WHEN** calling advancePhase
**THEN** the session SHALL lock all unlocked units
**AND** the session SHALL call resolveAllAttacks
**AND** the session SHALL advance to PhysicalAttack phase

#### Scenario: Advance from PhysicalAttack

**GIVEN** an InteractiveSession in PhysicalAttack phase
**WHEN** calling advancePhase
**THEN** the session SHALL advance to Heat phase

#### Scenario: Advance from Heat

**GIVEN** an InteractiveSession in Heat phase
**WHEN** calling advancePhase
**THEN** the session SHALL call resolveHeatPhase
**AND** the session SHALL advance to End phase

#### Scenario: Advance from End

**GIVEN** an InteractiveSession in End phase
**WHEN** calling advancePhase
**THEN** if the game is not over, the session SHALL advance to Initiative phase
**AND** if the game is over, the session SHALL not advance

#### Scenario: Advance after legal weapon completion

- **GIVEN** every active WeaponAttack unit has legally locked its attacks and the reveal boundary has been emitted
- **WHEN** an ordinary phase advance is accepted
- **THEN** no additional `attack_locked` event SHALL be emitted for those completed units
- **AND** the session SHALL advance to PhysicalAttack without changing previously recorded events.

#### Scenario: Reveal occurs during mixed-board straggler locking

- **GIVEN** a Pending unit precedes an already Locked unit in the board's key order
- **WHEN** a raw advance locks the Pending unit and emits `attacks_revealed` before visiting the later unit
- **THEN** the later unit SHALL remain complete for that pass and SHALL NOT emit another `attack_locked` event.
