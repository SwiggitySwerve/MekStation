## ADDED Requirements

### Requirement: Shared Tactical Projection Frame Contract
The tactical map interface SHALL accept an explicit shared tactical projection frame that contains the per-hex projection lookup and source metadata for movement, combat, terrain, elevation, LOS, overlays, and invalid reasons. When a shared frame is supplied, rendered hex state SHALL be driven by that frame instead of re-derived from legacy movement or attack range props.

#### Scenario: Supplied shared frame drives rendered hex explanation
- **GIVEN** `HexMapDisplay` receives a shared tactical projection frame with terrain, movement, combat, blocked reason, source reference, and explanation data for a hex
- **WHEN** the hex renders
- **THEN** the hex SHALL expose projection status, movement status, combat status, blocked reasons, source references, and explanation from the supplied frame
- **AND** the map SHALL identify the projection source as shared projection data

#### Scenario: Local fallback is marked explicitly
- **GIVEN** `HexMapDisplay` receives legacy movement, terrain, or attack range props without a shared tactical projection frame
- **WHEN** the map derives its projection lookup internally
- **THEN** the map SHALL identify the projection source as a fallback-derived frame
- **AND** rendered hexes SHALL continue to expose projection explanation data for backward compatibility

#### Scenario: Missing shared projection coverage is diagnosable
- **GIVEN** `HexMapDisplay` receives a shared tactical projection frame that does not cover every rendered hex
- **WHEN** the map renders
- **THEN** the map SHALL expose the missing rendered hex keys as projection coverage diagnostics
- **AND** the missing coverage SHALL NOT be hidden by silently substituting legacy projection data for those hexes

#### Scenario: Shared frame takes precedence over legacy props
- **GIVEN** `HexMapDisplay` receives both a shared tactical projection frame and conflicting legacy movement or attack range props
- **WHEN** the same hex appears in both inputs
- **THEN** rendered projection status, invalid reasons, and explanations SHALL come from the shared frame
- **AND** automated tests SHALL fail if the legacy props override the supplied frame
