# tactical-map-interface (delta)

## ADDED Requirements

### Requirement: Unified Combat-State Token Projection Adapter

The system SHALL provide a single shared `unitStateToToken` projection adapter that converts an `IUnitGameState` into an `IUnitToken` for tactical-map rendering. The adapter MUST narrow on `IUnitGameState.combatState.kind` and SHALL populate per-type token fields (`altitude`, `infantryCount`, `trooperCount`, `protoCount`, `isGlider`, `hasMainGun`) from the envelope.

The adapter SHALL be the only call-site in the codebase that reads `IUnitGameState.combatState` to populate `IUnitToken` per-type fields. Per-component or per-screen reimplementations of this projection are PROHIBITED.

#### Scenario: Aerospace projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'aero'` and `state.altitude === 0`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.altitude` SHALL equal `0`
- **AND** `unitType` SHALL be `TokenUnitType.Aerospace`

#### Scenario: Infantry projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'platoon'` and `state.survivingTroopers === 22`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.infantryCount` SHALL equal `22`
- **AND** `unitType` SHALL be `TokenUnitType.Infantry`

#### Scenario: Battle armor projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'squad'` and 3 surviving troopers
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.trooperCount` SHALL equal `3`
- **AND** `unitType` SHALL be `TokenUnitType.BattleArmor`

#### Scenario: Protomech projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'proto'`, `state.chassisType === ProtoChassis.GLIDER`, and `state.hasMainGun === true`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.protoCount` SHALL reflect surviving proto count
- **AND** `IUnitToken.isGlider` SHALL be `true`
- **AND** `IUnitToken.hasMainGun` SHALL be `true`
- **AND** `unitType` SHALL be `TokenUnitType.ProtoMech`

#### Scenario: Mech projection (legacy path)

- **GIVEN** an `IUnitGameState` whose `combatState` is `undefined`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken` SHALL omit per-type fields
- **AND** `unitType` SHALL default per current `TokenUnitType.Mech` rules

## MODIFIED Requirements

### Requirement: Per-Type Token Renders SHALL Read Envelope Values

The four per-type token components (`AerospaceToken`, `InfantryToken`, `BattleArmorToken`, `ProtoMechToken`) SHALL read per-type fields (`altitude`, `infantryCount`, `platoonCount`, `trooperCount`, `protoCount`, `isGlider`, `hasMainGun`) directly from the `IUnitToken` props with NO inline `?? <default>` fall-back expression.

Producers (the unified `unitStateToToken` projection adapter) are responsible for populating concrete values from `IUnitGameState.combatState`. When `combatState` is absent for a unit whose `unitType` is in the four supported per-type discriminants, that is a producer-side bug (caught by the init-time assertion in `game-state-management`), NOT a render-side concern.

(`velocity` is exempt from this rule until "movement slice 2" lands; an `?? 0` fallback MAY remain in `AerospaceToken` with a TODO comment.)

The previous behaviour — each token component carrying inline `?? <default>` fall-backs (`altitude ?? 1`, `infantryCount ?? 28`, `trooperCount ?? 4`, `protoCount ?? 5`) so they would render visibly even when no producer wired the field — is REMOVED.

#### Scenario: Aerospace token renders envelope altitude

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.Aerospace` and `altitude === 0`
- **WHEN** `<AerospaceToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect the landed visual state
- **AND** the source code SHALL NOT contain any `altitude ?? <default>` expression

#### Scenario: Infantry token renders envelope troopers

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.Infantry` and `infantryCount === 22`
- **WHEN** `<InfantryToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 22 troopers
- **AND** the source code SHALL NOT contain any `infantryCount ?? <default>` expression

#### Scenario: Battle armor token renders envelope troopers

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.BattleArmor` and `trooperCount === 3`
- **WHEN** `<BattleArmorToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 3 trooper dots
- **AND** the source code SHALL NOT contain any `trooperCount ?? <default>` expression

#### Scenario: Protomech token renders envelope flags

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.ProtoMech`, `protoCount === 4`, `isGlider === true`, `hasMainGun === false`
- **WHEN** `<ProtoMechToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 4 protos, glider variant, no main gun
- **AND** the source code SHALL NOT contain `protoCount ?? <default>`, `isGlider ?? false`, or `hasMainGun ?? false` expressions
