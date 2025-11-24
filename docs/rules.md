---
title: BattleTech Construction & Validation Rules
description: Single source of truth for the mech customizer’s BattleTech calculations.
---

## 1. Construction Fundamentals

- **Structure Points:** Use `StructureMechanics.getPoints(tonnage)` (`src/mechanics/Structure.ts`), which wraps the canonical BattleTech table (Head=3, CT up to 32, etc.). All structure types share these values; only weight changes.
- **Structure Weight:** Standard = 10% tonnage, Endo Steel/Composite = 5%, Reinforced = 20%. `WeightOps.calculateStructureWeight` wraps the canonical multipliers.
- **Armor Maximums:** 2× structure points per location, except Head (9). `getMaxArmorPoints` and `getMaxArmorPointsForLocation` enforce this.
- **Armor Efficiency:** Points per ton depend on armor type (`ARMOR_POINTS_PER_TON`). Standard 16, IS Ferro 17.92, Light Ferro 16.8, Heavy Ferro 19.2, Hardened 8.
- **Critical Slots:** 78 total. Distribution: Head 6, CT 12, LT/RT 12 each, Arms 12 each, Legs 6 each. Advanced components (Endo, Ferro, XL engines, etc.) consume additional slots.
- **Engines:** Walking MP × tonnage = rating (max 400 Standard rules). Weight derived from table + multipliers (XL, Light, Compact, XXL). Built-in heat sinks = rating / 25 (floor).
- **Heat Sinks:** Total heat sinks must be max(10, heat-generating weapons). Single: 1 slot, 1 dissipation. IS Double: 3 slots, 2 dissipation. Clan Double: 2 slots, 2 dissipation. Compact: 1 slot, 1 ton, 1 dissipation. Laser: 1 slot, 1.5 tons, 1 dissipation.
- **Movement:** Running MP = floor(1.5 × Walking MP). Jump jets weigh 0.5/1/2 tons per MP depending on tonnage tiers (≤55, 60–85, ≥90).
- **Weight Compliance:** Sum of structure, armor, engine, gyro, cockpit, heat sinks, equipment must equal mech tonnage. Overweight states invalidate designs.

## 2. Validation Checklist

1. **Weight:** `MechValidator.validate` ensures total ≤ tonnage. Underweight flagged as warning.
2. **Engine:** Rating ≤ 400 (Standard rules). Light engines banned on Clan chassis; XXL requires Experimental rules. Walking MP ≥ 1.
3. **Gyro:** XL gyros disallowed at Introductory level; Compact requires appropriate tech/rules.
4. **Cockpit:** Torso-mounted requires Experimental. Small cockpit restrictions apply per era.
5. **Structure:** Clan Endo Steel cannot be used on IS chassis. Industrial structure doubles weight, etc.
6. **Armor Type:** Clan Ferro-Fibrous only for Clan tech base. Armor allocation cannot exceed per-location caps.
7. **Critical Slots:** All required slots must fit in location after dynamic allocations (engine, gyro, cockpit).
8. **Heat Management:** Total sinks ≥ max(10, heat weapons). Engine internal sinks counted automatically.
9. **Tech/Era:** Mixed tech requires Advanced/Experimental. Equipment availability must match era and tech base.

## 3. Critical Slot Reference

| Component                     | Slots                          |
|------------------------------|--------------------------------|
| Standard Engine              | 6 CT                           |
| XL Engine (IS)               | 6 CT + 3 per side torso        |
| XL Engine (Clan)             | 6 CT + 2 per side torso        |
| Light Engine                 | 6 CT + 2 per side torso        |
| XXL Engine (IS)              | 6 CT + 6 per side torso        |
| XXL Engine (Clan)            | 6 CT + 4 per side torso        |
| Standard Gyro                | 4 CT                           |
| XL Gyro                      | 6 CT                           |
| Compact Gyro                 | 2 CT                           |
| Standard Cockpit             | 5 Head slots                   |
| Small Cockpit                | 4 Head slots                   |
| Torso-Mounted Cockpit        | 0 Head, uses torso slots       |
| Endo Steel (IS)              | 14 slots (distributed)         |
| Endo Steel (Clan)            | 7 slots                        |
| Light Ferro Armor            | 7 slots                        |
| Heavy Ferro Armor            | 21 slots                       |
| Ferro-Fibrous (IS)           | 14 slots                       |
| Ferro-Fibrous (Clan)         | 7 slots                        |
| Double HS (IS)               | 3 slots each                   |
| Double HS (Clan)             | 2 slots each                   |

## 4. Advanced Systems

- **Structure Variants:** Endo Steel (0.5× weight, slot cost), Composite (0.5× weight, 4 slots, fragile), Reinforced (2× weight, no slot cost).
- **Armor Variants:** Stealth (Standard efficiency, requires ECM, slot cost), Reactive (14 pts/ton, missile resistance), Reflective (16 pts/ton, energy resistance), Hardened (8 pts/ton, double protection).
- **Engines:** Compact (1.5× weight, fewer slots), Fuel Cell/ICE follow standard 6-slot CT footprint.

## 5. File Mapping

| Topic                                  | Source (docs-old)                                 | Authoritative Code (new project)                         |
|----------------------------------------|---------------------------------------------------|----------------------------------------------------------|
| Structure Points & Armor Caps          | `battletech/agents/01-construction-rules.md`      | `src/mechanics/Structure.ts`, `WeightOps.getMaxArmorPoints` |
| Armor Efficiency & Slots               | `battletech/agents/04-equipment-rules.md`         | `src/mechanics/WeightOps.ts`                              |
| Critical Slot Mechanics                | `battletech/agents/03-critical-slots.md`          | `src/mechanics/CriticalSlots.ts`                         |
| Engine & Heat Sink Rules               | `battletech/agents/08-advanced-systems.md`        | `src/mechanics/WeightOps.ts`, `EngineMechanics`, `Heat`  |
| Validation Flows                       | `battletech/agents/02-validation-rules.md`        | `src/mechanics/Validation.ts`                            |
| Calculations (weight, movement, heat)  | `battletech/agents/06-calculations.md`            | `src/mechanics/*`                                        |

## 6. Notes

- Always reference the **new TypeScript modules** (`src/mechanics`, `WeightOps`, `MechValidator`, etc.) when documenting behavior. Legacy `services/validation/*` is archived for reference only.
- This doc supersedes `docs-old/battletech/agents/*.md`, `rules_implementation_map.md`, `battletech_construction_guide.md`, and `battletech_validation_rules.md`. See `docs/changelog.md` for a full list.

