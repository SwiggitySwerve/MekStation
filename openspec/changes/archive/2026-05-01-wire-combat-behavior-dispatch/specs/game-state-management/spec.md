# game-state-management (delta)

## ADDED Requirements

### Requirement: Per-Unit Combat-Behavior Envelope

`IUnitGameState` SHALL carry an optional `combatState` slot whose shape is a discriminated union keyed by `kind`. The slot envelopes the per-type combat-behavior structs that the four archived combat-behavior changes (`add-aerospace-combat-behavior`, `add-protomech-combat-behavior`, `add-infantry-combat-behavior`, `add-battlearmor-combat-behavior`) each declared at `unit.combatState.{aero|proto|platoon|squad}`.

The envelope MUST be the single channel through which per-type combat data flows from the game state to consumers (renderers, fog redaction, multiplayer sync). Per-type side-channels are PROHIBITED.

The envelope MUST be immutable from the consumer's perspective: producers (reducers, init helpers) construct a new `combatState` object when the per-type struct changes; consumers never mutate it in place.

#### Scenario: Envelope shape

- **GIVEN** an `IUnitGameState` for any unit
- **WHEN** the type is inspected
- **THEN** `combatState` SHALL be one of `{ kind: 'aero'; state: IAerospaceCombatState }`, `{ kind: 'proto'; state: IProtoMechCombatState }`, `{ kind: 'platoon'; state: IInfantryCombatState }`, or `{ kind: 'squad'; state: IBattleArmorCombatState }`
- **AND** the slot SHALL be optional (legacy mech-only callers continue to omit it without breakage)

#### Scenario: Single-channel rule

- **GIVEN** a renderer or sync consumer needs per-type combat data
- **WHEN** it reads `IUnitGameState`
- **THEN** it SHALL obtain that data ONLY through `combatState`
- **AND** it SHALL NOT consult parallel per-type maps, side-channels, or out-of-band lookups

### Requirement: Combat-State Seeding at Initialization

`createInitialUnitState` SHALL seed `combatState` whenever the input `IGameUnit.unitType` is one of the four supported per-type discriminants (aerospace fighter / conventional fighter / small craft → `aero`; protomech → `proto`; infantry → `platoon`; battle armor → `squad`). The seeded `state` MUST be the return value of the matching existing factory: `createAerospaceCombatState`, `createProtoMechCombatState`, `createInfantryCombatStateFromUnit`, or `createBattleArmorCombatState`.

Mech and vehicle units MUST leave `combatState` unset (until vehicle support lands as a future `kind: 'vehicle'` variant).

#### Scenario: Aerospace seeding

- **GIVEN** an `IGameUnit` whose `unitType` is `AEROSPACE_FIGHTER`, `CONVENTIONAL_FIGHTER`, or `SMALL_CRAFT`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** the returned `IUnitGameState` SHALL have `combatState.kind === 'aero'`
- **AND** `combatState.state` SHALL equal `createAerospaceCombatState({...})` invoked with the unit's construction-time `maxSI`, `armorByArc`, `heatSinks`, `fuelPoints`, `safeThrust`, `maxThrust`

#### Scenario: Infantry seeding

- **GIVEN** an `IGameUnit` whose `unitType` is `INFANTRY`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** `combatState.kind` SHALL be `'platoon'`
- **AND** `combatState.state` SHALL equal `createInfantryCombatStateFromUnit(unit)`

#### Scenario: Protomech seeding

- **GIVEN** an `IGameUnit` whose `unitType` is `PROTOMECH`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** `combatState.kind` SHALL be `'proto'`
- **AND** `combatState.state` SHALL equal `createProtoMechCombatState({...})` invoked with the unit's `chassisType`, `hasMainGun`, per-location armor / structure maps

#### Scenario: Battle armor seeding

- **GIVEN** an `IGameUnit` whose `unitType` is `BATTLE_ARMOR`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** `combatState.kind` SHALL be `'squad'`
- **AND** `combatState.state` SHALL equal `createBattleArmorCombatState({...})` invoked with the unit's `squadSize`, per-trooper armor, stealth kind, magnetic-clamp / vibroclaw flags

#### Scenario: Mech and vehicle units leave the slot unset

- **GIVEN** an `IGameUnit` whose `unitType` is `BATTLEMECH` or any vehicle motive type
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** the returned `IUnitGameState.combatState` SHALL be `undefined`

### Requirement: Discriminated Initialization Assertion

`createInitialUnitState` SHALL throw a typed error when an `IGameUnit` whose `unitType` is one of the four supported per-type discriminants arrives without the construction inputs needed to seed its `combatState`. This rejects silent fall-back to defaults at the entry point and surfaces compendium / lobby gaps loudly during session creation.

#### Scenario: Missing aerospace inputs

- **GIVEN** an `IGameUnit` with `unitType === AEROSPACE_FIGHTER` whose construction blob lacks `maxSI`, `armorByArc`, or `heatSinks`
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL identify the unit id and the missing field(s)

#### Scenario: Aerospace inputs present

- **GIVEN** the same `IGameUnit` after the missing fields are populated
- **WHEN** `createInitialUnitState(unit, position)` runs
- **THEN** the returned `IUnitGameState.combatState.kind` SHALL be `'aero'`
- **AND** no error SHALL be thrown

### Requirement: Aerospace Altitude Field

`IAerospaceCombatState` SHALL carry an `altitude` field expressing the unit's current altitude band (0 = landed; positive integers = airborne in standard altitude bands per BattleTech aerospace rules). The factory `createAerospaceCombatState` SHALL accept an optional `altitude` parameter and SHALL default to `1` (airborne) when the parameter is omitted, matching the prior render-time fallback in `AerospaceToken`.

`velocity` is intentionally NOT added in this change; consumers that need velocity SHALL fall back to `0` and a TODO marker SHALL point at "movement slice 2".

#### Scenario: Default altitude on construction

- **GIVEN** `createAerospaceCombatState({...})` is called without `altitude`
- **WHEN** the resulting state is inspected
- **THEN** `altitude` SHALL equal `1`

#### Scenario: Explicit landed altitude

- **GIVEN** `createAerospaceCombatState({..., altitude: 0})` is called
- **WHEN** the resulting state is inspected
- **THEN** `altitude` SHALL equal `0`
- **AND** downstream renderers SHALL treat the unit as landed
