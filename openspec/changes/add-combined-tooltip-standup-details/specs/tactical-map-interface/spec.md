## ADDED Requirements

### Requirement: Combined Tooltip Stand-Up Movement Details

The tactical map interface SHALL preserve stand-up movement details when rendering the combined movement+combat hover tooltip.

#### Scenario: Combined hover shows stand-up cost and PSR

**GIVEN** a hex has both movement projection data and combat projection data
**AND** the movement projection requires standing before movement
**WHEN** the player hovers that hex
**THEN** the combined tactical tooltip SHALL show the stand-up MP cost
**AND** it SHALL show the stand-up PSR target number when present
**AND** it SHALL show stand-up PSR modifier details when present
**AND** it SHALL still show the combined movement, combat, terrain, and projection-reason rows.

#### Scenario: Combined hover shows impossible stand-up reason

**GIVEN** a hex has both movement projection data and combat projection data
**AND** the movement projection has an impossible stand-up PSR reason
**WHEN** the player hovers that hex
**THEN** the combined tactical tooltip SHALL show the impossible stand-up reason instead of hiding it behind the combined combat state.
