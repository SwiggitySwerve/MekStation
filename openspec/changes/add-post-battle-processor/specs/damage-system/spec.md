# damage-system Specification Delta

## ADDED Requirements

### Requirement: Unit Combat State Persistence

Each BattleMech in a campaign SHALL have a persistent `IUnitCombatState`
stored alongside its immutable construction state. Combat damage SHALL be
recorded in this state, never in the construction state itself.

#### Scenario: Combat state distinct from construction state

- **GIVEN** a unit with a fresh construction state
- **WHEN** its combat state is first read
- **THEN** `getCombatState(unitId)` SHALL return an object matching
  `createInitialCombatState(unit)` (full armor, full structure, full ammo,
  no destroyed components)
- **AND** the construction state SHALL remain byte-identical

#### Scenario: Combat state captures per-location armor

- **GIVEN** a combat state `S` for a unit with 10 LT armor construction
  points
- **WHEN** a battle applies 6 armor damage to LT via `applyPostBattle`
- **THEN** `S.currentArmorPerLocation[LT]` SHALL equal 4
- **AND** the construction-state LT armor SHALL still equal 10

#### Scenario: Combat state captures per-location structure

- **GIVEN** a unit that suffered 3 structure damage in the right torso
- **WHEN** combat state is updated
- **THEN** `S.currentStructurePerLocation[RT]` SHALL equal
  `construction.RT.structure - 3`

#### Scenario: Combat state tracks destroyed components

- **GIVEN** a unit whose LRM-15 in the right torso was destroyed during
  battle
- **WHEN** combat state is updated
- **THEN** `S.destroyedComponents` SHALL contain an entry
  `{ location: RT, slot: <n>, componentType: "weapon", name: "LRM 15",
destroyedAt: matchId }`

#### Scenario: Combat state tracks ammo remaining

- **GIVEN** a unit that started with 16 LRM rounds and fired 8 in battle
- **WHEN** combat state is updated
- **THEN** `S.ammoRemaining["LRM 15 Ammo"]` SHALL equal 8
- **AND** `S.ammoRemaining` values SHALL clamp at zero (never negative)

### Requirement: Combat-Ready Classification

A unit's combat readiness SHALL be derivable from its `IUnitCombatState`.

#### Scenario: Unit with destroyed CT is not combat-ready

- **GIVEN** a combat state where CT structure is 0
- **WHEN** `isUnitCombatReady(state)` is called
- **THEN** it SHALL return `false`

#### Scenario: Unit with intact state is combat-ready

- **GIVEN** a combat state with no location at zero structure and no
  critical components destroyed
- **WHEN** `isUnitCombatReady(state)` is called
- **THEN** it SHALL return `true`

### Requirement: Idempotent Damage Persistence

Applying the same `ICombatOutcome` to combat state twice SHALL produce no
additional damage beyond the first application.

#### Scenario: Re-application does not double damage

- **GIVEN** a unit whose combat state already reflects `outcome` with
  `matchId = M`
- **WHEN** `applyPostBattle(outcome, campaign)` is called again with the
  same outcome
- **THEN** `currentArmorPerLocation` SHALL remain unchanged
- **AND** `currentStructurePerLocation` SHALL remain unchanged
- **AND** `destroyedComponents` SHALL NOT gain duplicate entries (dedup by
  `location + slot`)
- **AND** `ammoRemaining` SHALL NOT decrease further
