## MODIFIED Requirements

### Requirement: Phase Progression Controls

The tactical map interface SHALL provide phase progression controls that distinguish legal advance, optional skip, and blocked advance. A phase progression control SHALL be present and operable in every game phase — including Initiative — on every interactive play surface, single-player included.

#### Scenario: End phase button is blocked with reasons
- **GIVEN** required actions remain
- **WHEN** the player hovers or activates End Phase
- **THEN** the UI SHALL list unresolved blockers
- **AND** the player SHALL be able to focus the first blocker from that list

#### Scenario: Optional skip remains explicit
- **GIVEN** an attack is optional for the active unit
- **WHEN** the player chooses to skip
- **THEN** the UI SHALL confirm the skip state for that unit
- **AND** the phase rail SHALL mark the unit as skipped rather than silently removing it

#### Scenario: Initiative phase offers a begin-round control on the single-player surface
- **GIVEN** an interactive session whose engine phase is Initiative on the single-player tactical surface
- **WHEN** the tactical surface renders
- **THEN** a phase progression control SHALL be visible and enabled that rolls initiative and advances the engine session to the Movement phase
- **AND** activating it SHALL advance the live engine session (not only the displayed phase)

#### Scenario: Out-of-phase map interaction is prevented or explained
- **GIVEN** the engine session is in a phase where a map intent (movement or attack declaration) is illegal
- **WHEN** the player interacts with the map
- **THEN** the surface SHALL either not offer that intent's affordances (no reachability overlay or path prompt) or reject the interaction with a visible message naming the current phase and the control that advances it
- **AND** the interaction SHALL NOT surface an uncaught engine error
