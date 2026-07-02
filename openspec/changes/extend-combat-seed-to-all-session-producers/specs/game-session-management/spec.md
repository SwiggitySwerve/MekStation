# game-session-management (delta)

Delta for `extend-combat-seed-to-all-session-producers`: adds the Combat State Seeding at Session Creation requirement so every production session producer supplies per-location armor/structure/heat-sink construction inputs on the units it passes to `createGameSession`, closing the producer-coverage gap left by the #998 engine fix (which wired only the `InteractiveSession` constructor and `GameEngine.runToCompletion`).

## ADDED Requirements

### Requirement: Combat State Seeding at Session Creation

Every production session producer SHALL supply per-location combat construction inputs (`armorByLocation`, `structureByLocation`, and heat-sink capacity) on the `IGameUnit` list it passes to session creation, so the `GameCreated` event payload and the derived initial state carry real armor and structure for BattleMech units. Producers SHALL derive these inputs from adapted catalog units via `gameUnitsWithAdaptedCombatSeeds` (or supply equivalent explicit values). `startingInternalStructure` SHALL seed alongside structure so the retreat trigger's structure-loss ratio reads real starting values. Test fixtures that intentionally construct bare `IGameUnit` lists without construction inputs SHALL retain the legacy empty-map behavior.

**Priority**: Critical

#### Scenario: Campaign encounter launch seeds armor and structure

- **GIVEN** a campaign encounter with a BattleMech force is launched via the encounter service
- **WHEN** the session's `GameCreated` event derives the initial state
- **THEN** each BattleMech unit's `armor` and `structure` maps SHALL be non-empty with catalog per-location values
- **AND** `startingInternalStructure` SHALL equal the seeded structure map

#### Scenario: Lobby and pre-battle builders seed armor and structure

- **GIVEN** a session built from lobby state (hot-seat) or from a pre-battle skirmish configuration
- **WHEN** the initial state derives
- **THEN** BattleMech units SHALL carry non-empty per-location `armor` and `structure` identical to their adapted catalog values

#### Scenario: Guest mirror inherits seeded state

- **GIVEN** a host session produced by a seeded producer
- **WHEN** a guest creates its P2P mirror session
- **THEN** the mirror's derived unit states SHALL carry the same seeded armor and structure values as the host (the mirror remains a value-equal twin; the guarantee flows from the host producer)

#### Scenario: Synthetic fixtures keep the legacy path

- **GIVEN** a test fixture constructing bare `IGameUnit` entries with no construction inputs
- **WHEN** the initial unit state is created
- **THEN** `armor` and `structure` SHALL remain empty maps (legacy behavior, unchanged)
