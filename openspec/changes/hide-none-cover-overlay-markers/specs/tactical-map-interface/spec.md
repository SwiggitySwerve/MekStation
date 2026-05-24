# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Effect Overlays

The system SHALL provide toggleable overlays showing calculated terrain effects
without drawing no-op markers for absent effects.

#### Scenario: Cover level overlay omits no-cover hexes

- **GIVEN** the cover overlay is enabled
- **WHEN** rendering the map
- **THEN** hexes with no cover SHALL show no indicator
- **AND** hexes with partial cover SHALL show a half-shield icon
- **AND** hexes with full cover SHALL show a full-shield icon
- **AND** partial and full cover markers SHALL keep their terrain and elevation source metadata
