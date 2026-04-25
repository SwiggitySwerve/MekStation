## ADDED Requirements

### Requirement: Quad ProtoMech Hit-Location Remapping

The system SHALL remap arm and leg hit-location slots on Quad ProtoMechs (chassis configuration with four legs and no arms) to the quad-specific leg locations defined in the protomech location enum: BOTH `left_arm` and `right_arm` slot rolls resolve to `FRONT_LEGS`, and the `legs` slot resolves to `REAR_LEGS`. This matches the canonical MegaMek/TechManual treatment where Quad protos replace arms with front legs and replace the standard `Legs` location with rear legs.

This requirement makes explicit a remapping noted in archived `wire-piloting-skill-rolls` and `add-protomech-combat-behavior` learnings but never covered by an end-to-end test. Implementation lives at `src/utils/gameplay/protomech/hitLocation.ts::mapSlotToLocation`.

#### Scenario: Quad ProtoMech right-arm slot resolves to front-legs

- **WHEN** `mapSlotToLocation('right_arm', ProtoChassis.QUAD, hasMainGun)` is called
- **THEN** the resolver returns `ProtoLocation.FRONT_LEGS`
- **AND** subsequent damage application targets the front-leg armor/structure pool

#### Scenario: Quad ProtoMech left-arm slot also resolves to front-legs

- **WHEN** `mapSlotToLocation('left_arm', ProtoChassis.QUAD, hasMainGun)` is called
- **THEN** the resolver returns `ProtoLocation.FRONT_LEGS`
- **AND** the result intentionally matches the right-arm remap (Quad protos do not distinguish left vs right front-leg hits at the slot-mapping layer)

#### Scenario: Quad ProtoMech legs slot resolves to rear-legs

- **WHEN** `mapSlotToLocation('legs', ProtoChassis.QUAD, hasMainGun)` is called
- **THEN** the resolver returns `ProtoLocation.REAR_LEGS`
- **AND** subsequent damage application targets the rear-leg armor/structure pool

#### Scenario: Biped ProtoMech location resolution preserves left/right distinction

- **WHEN** `mapSlotToLocation('right_arm', ProtoChassis.BIPED, hasMainGun)` is called
- **THEN** the resolver returns `ProtoLocation.RIGHT_ARM` (no remap)
- **AND** the symmetric `'left_arm'` call returns `ProtoLocation.LEFT_ARM`
- **AND** the `'legs'` slot returns `ProtoLocation.LEGS` (no remap)
