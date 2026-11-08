## ADDED Requirements

### Requirement: Shared Unit Destruction Cause Contract

UnitDestroyed producers, damage results, and replay validation SHALL use one authoritative seven-value cause definition without changing serialized behavior.

#### Scenario: Existing destruction cause round trip

- **WHEN** a public UnitDestroyed payload contains damage, ammo_explosion, pilot_death, engine_destroyed, impossible_displacement, ct_destroyed, or head_destroyed
- **THEN** baseline v1 replay SHALL preserve the payload exactly

#### Scenario: Separate vehicle taxonomy

- **WHEN** a vehicle-only cause is translated to UnitDestroyed
- **THEN** the existing mapping SHALL remain unchanged
- **AND** replay SHALL reject vehicle-only causes in the public UnitDestroyed payload

#### Scenario: Fog of war

- **WHEN** a redacted UnitDestroyed payload contains only unitId
- **THEN** replay SHALL continue to accept that payload
