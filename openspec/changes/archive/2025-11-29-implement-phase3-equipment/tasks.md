# Implementation Tasks: Phase 3 Equipment Systems

## 1. Weapon System

- [x] 1.1 Create WeaponType enum (Energy, Ballistic, Missile, Physical)
- [x] 1.2 Create IWeapon interface extending ITechBaseEntity, IPlaceableComponent
- [x] 1.3 Implement damage, heat, range properties
- [x] 1.4 Implement minimum/short/medium/long range values
- [x] 1.5 Create weapon category classifications
- [x] 1.6 Implement weapon data for all standard weapons
- [x] 1.7 Write weapon validation tests

## 2. Ammunition System

- [x] 2.1 Create IAmmunition interface
- [x] 2.2 Implement shots-per-ton calculations
- [x] 2.3 Implement ammo-weapon compatibility
- [x] 2.4 Implement explosion rules (ammo critical hits)
- [x] 2.5 Implement CASE/CASE II protection rules
- [x] 2.6 Create ammo data for all standard types
- [x] 2.7 Write ammunition validation tests

## 3. Electronics System

- [x] 3.1 Create IElectronics interface
- [x] 3.2 Implement C3 Master/Slave/i systems
- [x] 3.3 Implement ECM (Guardian, Angel) systems
- [x] 3.4 Implement TAG and targeting computers
- [x] 3.5 Implement probe systems (Active, Beagle)
- [x] 3.6 Create electronics data catalog
- [x] 3.7 Write electronics validation tests

## 4. Physical Weapons System

- [x] 4.1 Create IPhysicalWeapon interface
- [x] 4.2 Implement hatchet rules (tonnage/7 damage)
- [x] 4.3 Implement sword rules (tonnage/10 + 1 damage)
- [x] 4.4 Implement claws, mace, and other physical weapons
- [x] 4.5 Implement actuator requirements for physical weapons
- [x] 4.6 Write physical weapon validation tests

## 5. Equipment Placement

- [x] 5.1 Create location restriction rules
- [x] 5.2 Implement split equipment rules (across locations)
- [x] 5.3 Implement arm-mounted weapon restrictions
- [x] 5.4 Implement torso-mounted restrictions
- [x] 5.5 Implement head equipment restrictions
- [x] 5.6 Write placement validation tests

## 6. Equipment Database

- [x] 6.1 Design database schema for equipment
- [x] 6.2 Import energy weapons (lasers, PPCs, flamers)
- [x] 6.3 Import ballistic weapons (ACs, Gausses, MGs)
- [x] 6.4 Import missile weapons (LRMs, SRMs, MRMs)
- [x] 6.5 Import electronics and special equipment
- [x] 6.6 Implement equipment lookup and filtering
- [x] 6.7 Write database query tests

## 7. Hardpoint System

- [x] 7.1 Define hardpoint types (energy, ballistic, missile, physical)
- [x] 7.2 Implement weapon-hardpoint compatibility
- [x] 7.3 Implement OmniMech pod rules
- [x] 7.4 Implement fixed vs pod equipment
- [x] 7.5 Write hardpoint validation tests

## 8. Integration & Testing

- [x] 8.1 Create unified barrel export for Phase 3 types
- [x] 8.2 Verify equipment-construction integration
- [x] 8.3 Run full type checking
- [x] 8.4 Run all Phase 3 tests
- [x] 8.5 Validate equipment placement on sample units
