# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Movement Legend Capability Metadata

The tactical map interface SHALL expose the selected unit's movement capability
metadata in the on-map movement legend.

**Priority**: Medium

#### Scenario: Legend summarizes selected motive mode

**GIVEN** the movement phase map is showing a selected unit's movement range
**WHEN** the MP legend is rendered
**THEN** the legend SHALL identify the selected unit's motive mode when one is available
**AND** the motive mode SHALL be exposed through accessible text and machine-readable metadata

#### Scenario: Legend summarizes effective MP values

**GIVEN** the movement phase map is showing a selected unit's movement range
**WHEN** the MP legend is rendered
**THEN** the legend SHALL show the effective walk, run, and jump MP values used for the current overlay state
**AND** disabled jump state SHALL remain visible when jump MP is zero

#### Scenario: Existing legend state remains intact

**GIVEN** the MP legend has active, inactive, or disabled rows
**WHEN** capability metadata is added
**THEN** existing active/inactive/disabled labels and data attributes SHALL remain present
