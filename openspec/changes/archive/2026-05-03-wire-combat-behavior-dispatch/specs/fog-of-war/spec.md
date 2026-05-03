# fog-of-war (delta)

## ADDED Requirements

### Requirement: Combat-State Redaction for Hidden Units

When fog-of-war is enabled and a unit is NOT visible to the local player (no LOS, no `lastKnown` exposure granting full state), the projected `IUnitToken` for that unit SHALL NOT include `combatState`-derived per-type fields. Specifically the projection adapter SHALL strip `altitude`, `velocity`, `infantryCount`, `platoonCount`, `trooperCount`, `protoCount`, `isGlider`, and `hasMainGun` from the redacted token.

This prevents the new `IUnitGameState.combatState` envelope (introduced in `game-state-management`) from leaking trooper counts, structural integrity, altitude, or chassis flags through the rendering pipeline to a player who has no sensor-grade reason to see them. `lastKnownPosition` and `fogStatus = 'lastKnown'` MAY still be set per the existing fog model.

#### Scenario: Hidden enemy infantry leaks no troopers

- **GIVEN** fog-of-war is enabled
- **AND** an enemy infantry platoon is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState` for rendering
- **THEN** the returned `IUnitToken.infantryCount` SHALL be `undefined`
- **AND** `IUnitToken.platoonCount` SHALL be `undefined`

#### Scenario: Hidden enemy aerospace leaks no altitude

- **GIVEN** fog-of-war is enabled
- **AND** an enemy aerospace fighter is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the fighter's `IUnitGameState`
- **THEN** the returned `IUnitToken.altitude` SHALL be `undefined`
- **AND** `IUnitToken.velocity` SHALL be `undefined`

#### Scenario: Hidden enemy battle armor leaks no troopers

- **GIVEN** fog-of-war is enabled
- **AND** an enemy battle armor squad is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the squad's `IUnitGameState`
- **THEN** the returned `IUnitToken.trooperCount` SHALL be `undefined`

#### Scenario: Hidden enemy protomech leaks no chassis flags

- **GIVEN** fog-of-war is enabled
- **AND** an enemy proto point is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the proto's `IUnitGameState`
- **THEN** the returned `IUnitToken.protoCount` SHALL be `undefined`
- **AND** `IUnitToken.isGlider` SHALL be `undefined`
- **AND** `IUnitToken.hasMainGun` SHALL be `undefined`

#### Scenario: Owned units are not redacted

- **GIVEN** fog-of-war is enabled
- **AND** the local player owns an infantry platoon with `combatState.kind === 'platoon'` and `survivingTroopers === 22`
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState`
- **THEN** the returned `IUnitToken.infantryCount` SHALL equal `22`

#### Scenario: Visible enemies (in-LOS) are not redacted

- **GIVEN** fog-of-war is enabled
- **AND** an enemy infantry platoon IS visible to the local player via owned-unit LOS
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState`
- **THEN** `IUnitToken.infantryCount` SHALL reflect the live `survivingTroopers` value
