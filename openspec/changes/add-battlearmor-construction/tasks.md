# Tasks: Add BattleArmor Construction

## 1. Types and Interfaces

- [x] 1.1 Extend `IBattleArmorUnit` with `chassisType`, `weightClass`, `squadSize`, `movementType`, `groundMP`, `jumpMP`, `armorType`, `armorPointsPerTrooper`
- [x] 1.2 Add `BAChassisType` enum (Biped, Quad)
- [x] 1.3 Add `BAWeightClass` enum (PA(L), Light, Medium, Heavy, Assault)
- [x] 1.4 Add `BAMovementType` enum (Ground, Jump, VTOL, UMU)
- [x] 1.5 Add `BAManipulator` enum (None, BasicClaw, BattleClaw, VibroClaw, HeavyClaw, MineClearance, CargoLifter, IndustrialDrill, Magnet)
- [x] 1.6 Add `BALocation` enum (Body, LeftArm, RightArm, LeftLeg, RightLeg)
- [x] 1.7 Add `IBAWeaponMount`, `IBAEquipmentMount` interfaces

## 2. Weight Class and Trooper Mass

- [x] 2.1 Implement per-weight-class mass range per existing spec: PA(L) 80-400 kg, Light 401-750, Medium 751-1000, Heavy 1001-1500, Assault 1501-2000
- [x] 2.2 Validate total trooper mass (armor + weapons + equipment) stays in range
- [x] 2.3 Max armor per trooper per weight class: PA(L) 2, Light 5, Medium 8, Heavy 10, Assault 14
- [x] 2.4 Unit tests per class

## 3. Squad Composition

- [x] 3.1 IS squads default to 4 troopers
- [x] 3.2 Clan squads default to 5 troopers (Elemental Point)
- [x] 3.3 Support squadSize 1–6 with validation warning outside 4/5
- [ ] 3.4 All troopers in a squad share identical loadout (homogeneous)

## 4. Movement and MP

- [x] 4.1 Ground MP cap by weight class: PA(L) 3, Light 3, Medium 2, Heavy 2, Assault 1
- [x] 4.2 Jump MP cap by weight class: PA(L) 3, Light 3, Medium 3, Heavy 2, Assault 0
- [x] 4.3 VTOL MP: Light / Medium only, max 5
- [x] 4.4 UMU MP: any class, max 3
- [ ] 4.5 Extra MP beyond base 1 costs weight (mass table by class)
- [x] 4.6 Reject illegal combos (Assault + VTOL, Assault + Jump ≥ 1)

## 5. Armor per Trooper

- [x] 5.1 Armor types: Standard BA, Stealth (Basic/Improved/Prototype), Mimetic, Reactive, Reflective, Fire-Resistant
- [x] 5.2 Weight per point depends on armor type (Standard 50 kg, Stealth 60 kg, etc.)
- [x] 5.3 Stealth adds equipment slots in body for camouflage generator
- [x] 5.4 Enforce max points ≤ class cap
- [x] 5.5 Reject armor type illegal for class (Mimetic not on Heavy/Assault in standard ruleset)

## 6. Manipulator Selection

- [x] 6.1 Biped chassis: two manipulators (left arm, right arm)
- [x] 6.2 Quad chassis: zero manipulators (arms replaced with extra legs)
- [x] 6.3 Manipulator catalog: Basic Claw (free), Battle Claw (+ability), Vibro Claw (+bonus damage melee), Heavy Claw (+weight), Mine Clearance (+special), Cargo Lifter (+lift), Industrial Drill, Magnet
- [x] 6.4 Some weapons require a specific manipulator (heavy → Heavy Claw)

## 7. Weapon and Equipment Mounting

- [ ] 7.1 Mount heavy weapons (like SRM-2, Machine Gun) — require weight class threshold
- [x] 7.2 Body-mounted equipment is unrestricted; arm-mounted requires manipulator
- [x] 7.3 Leg-mounted restricted: only anti-personnel weapons permitted
- [x] 7.4 Per-location slot counts: Body 2, each Arm 2 (Biped), each Leg 1
- [x] 7.5 Validation: reject over-slot loadouts

## 8. Anti-Mech Equipment

- [x] 8.1 Magnetic Clamps: enables swarm attack (body mount, +15 kg)
- [x] 8.2 Mechanical Jump Boosters: +1 jump MP, +30 kg
- [x] 8.3 Partial Wing: gliding bonus, Light class only
- [ ] 8.4 Anti-Personnel weapon slot: flamer / pistol variants, light class only
- [x] 8.5 Detachable Weapon Pack: extra mass + weapon, lost on first leg attack

## 9. Construction Validation Rules

- [x] 9.1 `VAL-BA-CLASS` — trooper mass within weight class range
- [x] 9.2 `VAL-BA-ARMOR` — points ≤ class max
- [x] 9.3 `VAL-BA-MP` — MP ≤ class/move-type cap
- [x] 9.4 `VAL-BA-MANIPULATOR` — weapon/manipulator compatibility
- [x] 9.5 `VAL-BA-SQUAD` — squad size 1-6, warn outside 4/5
- [x] 9.6 `VAL-BA-MOVE-TYPE` — move-type legal for class

## 10. Store and UI Wiring

- [x] 10.1 Wire `battleArmorStore` to persist new state (`baArmorType` field + `setBaArmorType` action + persist partialize)
- [ ] 10.2 Hook calculators into `BattleArmorStructureTab`, `BattleArmorSquadTab`, `BattleArmorDiagram`
- [ ] 10.3 Diagram shows trooper silhouette with armor / arm mounts / leg mounts
- [ ] 10.4 Add new `BattleArmorEquipmentTab` (currently no dedicated tab — add one)

## 11. Validation

- [ ] 11.1 `openspec validate add-battlearmor-construction --strict`
- [x] 11.2 Fixtures: Elemental (Clan), Cavalier (IS Heavy), Sylph (Clan Light), Inner Sphere Standard (IS Medium) — covered by end-to-end jest tests
- [x] 11.3 Build + lint clean (`npx tsc --noEmit` passes; 54 jest tests pass)
