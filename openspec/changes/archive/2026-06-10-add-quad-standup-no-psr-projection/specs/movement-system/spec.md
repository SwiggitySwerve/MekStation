# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Prone/Standing-Up Movement Costs

Standing up from prone SHALL cost the represented stand-up MP and require a
successful PSR unless represented unit rules make the stand-up an automatic
success.

#### Scenario: Intact Quad Mek stand-up does not require PSR

- **GIVEN** a prone unit has a represented quad stand-up leg profile
- **AND** none of the represented quad leg locations are destroyed
- **AND** the gyro is not destroyed
- **WHEN** movement projection or committed movement evaluates stand-up
- **THEN** the unit SHALL reserve or spend the normal stand-up MP cost
- **AND** no stand-up PSR SHALL be required or rolled
- **AND** the unit SHALL stand successfully before resolving legal ground movement
- **AND** the projection SHALL expose a no-PSR automatic-success reason

#### Scenario: Damaged Quad Mek leg requires normal stand-up PSR

- **GIVEN** a prone unit has a represented quad stand-up leg profile
- **AND** at least one represented quad leg location is destroyed
- **WHEN** movement projection or committed movement evaluates stand-up
- **THEN** the stand-up SHALL require the normal stand-up PSR
- **AND** the projected PSR metadata SHALL match committed PSR resolution
