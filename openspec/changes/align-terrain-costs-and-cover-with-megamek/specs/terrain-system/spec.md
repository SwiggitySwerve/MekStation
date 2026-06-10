# terrain-system Spec Delta

## MODIFIED Requirements

### Requirement: Movement Cost by Terrain

The system SHALL calculate movement point cost based on terrain type, terrain level, and unit movement type. Per-motive entry costs SHALL mirror MegaMek `Terrain.movementCost`: swamp charges +1 to biped/quad meks and +2 to tracked/wheeled vehicles with hover/WiGE exempt; sand charges +1 only to non-dune-buggy wheeled vehicles; mud charges +1 with hover/WiGE/naval exempt; ice charges +1 with hover/WiGE exempt; level-1 snow charges +1 to wheeled vehicles only while level-2 snow charges +1 to all motives except hover/WiGE; ultra rough (level 2) and ultra rubble (level 6) charge +2 instead of +1.

**Rationale**: TechManual specifies different MP costs per terrain per movement mode.

**Priority**: Critical

#### Scenario: Clear terrain base cost

**GIVEN** a hex with terrain type Clear
**WHEN** calculating movement cost for any movement type
**THEN** the cost SHALL be 1 MP

#### Scenario: Light Woods walking cost

**GIVEN** a hex with terrain type LightWoods (level 1)
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 woods)

#### Scenario: Heavy Woods walking cost

**GIVEN** a hex with terrain type HeavyWoods (level 2)
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 3 MP (1 base + 2 woods)

#### Scenario: Jump ignores terrain

**GIVEN** a hex with terrain type HeavyWoods
**WHEN** calculating movement cost for Jump movement
**THEN** the cost SHALL be 1 MP (jumping ignores ground terrain)

#### Scenario: Water walking cost

**GIVEN** a hex with terrain type Water
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 water)

#### Scenario: Rough terrain cost

**GIVEN** a hex with terrain type Rough
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 rough)

#### Scenario: Wheeled vehicles on sand

**GIVEN** a hex with terrain type Sand
**WHEN** calculating movement cost for Wheeled movement
**THEN** the cost SHALL be 2 MP (1 base + 1 sand penalty for non-dune-buggy wheeled)

#### Scenario: Meks cross sand freely

**GIVEN** a hex with terrain type Sand
**WHEN** calculating movement cost for Walk, Tracked, or Hover movement
**THEN** the cost SHALL be 1 MP (sand penalises only wheeled vehicles and foot-bound infantry)

#### Scenario: Swamp costs per motive

**GIVEN** a hex with terrain type Swamp
**WHEN** calculating movement cost per movement type
**THEN** the cost SHALL be 2 MP for Walk/Run (biped/quad meks pay base 2 reduced by 1)
**AND** 3 MP for Tracked/Wheeled movement
**AND** 1 MP for Hover movement (hover/WiGE are exempt)

#### Scenario: Hover ignores swamp and mud

**GIVEN** a hex with terrain type Swamp or Mud
**WHEN** calculating movement cost for Hover movement
**THEN** the cost SHALL be 1 MP (no terrain penalty)

#### Scenario: Ice charges ground motives

**GIVEN** a hex with terrain type Ice
**WHEN** calculating movement cost for Walk or Tracked movement
**THEN** the cost SHALL be 2 MP (1 base + 1 ice)
**AND** Hover movement SHALL cost 1 MP (hover/WiGE are exempt)

---

### Requirement: Cover Levels

The system SHALL classify terrain into cover levels for partial/full cover determination. Swamp SHALL NOT grant cover: MegaMek's partial-cover sources are intervening elevation, buildings, and depth-1 water — swamp is not among them.

**Priority**: High

#### Scenario: No cover in clear terrain

**GIVEN** a unit in Clear terrain
**WHEN** determining cover level
**THEN** cover SHALL be NONE

#### Scenario: Partial cover in light woods

**GIVEN** a unit in LightWoods terrain
**WHEN** determining cover level
**THEN** cover SHALL be PARTIAL

#### Scenario: Full cover in heavy woods

**GIVEN** a unit in HeavyWoods terrain
**WHEN** determining cover level
**THEN** cover SHALL be FULL

#### Scenario: Partial cover in water

**GIVEN** a unit standing in Water
**WHEN** determining cover level
**THEN** cover SHALL be PARTIAL

#### Scenario: No cover in swamp

**GIVEN** a unit in Swamp terrain
**WHEN** determining cover level
**THEN** cover SHALL be NONE
**AND** the unit SHALL NOT receive the +1 partial-cover to-hit modifier
**AND** the unit SHALL NOT benefit from partial-cover leg-hit conversion

---

### Requirement: Terrain Feature Stacking

The system SHALL support multiple terrain features per hex (e.g., road through woods). Movement cost SHALL sum the entry costs of every terrain feature in the hex (per MegaMek `Hex.movementCost`), except that a pavement, road, or bridge surface bypasses the terrain sum entirely and water depth costs are applied separately.

**Priority**: Medium

#### Scenario: Road through woods

**GIVEN** a hex with both Road and LightWoods features
**WHEN** calculating movement cost using the road
**THEN** the road cost SHALL apply (0 additional MP)
**BUT** to-hit modifiers for woods SHALL still apply

#### Scenario: Water under ice

**GIVEN** a hex with both Water and Ice features
**WHEN** determining terrain effects
**THEN** the Ice SHALL be the primary terrain for movement
**AND** ice breaking rules SHALL apply based on unit weight

#### Scenario: Building with basement

**GIVEN** a hex with a Building feature at elevation 2 and basement at depth 1
**WHEN** determining terrain properties
**THEN** both above-ground and below-ground features SHALL be tracked

#### Scenario: Multi-feature hexes sum entry costs

**GIVEN** a hex with both Rough (level 1) and LightWoods (level 1) features
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 3 MP (1 base + 1 rough + 1 woods)
**AND** a hex carrying a pavement, road, or bridge surface feature SHALL bypass the terrain sum (1 MP base only)

---
