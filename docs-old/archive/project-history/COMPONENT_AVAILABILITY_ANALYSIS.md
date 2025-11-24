# Component Availability Analysis

## Overview
This document analyzes what components are available in the BattleTech customizer based on tech base and introduction year settings.

## Key Finding
The filtering system is working correctly! Components are filtered by their introduction year. Many advanced components were introduced after 3025, which is the default introduction year.

## Component Availability by Era

### Inner Sphere Components

#### Engines
- **2439+ (Introductory Era)**: Standard, ICE
- **3035+ (Succession Wars)**: XL
- **3062+ (Clan Invasion)**: Light
- **3068+ (Jihad Era)**: Compact, Fuel Cell

#### Structure Types
- **2439+ (Introductory Era)**: Standard, Industrial
- **3035+ (Succession Wars)**: Endo Steel
- **3057+ (Clan Invasion)**: Reinforced
- **3067+ (Jihad Era)**: XL, Heavy-Duty
- **3068+ (Jihad Era)**: Compact
- **3080+ (Dark Age)**: Composite

#### Gyroscopes
- **2439+ (Introductory Era)**: Standard
- **3067+ (Jihad Era)**: XL, Heavy-Duty
- **3068+ (Jihad Era)**: Compact

#### Armor Types
- **2439+ (Introductory Era)**: Standard
- **3040+ (Succession Wars)**: Ferro-Fibrous
- **3047+ (Clan Invasion)**: Hardened
- **3059+ (Clan Invasion)**: Laser Heat Sinks
- **3063+ (Jihad Era)**: Stealth
- **3065+ (Jihad Era)**: Reactive
- **3067+ (Jihad Era)**: Light Ferro-Fibrous, Reflective
- **3069+ (Jihad Era)**: Heavy Ferro-Fibrous

#### Heat Sinks
- **2439+ (Introductory Era)**: Single
- **3035+ (Succession Wars)**: Double
- **3068+ (Jihad Era)**: Compact
- **3059+ (Clan Invasion)**: Laser

### Clan Components

#### Engines
- **2439+ (Introductory Era)**: Standard
- **2824+ (Golden Century)**: XL (Clan)
- **3100+ (Dark Age)**: Light (Clan)

#### Structure Types
- **2439+ (Introductory Era)**: Standard
- **2945+ (Golden Century)**: Endo Steel (Clan)

#### Gyroscopes
- **2439+ (Introductory Era)**: Standard

#### Armor Types
- **2439+ (Introductory Era)**: Standard
- **2824+ (Golden Century)**: Ferro-Fibrous (Clan)
- **3100+ (Dark Age)**: Stealth (Clan)

#### Heat Sinks
- **2824+ (Golden Century)**: Double (Clan)

## Recommendations

### For Users
1. **Set Introduction Year to 3068+** to see all available components
2. **Use 3035+** for Succession Wars era components (XL engines, Ferro-Fibrous armor, Double heat sinks)
3. **Use 3062+** for Clan Invasion era components (Light engines, advanced armor types)
4. **Use 3068+** for Jihad era components (Compact engines, advanced gyros)

### For Developers
1. **Consider changing default introduction year** from 3025 to 3068 to show all components by default
2. **Add era-based presets** (Succession Wars, Clan Invasion, Jihad, Dark Age)
3. **Add visual indicators** showing which era each component belongs to
4. **Consider rules level filtering** in addition to introduction year

## Current Filtering Logic
The filtering system correctly:
- Filters by tech base (Inner Sphere vs Clan)
- Filters by introduction year (only shows components available by that year)
- Returns ComponentConfiguration objects with proper type and tech base

## Missing Components
All expected components are present in the database. The "missing" components are simply not available in the selected era (introduction year 3025).

## Test Results
Running the component filtering analysis shows:
- **Inner Sphere (3025)**: Standard, ICE engines; Standard, Industrial structure; Standard gyro; Standard armor; Single heat sinks
- **Clan (3025)**: Standard, XL (Clan) engines; Standard, Endo Steel (Clan) structure; Standard gyro; Standard, Ferro-Fibrous (Clan) armor; Double (Clan) heat sinks

This is exactly what should be available in 3025! 