# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Detail Surface

The tactical map SHALL expose combat projection details from the same
rules-backed combat validation path used by the engine. Projection source
metadata for weapon environment restrictions SHALL identify the rule surface
that justifies underwater target restrictions, torpedo-only water legality, and
torpedo path water-line failures.

#### Scenario: Underwater weapon environment restrictions expose source-backed context

- **GIVEN** a selected unit previews attacks against a water or underwater target
- **WHEN** a non-underwater weapon is blocked by the target's water state or a
  torpedo path leaves water
- **THEN** the combat projection SHALL expose the blocked weapon id, blocked
  reason, projection channel, source reference, and rule reference
- **AND** the source and rule references SHALL point at the MegaMek-backed underwater weapon environment source instead of a pending MekStation-only helper.
