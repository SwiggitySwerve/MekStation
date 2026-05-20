# Spec Delta: Terrain System

## ADDED Requirements

### Requirement: Combat Sessions Use Configured Terrain Grid

Playable tactical combat sessions SHALL resolve against a canonical `IHexGrid` derived from generated/imported terrain or encounter presets.

**Priority**: Critical

#### Scenario: Generated quick-game terrain feeds the engine

**GIVEN** a quick game has a generated scenario with `generatedMap`
**WHEN** auto-resolve or spectator mode starts
**THEN** `GameEngine` SHALL be created with an `IHexGrid` converted from that generated map
**AND** movement, LOS, heat, and AI pathing SHALL resolve against that grid

#### Scenario: Encounter terrain presets feed the engine

**GIVEN** an encounter or skirmish has a map radius and terrain preset
**WHEN** interactive, spectator, auto-resolve, or skirmish launch starts
**THEN** `GameEngine` SHALL receive a deterministic grid for that radius and preset
**AND** the rendered map SHALL derive terrain visuals from the same session grid

#### Scenario: Missing terrain falls back to clear grid

**GIVEN** no generated map or preset is available
**WHEN** a tactical session starts
**THEN** the engine MAY fall back to a clear axial grid
**AND** the fallback SHALL still use the configured map radius when present
