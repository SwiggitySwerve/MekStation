# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Unit Token State Metadata

Rendered tactical map unit token wrappers SHALL expose inspectable state metadata for the unit represented by the token.

#### Scenario: Token wrapper exposes common map state

**GIVEN** a tactical map unit token is rendered
**WHEN** the token wrapper is inspected
**THEN** it SHALL expose the unit type
**AND** it SHALL expose the displayed map position
**AND** it SHALL expose the source game-state position
**AND** it SHALL expose the facing used by the rendered token
**AND** its accessible label SHALL include unit type, position, and facing context

#### Scenario: Type-specific token state remains inspectable

**GIVEN** a rendered unit token carries type-specific state
**WHEN** the token wrapper is inspected
**THEN** aerospace tokens SHALL expose altitude and velocity when present
**AND** mounted battle armor tokens SHALL expose the host unit id used for badge placement
**AND** this metadata SHALL NOT change token visuals, animation behavior, fog behavior, or click handling

#### Scenario: Isometric scene wrapper preserves airborne token state

**GIVEN** an aerospace token carries altitude and velocity state
**AND** the tactical map is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the isometric scene token wrapper SHALL expose the unit type as aerospace
**AND** it SHALL expose the aerospace altitude
**AND** it SHALL expose the aerospace velocity
**AND** the nested token wrapper SHALL retain its own altitude and velocity metadata

#### Scenario: Isometric scene wrapper preserves common token state

**GIVEN** a tactical map unit token is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the isometric scene token wrapper SHALL expose the unit type
**AND** it SHALL expose the displayed map position used for depth sorting
**AND** it SHALL expose the source game-state position
**AND** it SHALL expose the facing used by the rendered token
