# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Gameplay movement legend state, selected movement-mode gating, and
command capability SHALL consume the same runtime-resolved movement capability
used by movement projection and committed movement validation.

#### Scenario: Runtime conversion capability drives gameplay movement UI

**GIVEN** a gameplay movement-phase session selects a unit whose runtime state
changes its movement capability from its import-time profile
**WHEN** the map builds movement projection, movement legend state, and command
capability
**THEN** the legend SHALL expose the runtime-resolved movement motive
**AND** the legend SHALL expose runtime-resolved walk, run, and jump MP
**AND** unavailable runtime movement modes SHALL be disabled before a movement
plan can be seeded from the legend
**AND** the planning panel and command surfaces SHALL receive the same
runtime-resolved capability as the map projection
