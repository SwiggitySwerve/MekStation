# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Occluder Hex Highlights

The tactical map interface SHALL identify tall isometric terrain that may obscure units behind it.

#### Scenario: Scene token summarizes multiple active occluders

- **GIVEN** more than one elevated terrain hex may hide the same unit from the current isometric camera heading
- **WHEN** the unit token is rendered inside the depth-sorted isometric scene
- **THEN** the token wrapper SHALL preserve a representative first occluder hex and elevation for compact compatibility
- **AND** the token wrapper SHALL expose the complete active occluder hex list
- **AND** the token wrapper SHALL expose the complete active occluder effective-elevation list
- **AND** the token wrapper SHALL expose every active terrain-occlusion reason
- **AND** the nested token visibility context SHALL use those same existing terrain-occlusion reasons without recalculating movement, combat, LOS, fog, or visibility legality
