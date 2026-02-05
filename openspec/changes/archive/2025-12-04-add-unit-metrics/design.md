# Design: Unit Metrics Calculation

## Context

Users need Battle Value (BV) and C-Bill cost for army building and campaign play. The BattleTech TechManual defines official formulas for both calculations.

## Goals / Non-Goals

**Goals:**

- Calculate accurate BV and cost matching official TechManual rules
- Pre-calculate values in index for fast browsing (no runtime calculation)
- Support all standard equipment and configurations

**Non-Goals:**

- Pilot skill modifiers (BV adjusts for Gunnery/Piloting but we show base BV)
- Quirk modifiers
- Clan vs IS equipment cost differences beyond base multipliers

## C-Bill Cost Formulas

### Engine Cost

```
cost = (rating^2) × 5000 × type_multiplier

Type Multipliers:
- Standard Fusion: 1.0
- XL Fusion: 2.0
- Light Fusion: 1.5
- XXL Fusion: 3.0
- Compact Fusion: 1.5
- ICE: 0.3
- Fuel Cell: 0.35
- Fission: 0.75
```

### Gyro Cost

```
cost = ceil(engineRating / 100) × 300000 × type_multiplier

Type Multipliers:
- Standard: 1.0
- Heavy-Duty: 2.0
- Compact: 1.5
- XL: 0.5
```

### Structure Cost

```
cost = tonnage × cost_per_ton

Cost Per Ton:
- Standard: 400
- Endo Steel: 1600
- Endo-Composite: 1600
- Reinforced: 6400
- Composite: 1600
- Industrial: 300
```

### Armor Cost

```
cost = total_armor_points × cost_per_point

Cost Per Point:
- Standard: 10000 / 16 = 625
- Ferro-Fibrous: 20000 / 16 = 1250
- Light Ferro-Fibrous: 15000 / 16 = 937.5
- Heavy Ferro-Fibrous: 25000 / 16 = 1562.5
- Stealth: 50000 / 16 = 3125
- Hardened: 15000 / 8 = 1875
- Reactive: 30000 / 16 = 1875
```

### Cockpit Cost

```
Standard: 200000
Small: 175000
Command Console: 500000
Torso-Mounted: 750000
```

### Heat Sink Cost

```
Single: 2000 each
Double: 6000 each
```

### Total Cost Formula

```
Total = Engine + Gyro + Structure + Armor + Cockpit + HeatSinks + Equipment + (Tonnage × 10000)
```

## Battle Value 2.0 Formulas

### Defensive BV

```
Defensive_BV = (armor_factor + structure_factor) × defensive_modifier

armor_factor = total_armor_points × 2.5
structure_factor = total_internal_structure × 1.5
defensive_modifier = base modifier adjusted for:
  - Total heat sinks
  - Defensive equipment (AMS, ECM, etc.)
```

### Offensive BV

```
Offensive_BV = sum(weapon_BV × heat_modifier) + ammo_BV

heat_modifier = adjusted based on heat efficiency:
  - If weapon heat > dissipation: penalty applied
  - Targeting Computer: +1.25 modifier for direct-fire weapons
```

### Speed Factor

```
Target Movement Modifier → Speed Factor lookup:

TMM 0 (Walk 1-2): 1.0
TMM 1 (Walk 3-4): 1.1
TMM 2 (Walk 5-6): 1.2
TMM 3 (Walk 7-9): 1.3
TMM 4 (Walk 10-12): 1.4
TMM 5 (Walk 13-17): 1.5
TMM 6 (Walk 18-24): 1.6
TMM 7+ (Walk 25+): 1.7+

Jump capability adds to speed factor:
+0.1 per jump MP above walk MP
Max speed factor: 2.24
```

### Total BV

```
Total_BV = (Defensive_BV + Offensive_BV) × Speed_Factor
```

## Decisions

1. **Pre-calculate in index**: Calculate during index generation, not at runtime
   - Faster browsing, no calculation overhead
   - Trade-off: Must regenerate index if formulas change

2. **Store both BV and cost in index**: Enables sorting without loading full unit data

3. **Use integer values**: Round final BV and cost to integers for display

## Risks / Trade-offs

- **Risk**: Formula inaccuracies vs official rules
  - **Mitigation**: Validate against known canonical unit values (Atlas AS7-D BV: 1,897)

- **Risk**: Missing equipment BV values
  - **Mitigation**: Default to 0 BV with warning, log missing items

## Open Questions

- Should we support pilot skill-adjusted BV display? (Defer to future change)
- Should cost include ammo? (Yes, per TechManual)
