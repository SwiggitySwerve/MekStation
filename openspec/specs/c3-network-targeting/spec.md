# c3-network-targeting Specification

## Purpose

Defines C3 (Command, Control, Communications) and C3i (Improved) network targeting systems. C3 networks allow units to share targeting data, enabling all networked units to use the best range bracket among the network for to-hit calculations. ECM disrupts C3 networks.

## Non-Goals

The following advanced C3 variants are out of scope for this specification and will be addressed in future specs:

- **Naval C3**: Capital-ship-scale C3 networking
- **Nova CEWS (Combined Electronic Warfare System)**: Clan EW/C3 hybrid
- **Boosted C3**: Extended-range C3 Master/Slave variant
- **Stealth vs C3 interactions**: Playtest-3 rules for stealth armor nullifying C3 targeting

## Requirements

### Requirement: C3 Master/Slave Network Formation

The system SHALL support C3 Master/Slave networks with a maximum of 4 units per network. The network MUST include exactly one unit with a C3 Master Computer. All other units in the network MUST have a C3 Slave Unit.

**Source**: `src/types/enums/EquipmentFlag.ts:117-118` (C3s flag), `src/services/equipment/EquipmentNameMapper.ts:184-186` (C3 equipment IDs)

#### Scenario: Form a valid C3 Master/Slave network

- **GIVEN** 4 units on the same team: Unit A with C3 Master, Units B/C/D with C3 Slave
- **WHEN** a C3 network is formed
- **THEN** all 4 units SHALL be connected in a single C3 network
- **AND** the network type SHALL be "master-slave"

#### Scenario: Reject C3 network without master

- **GIVEN** 3 units on the same team, all with C3 Slave (no C3 Master)
- **WHEN** attempting to form a C3 network
- **THEN** the network SHALL NOT be formed
- **AND** units SHALL NOT receive any C3 targeting benefits

#### Scenario: Reject C3 network exceeding 4-unit limit

- **GIVEN** 5 units on the same team: Unit A with C3 Master, Units B/C/D/E with C3 Slave
- **WHEN** attempting to form a C3 network
- **THEN** only 4 units (1 master + 3 slaves) SHALL be in the network
- **AND** the 5th unit SHALL NOT receive C3 targeting benefits

### Requirement: C3i Peer-to-Peer Network Formation

The system SHALL support C3i (Improved) networks with a maximum of 6 units per network. C3i networks are peer-to-peer and do not require a master unit. All units in the network MUST have a C3i Computer.

**Source**: `src/types/enums/EquipmentFlag.ts:119-120` (C3i flag), `src/services/equipment/EquipmentNameMapper.ts:186-187` (C3i equipment ID)

#### Scenario: Form a valid C3i network

- **GIVEN** 6 units on the same team, each with C3i Computer
- **WHEN** a C3i network is formed
- **THEN** all 6 units SHALL be connected in a single C3i network
- **AND** the network type SHALL be "improved"

#### Scenario: C3i network is peer-to-peer (no single point of failure)

- **GIVEN** 4 units in a C3i network
- **WHEN** one unit is destroyed
- **THEN** the remaining 3 units SHALL remain networked
- **AND** the surviving units SHALL continue to receive C3i targeting benefits

### Requirement: C3 Network Targeting Benefit

When a unit in a C3 network attacks a target, the system SHALL calculate the range from ALL networked units to the target and use the BEST (shortest) range bracket for to-hit calculation. This replaces the attacker's actual range bracket.

**Source**: `src/utils/gameplay/toHit.ts:103-136` (range bracket calculation), `src/utils/gameplay/toHit.ts:32-38` (range modifiers)

#### Scenario: Networked unit uses best range bracket

- **GIVEN** Units A, B, C in a C3 network attacking Target T
- **AND** Unit A is at 15 hexes from T (long range for Medium Laser)
- **AND** Unit B is at 4 hexes from T (short range for Medium Laser)
- **WHEN** Unit A fires a Medium Laser at Target T
- **THEN** Unit A SHALL use short range bracket (+0) instead of long range bracket (+4)
- **AND** the to-hit modifier description SHALL indicate "C3 Network: using best range bracket"

#### Scenario: All units at same range — no benefit

- **GIVEN** Units A, B, C in a C3 network attacking Target T
- **AND** all units are at 8 hexes from T (medium range for Medium Laser)
- **WHEN** Unit A fires a Medium Laser at Target T
- **THEN** Unit A SHALL use medium range bracket (+2)
- **AND** no C3 targeting benefit SHALL apply

#### Scenario: Out-of-network unit gets no benefit

- **GIVEN** Units A, B in a C3 network and Unit C NOT in any network
- **AND** Unit A is at 3 hexes from Target T (short range)
- **AND** Unit C is at 14 hexes from Target T (long range)
- **WHEN** Unit C fires at Target T
- **THEN** Unit C SHALL use long range bracket (+4)
- **AND** Unit C SHALL NOT benefit from Unit A's proximity

### Requirement: C3 Master Destruction

When the C3 Master unit is destroyed, the entire C3 Master/Slave network SHALL dissolve immediately. All slave units lose C3 targeting benefits.

**Source**: `src/utils/gameplay/electronicWarfare.ts:674-693` (equipment destruction pattern)

#### Scenario: Master destruction dissolves network

- **GIVEN** Units A (Master), B, C, D (Slaves) in a C3 network
- **WHEN** Unit A (Master) is destroyed
- **THEN** the C3 network SHALL be dissolved
- **AND** Units B, C, D SHALL lose all C3 targeting benefits immediately
- **AND** Units B, C, D SHALL use their own range brackets for subsequent attacks

### Requirement: ECM Disrupts C3 Network

When an attacker or target is within an active enemy ECM bubble, C3 network targeting benefits SHALL be denied for that attack. The network remains formed but the targeting benefit is blocked.

**Source**: `src/utils/gameplay/electronicWarfare.ts:5` (ECM nullifies C3), `openspec/specs/ecm-electronic-warfare/spec.md:30-33` (Guardian ECM nullifies C3)

#### Scenario: ECM blocks C3 targeting benefit

- **GIVEN** Units A, B in a C3 network, Target T protected by enemy Guardian ECM
- **AND** Unit A is at 14 hexes from T (long range)
- **AND** Unit B is at 3 hexes from T (short range)
- **WHEN** Unit A fires at Target T
- **THEN** Unit A SHALL use long range bracket (+4) — its own range
- **AND** C3 network benefit SHALL be denied
- **AND** the to-hit breakdown SHALL indicate "C3 Network disrupted by ECM"

#### Scenario: ECM disruption does not dissolve the network

- **GIVEN** Units A, B in a C3 network, Target T protected by enemy ECM
- **AND** Target U is NOT protected by ECM
- **WHEN** Unit A fires at Target U
- **THEN** C3 targeting benefit SHALL apply normally for the attack on U
- **AND** the network SHALL remain intact

### Requirement: C3 Equipment Specifications

C3 equipment SHALL have the following weight, slot, and compatibility properties.

**Source**: `src/types/equipment/ElectronicsTypes.ts:24` (ElectronicsCategory.C3), `data/equipment/electronics/c3.json`

#### Scenario: C3 Master Computer specifications

- **GIVEN** an Inner Sphere BattleMech
- **WHEN** mounting a C3 Master Computer
- **THEN** weight SHALL be 5 tons
- **AND** criticalSlots SHALL be 5
- **AND** only 1 C3 Master Computer SHALL be allowed per unit

#### Scenario: C3 Slave Unit specifications

- **GIVEN** an Inner Sphere BattleMech
- **WHEN** mounting a C3 Slave Unit
- **THEN** weight SHALL be 1 ton
- **AND** criticalSlots SHALL be 1

#### Scenario: C3i Computer specifications

- **GIVEN** an Inner Sphere BattleMech
- **WHEN** mounting a C3i Computer
- **THEN** weight SHALL be 2.5 tons
- **AND** criticalSlots SHALL be 2

#### Scenario: C3 and C3i mutual exclusivity

- **GIVEN** a unit with a C3 Slave Unit installed
- **WHEN** attempting to install a C3i Computer
- **THEN** the installation SHALL be rejected
- **AND** the validation error SHALL state "C3 Slave cannot be combined with C3 Improved"

**Source**: `src/services/validation/rules/equipment/EquipmentUnitTypeRules.ts:378-380`

## Dependencies

### Depends On

- **ecm-electronic-warfare**: ECM disruption of C3 networks (Guardian ECM nullifies C3 targeting sharing)
- **electronics-system**: C3 equipment definitions (weight, slots, categories)
- **to-hit-resolution**: Range bracket calculation pipeline where C3 benefit is applied

### Used By

- **combat-resolution**: C3 targeting modifies to-hit calculations during attack resolution
- **battle-value-system**: C3 modifier affects unit battle value (`src/types/validation/BattleValue.ts:278`)
