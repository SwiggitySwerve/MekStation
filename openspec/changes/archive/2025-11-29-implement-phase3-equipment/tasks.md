# Implementation Tasks: Phase 3 Equipment Systems

## 1. Weapon System
- [ ] 1.1 Create WeaponType enum (Energy, Ballistic, Missile, Physical)
- [ ] 1.2 Create IWeapon interface extending ITechBaseEntity, IPlaceableComponent
- [ ] 1.3 Implement damage, heat, range properties
- [ ] 1.4 Implement minimum/short/medium/long range values
- [ ] 1.5 Create weapon category classifications
- [ ] 1.6 Implement weapon data for all standard weapons
- [ ] 1.7 Write weapon validation tests

## 2. Ammunition System
- [ ] 2.1 Create IAmmunition interface
- [ ] 2.2 Implement shots-per-ton calculations
- [ ] 2.3 Implement ammo-weapon compatibility
- [ ] 2.4 Implement explosion rules (ammo critical hits)
- [ ] 2.5 Implement CASE/CASE II protection rules
- [ ] 2.6 Create ammo data for all standard types
- [ ] 2.7 Write ammunition validation tests

## 3. Electronics System
- [ ] 3.1 Create IElectronics interface
- [ ] 3.2 Implement C3 Master/Slave/i systems
- [ ] 3.3 Implement ECM (Guardian, Angel) systems
- [ ] 3.4 Implement TAG and targeting computers
- [ ] 3.5 Implement probe systems (Active, Beagle)
- [ ] 3.6 Create electronics data catalog
- [ ] 3.7 Write electronics validation tests

## 4. Physical Weapons System
- [ ] 4.1 Create IPhysicalWeapon interface
- [ ] 4.2 Implement hatchet rules (tonnage/7 damage)
- [ ] 4.3 Implement sword rules (tonnage/10 + 1 damage)
- [ ] 4.4 Implement claws, mace, and other physical weapons
- [ ] 4.5 Implement actuator requirements for physical weapons
- [ ] 4.6 Write physical weapon validation tests

## 5. Equipment Placement
- [ ] 5.1 Create location restriction rules
- [ ] 5.2 Implement split equipment rules (across locations)
- [ ] 5.3 Implement arm-mounted weapon restrictions
- [ ] 5.4 Implement torso-mounted restrictions
- [ ] 5.5 Implement head equipment restrictions
- [ ] 5.6 Write placement validation tests

## 6. Equipment Database
- [ ] 6.1 Design database schema for equipment
- [ ] 6.2 Import energy weapons (lasers, PPCs, flamers)
- [ ] 6.3 Import ballistic weapons (ACs, Gausses, MGs)
- [ ] 6.4 Import missile weapons (LRMs, SRMs, MRMs)
- [ ] 6.5 Import electronics and special equipment
- [ ] 6.6 Implement equipment lookup and filtering
- [ ] 6.7 Write database query tests

## 7. Hardpoint System
- [ ] 7.1 Define hardpoint types (energy, ballistic, missile, physical)
- [ ] 7.2 Implement weapon-hardpoint compatibility
- [ ] 7.3 Implement OmniMech pod rules
- [ ] 7.4 Implement fixed vs pod equipment
- [ ] 7.5 Write hardpoint validation tests

## 8. Integration & Testing
- [ ] 8.1 Create unified barrel export for Phase 3 types
- [ ] 8.2 Verify equipment-construction integration
- [ ] 8.3 Run full type checking
- [ ] 8.4 Run all Phase 3 tests
- [ ] 8.5 Validate equipment placement on sample units

