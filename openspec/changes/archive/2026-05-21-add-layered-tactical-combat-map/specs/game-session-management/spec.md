# Spec Delta: Game Session Management

## ADDED Requirements

### Requirement: Interactive Session Terrain Ownership

The interactive session SHALL own and expose the canonical combat grid used by the current battle.

**Priority**: Critical

#### Scenario: Session exposes configured grid to UI

**GIVEN** `GameEngine` is created with a configured `IHexGrid`
**WHEN** `createInteractiveSession()` is called
**THEN** the resulting `InteractiveSession` SHALL retain that grid
**AND** `getGrid()` SHALL return the same terrain and elevation data used for movement, LOS, heat, and AI pathing
**AND** `GameplayLayout` and spectator surfaces SHALL render terrain from that grid

#### Scenario: Session map radius matches grid radius

**GIVEN** `GameEngine` is created with an injected grid
**WHEN** a game session is created
**THEN** `session.config.mapRadius` SHALL match the injected grid radius unless an explicit map radius is supplied
**AND** the tactical map SHALL render that radius
