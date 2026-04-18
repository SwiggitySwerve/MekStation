# Tasks: Add ProtoMech Construction

## 1. Types and Interfaces

- [x] 1.1 Extend `IProtoMechUnit` with `chassisType`, `mainGunWeaponId?`, `glidingWings`, `myomerBooster`, `walkMP`, `jumpMP`
- [x] 1.2 Add `ProtoChassis` enum (Biped, Quad, Glider, Ultraheavy)
- [x] 1.3 Add `ProtoLocation` enum (Head, Torso, MainGun, LeftArm, RightArm, Legs, FrontLegs, RearLegs)
- [x] 1.4 Add `IProtoArmorByLocation` interface

## 2. Tonnage Rules

- [x] 2.1 Standard ProtoMech: 2–9 tons
- [x] 2.2 Ultraheavy ProtoMech: 10–15 tons (Ultraheavy chassis only)
- [x] 2.3 Weight class: Light 2-4, Medium 5-7, Heavy 8-9, Ultraheavy 10-15
- [x] 2.4 Validation: reject Ultraheavy chassis + tonnage < 10

## 3. Chassis Rules

- [x] 3.1 Biped: default; supports arm weapons
- [x] 3.2 Quad: no arms; all equipment on Torso or Legs
- [x] 3.3 Glider: Light only; adds Glider Wings (+2 jump MP); cannot have arms
- [x] 3.4 Ultraheavy: 10+ tons; no jump MP; increased armor

## 4. Movement Caps

- [x] 4.1 Light: walk MP 8, jump MP 8
- [x] 4.2 Medium: walk MP 6, jump MP 6
- [x] 4.3 Heavy: walk MP 4, jump MP 4
- [x] 4.4 Ultraheavy: walk MP 3, jump 0
- [x] 4.5 Run MP = walkMP + 1 (Myomer Booster adds +1 walk, +1 run)

## 5. Armor per Location

- [x] 5.1 Per-location armor max from tonnage table
- [x] 5.2 Total armor tonnage counted separately from equipment
- [x] 5.3 Armor type always Standard (ProtoMech ferro-fibrous variants not supported)

## 6. Main Gun System

- [x] 6.1 Optional MainGun location holds one heavy weapon (approved list: LRM-5/10, AC/2, AC/5, Gauss Rifle, PPC, Medium Pulse Laser, ER Medium Laser)
- [x] 6.2 When no main gun, the location is not present on the record
- [x] 6.3 Main gun ammo stored in Torso
- [x] 6.4 Weapons larger than Medium-class cannot go in arms — must be main gun

## 7. Engine

- [x] 7.1 Fusion only (Clan fusion)
- [x] 7.2 Engine rating = tonnage × walkMP
- [x] 7.3 Engine weight = engineRating × 0.025 (proto-specific factor)

## 8. Myomer Booster and Glider Wings

- [x] 8.1 Myomer Booster: Light / Medium only, adds +1 MP, costs 1 ton
- [x] 8.2 Glider Wings: Glider chassis only; already factored into MP
- [x] 8.3 Reject illegal combos

## 9. Construction Validation Rules

- [x] 9.1 `VAL-PROTO-TONNAGE` — in legal range
- [x] 9.2 `VAL-PROTO-CHASSIS` — chassis × tonnage × MP compatibility
- [x] 9.3 `VAL-PROTO-MP` — MP ≤ weight class cap
- [x] 9.4 `VAL-PROTO-MAIN-GUN` — main gun weapon in approved list
- [x] 9.5 `VAL-PROTO-TECH-BASE` — tech base = Clan (warning otherwise)

## 10. Store and UI Wiring

- [x] 10.1 Wire `protoMechStore` to persist new state (walkMP, chassisType, weightClass, mainGunWeaponId, glidingWings in partialize)
- [x] 10.2 Enhance `ProtoMechStructureTab` to expose all fields (chassis radio, walkMP, weight class display, main gun picker)
- [ ] 10.3 Status bar displays tonnage, class, MP, main gun (deferred — no status bar component exists yet)

## 11. Validation

- [x] 11.1 `npx tsc --noEmit` clean
- [x] 11.2 Fixtures: Minotaur (Heavy), Sprite (Light glider), Satyr (Light biped), Nuthatch (Light biped jump), Ares (Ultraheavy) — all pass via `protomech-construction.test.ts`
- [x] 11.3 Build + lint clean (tsc clean, 58 tests passing)
