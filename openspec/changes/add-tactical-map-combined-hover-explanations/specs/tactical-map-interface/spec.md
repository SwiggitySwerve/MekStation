# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Combined Projection Hover Explanation

The tactical map interface SHALL show a combined hover explanation when the hovered hex projection contains both movement and combat data.

**Priority**: High

#### Scenario: Mixed movement and combat hover shows both rules surfaces

**GIVEN** a hovered hex projection has reachable movement data and blocked combat data
**WHEN** the hover explanation renders
**THEN** it SHALL expose the projection status and intent
**AND** it SHALL show the movement legality and MP cost
**AND** it SHALL show the combat legality, target, range, LOS, and blocked reason
**AND** it SHALL show terrain and elevation context for the same hex
**AND** it SHALL preserve projection blocked reasons without recalculating movement or combat legality
**AND** it SHALL expose the shared projection explanation as stable metadata and readable text

#### Scenario: Single-surface hovers keep existing tooltip behavior

**GIVEN** a hovered hex projection contains only movement data, only combat data, only terrain data, or an unreachable hover state
**WHEN** the hover explanation renders
**THEN** the existing single-surface tooltip behavior SHALL remain available
**AND** the combined tooltip SHALL NOT replace those narrower explanations
