## ADDED Requirements

### Requirement: Quad ProtoMech Hit-Location Remapping

The system SHALL remap arm hit-location rolls on Quad ProtoMechs (chassis configuration with four legs and no arms) to leg locations: rolls that would resolve to `RightArm` resolve to `FrontLegs`, and rolls that would resolve to `LeftArm` resolve to `RearLegs` (or the equivalent quad-leg locations defined in the protomech location enum).

This requirement makes explicit a remapping noted in archived `wire-piloting-skill-rolls` and `add-protomech-combat-behavior` learnings but never covered by an end-to-end test.

#### Scenario: Quad ProtoMech right-arm roll resolves to front-legs

- **WHEN** a hit-location roll on a Quad ProtoMech yields a value that maps to `RightArm` on a biped ProtoMech
- **THEN** the resolver returns `FrontLegs` (or the canonical quad-leg-front location)
- **AND** damage applies to the front-leg armor/structure pool

#### Scenario: Quad ProtoMech left-arm roll resolves to rear-legs

- **WHEN** a hit-location roll on a Quad ProtoMech yields a value that maps to `LeftArm` on a biped ProtoMech
- **THEN** the resolver returns `RearLegs` (or the canonical quad-leg-rear location)
- **AND** damage applies to the rear-leg armor/structure pool

#### Scenario: Biped ProtoMech location resolution unchanged

- **WHEN** a hit-location roll on a biped ProtoMech resolves to `RightArm` or `LeftArm`
- **THEN** the resolver returns the same arm location with no remapping
