# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Movement Legend State Metadata

The tactical map interface SHALL expose movement-mode legend state in accessible, inspectable metadata.

**Priority**: Medium

#### Scenario: Active movement mode is inspectable

**GIVEN** the movement MP legend is visible
**WHEN** one of Walk, Run, or Jump is the active movement mode
**THEN** that legend row SHALL expose active state without relying only on color or font weight
**AND** inactive rows SHALL remain distinguishable from the active row

#### Scenario: Disabled Jump exposes reason

**GIVEN** the selected unit has no jump capability
**WHEN** the movement MP legend renders
**THEN** the Jump row SHALL expose a disabled state
**AND** the Jump row SHALL expose the reason `No jump capability`
**AND** hovering the Jump row SHALL be possible even though the legend overlay does not broadly block map interaction
