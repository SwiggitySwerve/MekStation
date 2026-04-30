# Tasks: Add Infantry Construction

## 1. Types and Interfaces

- [ ] 1.1 Extend `IInfantryUnit` with `motiveType`, `platoonComposition`, `armorKit`, `primaryWeapon`, `secondaryWeapon?`, `fieldGun?`, `antiMechTraining`
- [x] 1.2 Add `InfantryMotive` enum (Foot, Jump, Motorized, MechanizedTracked, MechanizedWheeled, MechanizedHover, MechanizedVTOL)
- [x] 1.3 Add `ArmorKit` enum (Standard, Flak, Camo, SnowCamo, EnvironmentalSealing, SneakCamo, SneakIR, SneakECM)
- [x] 1.4 Add `IPlatoonComposition` interface (squads, troopersPerSquad)
- [ ] 1.5 Add `IFieldGun` interface (weaponId, ammoRounds, crewCount)

## 2. Platoon Composition

- [x] 2.1 Default Foot: 7 squads × 4 troopers (28)
- [x] 2.2 Default Jump: 5 squads × 5 troopers (25)
- [ ] 2.3 Default Motorized: 7 squads × 4 troopers (28)
- [x] 2.4 Default Mechanized: 4 squads × 5 troopers (20)
- [ ] 2.5 Support 1–30 troopers with warning outside defaults
- [x] 2.6 Validation: min 5 troopers, max 30

## 3. Motive Type

- [x] 3.1 Foot: MP 1 ground
- [x] 3.2 Jump: MP 3 ground + 3 jump (MP 3/3)
- [ ] 3.3 Motorized: MP 3 ground (in trucks/APC shared with platoon)
- [ ] 3.4 Mechanized Tracked: MP 3, adds armor
- [ ] 3.5 Mechanized Wheeled: MP 4
- [x] 3.6 Mechanized Hover: MP 5
- [ ] 3.7 Mechanized VTOL: MP 6 vertical
- [x] 3.8 Validation: motive × platoon size compatibility (e.g., VTOL max 10 troopers per TW)

## 4. Armor Kit

- [ ] 4.1 Per-trooper armor modifier from kit (Flak = +1 vs ballistic, Camo = -1 to be hit in woods, etc.)
- [ ] 4.2 Environmental Sealing enables vacuum / underwater operations
- [ ] 4.3 Armor kit mass counted per trooper (tracked for transport weight)
- [x] 4.4 Sneak suits require Foot motive

## 5. Weapon Table

- [ ] 5.1 Load infantry weapon table (Laser Rifle, Auto Rifle, SRM Launcher, LRM Launcher, MG, Flamer, etc.)
- [ ] 5.2 Each entry: range (S/M/L), damage divisor (per TW), ammo type, heat, special
- [x] 5.3 Primary weapon: all troopers carry
- [x] 5.4 Secondary weapon: 1 per N troopers (N = 2/3/4 from table)
- [x] 5.5 Validation: weapon compatible with motive (heavy weapons not Foot)

## 6. Field Guns

- [ ] 6.1 Optional field gun: mech-scale weapon from approved list (AC/2, AC/5, LRM-5 through LRM-20, MG, Flamer, etc.)
- [ ] 6.2 Crew size: derived from weapon type (AC/20 needs 5 crew, LRM-5 needs 2)
- [x] 6.3 When crewing the gun, that many troopers do NOT fire personal weapons
- [ ] 6.4 Ammo count stored separately
- [ ] 6.5 Field gun tonnage does not count against mech construction — it's a deployed weapon

## 7. Anti-Mech Training

- [x] 7.1 Boolean flag: `antiMechTraining = true/false`
- [ ] 7.2 Enables leg / swarm attacks in combat (similar to BA but simpler)
- [ ] 7.3 Adds to training cost (BV multiplier at BV calc step)
- [x] 7.4 Validation: only Foot / Jump / Mechanized may learn anti-mech

## 8. Construction Validation Rules

- [x] 8.1 `VAL-INF-PLATOON` — platoon size within 5-30 range
- [x] 8.2 `VAL-INF-MOTIVE` — motive compatible with platoon size
- [x] 8.3 `VAL-INF-ARMOR-KIT` — kit compatible with motive (sneak → Foot)
- [x] 8.4 `VAL-INF-WEAPON` — weapon legal for motive
- [x] 8.5 `VAL-INF-FIELD-GUN` — field gun crew ≤ platoon size − 1
- [x] 8.6 `VAL-INF-ANTI-MECH` — training legal for motive

## 9. Store and UI Wiring

- [ ] 9.1 Wire `infantryStore` to persist new state
- [ ] 9.2 Enhance `InfantryBuildTab` to expose all fields
- [ ] 9.3 Status bar displays platoon strength, effective MP, kit modifiers
- [ ] 9.4 Field gun section adds/edits field gun

## 10. Validation

- [x] 10.1 `openspec validate add-infantry-construction --strict`
- [ ] 10.2 Fixtures: Foot Rifle Platoon, Jump SRM Platoon, Mechanized MG Platoon, Field Gun (AC/5) Platoon
- [ ] 10.3 Build + lint clean
