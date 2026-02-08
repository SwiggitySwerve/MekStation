# Wave 1 Defensive BV Overcalculation Analysis

## Executive Summary

Analysis of the top 5 overcalculation units (averaging 16.2% error) reveals that **the "overcalculation" category is NOT caused by defensive BV calculation errors**. Instead, the overcalculation is entirely in the **OFFENSIVE BV calculation**.

All five units show:

1. Defensive BV calculations are either correct or slightly underestimated
2. The overcalculation is entirely in the **OFFENSIVE BV** calculation
3. Average offensive BV overcalculation: **205.7 BV per unit**

---

## Unit 1: Celerity CLR-03-OE

### Unit Specifications

- **Chassis**: Celerity CLR-03-OE (Quad)
- **Tonnage**: 15 tons
- **Tech Base**: MIXED (Clan/IS)
- **Era**: Dark Age (3138)

### Defensive Components

#### Armor

- **Type**: STANDARD (1.0x multiplier)
- **Total Armor Points**: 25 points
- **Armor BV**: 25 × 2.5 × 1.0 × (10/10) = **62.5 BV**

#### Structure

- **Type**: ENDO_STEEL (0.5x multiplier)
- **Structure Points**: 15 × 0.5 = 7.5 points
- **Engine Multiplier**: XXL = 0.25x
- **Structure BV**: 7.5 × 1.5 × 0.5 × 0.25 = **1.41 BV**

#### Engine

- **Type**: XXL (0.25x multiplier)
- **Rating**: 240
- **Engine BV**: 240 × 0.25 = **60 BV**

#### Gyro

- **Type**: STANDARD (1.0x multiplier)
- **Gyro BV**: 15 × 1.0 = **15 BV**

#### Defensive Equipment

- **Equipment**: None
- **Defensive Equipment BV**: **0 BV**

#### Movement

- **Walk MP**: 16, **Jump MP**: 0
- **TMM**: 0
- **Defensive Factor**: 1.0

### Expected Defensive BV

```
Armor BV:           62.5
Structure BV:       1.41
Engine BV:          60.0
Gyro BV:            15.0
Defensive Equip:    0.0
Subtotal:           138.91
Defensive Factor:   1.0
Expected Def BV:    138.91 BV
```

### Actual vs Expected

- **Calculated Total BV**: 1087
- **Expected Total BV**: 919
- **Difference**: +168 BV (+18.3%)
- **Calculated Defensive BV**: 104.8 BV
- **Expected Defensive BV**: 138.91 BV
- **Defensive BV Error**: -34.11 BV (UNDERESTIMATED)

### Offensive BV Analysis

- **Calculated Offensive BV**: 1087 - 104.8 = **982.2 BV**
- **Expected Offensive BV**: 919 - 138.91 = **780.09 BV**
- **Offensive BV Overcalculation**: **+202.11 BV**

---

## Unit 2: Crab CRB-27sl

### Unit Specifications

- **Chassis**: Crab CRB-27sl (Biped)
- **Tonnage**: 50 tons
- **Tech Base**: INNER_SPHERE
- **Era**: Star League (2719)

### Defensive Components

#### Armor

- **Type**: FERRO_FIBROUS (1.2x multiplier)
- **Total Armor Points**: 161 points
- **Armor BV**: 161 × 2.5 × 1.2 × (10/10) = **483 BV**

#### Structure

- **Type**: STANDARD (1.0x multiplier)
- **Structure Points**: 50 × 0.5 = 25 points
- **Engine Multiplier**: XL = 0.5x
- **Structure BV**: 25 × 1.5 × 1.0 × 0.5 = **18.75 BV**

#### Engine

- **Type**: XL (0.5x multiplier)
- **Rating**: 250
- **Engine BV**: 250 × 0.5 = **125 BV**

#### Gyro

- **Type**: STANDARD (1.0x multiplier)
- **Gyro BV**: 50 × 1.0 = **50 BV**

#### Defensive Equipment

- **Equipment**: None
- **Defensive Equipment BV**: **0 BV**

#### Movement

- **Walk MP**: 5, **Jump MP**: 5
- **TMM**: 1
- **Defensive Factor**: 1.1

### Expected Defensive BV

```
Armor BV:           483.0
Structure BV:       18.75
Engine BV:          125.0
Gyro BV:            50.0
Defensive Equip:    0.0
Subtotal:           676.75
Defensive Factor:   1.1
Expected Def BV:    744.43 BV
```

### Actual vs Expected

- **Calculated Total BV**: 1309
- **Expected Total BV**: 1121
- **Difference**: +188 BV (+16.8%)
- **Calculated Defensive BV**: 636.68 BV
- **Expected Defensive BV**: 744.43 BV
- **Defensive BV Error**: -107.75 BV (UNDERESTIMATED)

### Offensive BV Analysis

- **Calculated Offensive BV**: 1309 - 636.68 = **672.32 BV**
- **Expected Offensive BV**: 1121 - 744.43 = **376.57 BV**
- **Offensive BV Overcalculation**: **+295.75 BV**

---

## Unit 3: Wyvern WVE-5Nsl

### Unit Specifications

- **Chassis**: Wyvern WVE-5Nsl (Biped)
- **Tonnage**: 45 tons
- **Tech Base**: INNER_SPHERE
- **Era**: Star League (2750)

### Defensive Components

#### Armor

- **Type**: STANDARD (1.0x multiplier)
- **Total Armor Points**: 152 points
- **Armor BV**: 152 × 2.5 × 1.0 × (10/10) = **380 BV**

#### Structure

- **Type**: ENDO_STEEL (0.5x multiplier)
- **Structure Points**: 45 × 0.5 = 22.5 points
- **Engine Multiplier**: FUSION (Standard) = 1.0x
- **Structure BV**: 22.5 × 1.5 × 0.5 × 1.0 = **16.88 BV**

#### Engine

- **Type**: FUSION (Standard) (1.0x multiplier)
- **Rating**: 180
- **Engine BV**: 180 × 1.0 = **180 BV**

#### Gyro

- **Type**: STANDARD (1.0x multiplier)
- **Gyro BV**: 45 × 1.0 = **45 BV**

#### Defensive Equipment

- **Equipment**: None
- **Defensive Equipment BV**: **0 BV**

#### Movement

- **Walk MP**: 4, **Jump MP**: 4
- **TMM**: 0
- **Defensive Factor**: 1.0

### Expected Defensive BV

```
Armor BV:           380.0
Structure BV:       16.88
Engine BV:          180.0
Gyro BV:            45.0
Defensive Equip:    0.0
Subtotal:           621.88
Defensive Factor:   1.0
Expected Def BV:    621.88 BV
```

### Actual vs Expected

- **Calculated Total BV**: 1208
- **Expected Total BV**: 1039
- **Difference**: +169 BV (+16.3%)
- **Calculated Defensive BV**: 618.0 BV
- **Expected Defensive BV**: 621.88 BV
- **Defensive BV Error**: -3.88 BV (VERY CLOSE)

### Offensive BV Analysis

- **Calculated Offensive BV**: 1208 - 618 = **590 BV**
- **Expected Offensive BV**: 1039 - 621.88 = **417.12 BV**
- **Offensive BV Overcalculation**: **+172.88 BV**

---

## Unit 4: Phoenix Hawk PXH-1Kk

### Unit Specifications

- **Chassis**: Phoenix Hawk PXH-1Kk (Biped)
- **Tonnage**: 45 tons
- **Tech Base**: INNER_SPHERE
- **Era**: Star League (2725)

### Defensive Components

#### Armor

- **Type**: STANDARD (1.0x multiplier)
- **Total Armor Points**: 152 points
- **Armor BV**: 152 × 2.5 × 1.0 × (10/10) = **380 BV**

#### Structure

- **Type**: STANDARD (1.0x multiplier)
- **Structure Points**: 45 × 0.5 = 22.5 points
- **Engine Multiplier**: FUSION (Standard) = 1.0x
- **Structure BV**: 22.5 × 1.5 × 1.0 × 1.0 = **33.75 BV**

#### Engine

- **Type**: FUSION (Standard) (1.0x multiplier)
- **Rating**: 270
- **Engine BV**: 270 × 1.0 = **270 BV**

#### Gyro

- **Type**: STANDARD (1.0x multiplier)
- **Gyro BV**: 45 × 1.0 = **45 BV**

#### Defensive Equipment

- **Equipment**: None
- **Defensive Equipment BV**: **0 BV**

#### Movement

- **Walk MP**: 6, **Jump MP**: 0
- **TMM**: 0
- **Defensive Factor**: 1.0

### Expected Defensive BV

```
Armor BV:           380.0
Structure BV:       33.75
Engine BV:          270.0
Gyro BV:            45.0
Defensive Equip:    0.0
Subtotal:           728.75
Defensive Factor:   1.0
Expected Def BV:    728.75 BV
```

### Actual vs Expected

- **Calculated Total BV**: 1139
- **Expected Total BV**: 993
- **Difference**: +146 BV (+14.7%)
- **Calculated Defensive BV**: 669.5 BV
- **Expected Defensive BV**: 728.75 BV
- **Defensive BV Error**: -59.25 BV (UNDERESTIMATED)

### Offensive BV Analysis

- **Calculated Offensive BV**: 1139 - 669.5 = **469.5 BV**
- **Expected Offensive BV**: 993 - 728.75 = **264.25 BV**
- **Offensive BV Overcalculation**: **+205.25 BV**

---

## Unit 5: Koshi E

### Unit Specifications

- **Chassis**: Koshi E (Biped)
- **Tonnage**: 25 tons
- **Tech Base**: CLAN
- **Era**: Clan Invasion (3054)

### Defensive Components

#### Armor

- **Type**: FERRO_FIBROUS_CLAN (1.2x multiplier)
- **Total Armor Points**: 67 points
- **Armor BV**: 67 × 2.5 × 1.2 × (10/10) = **201 BV**

#### Structure

- **Type**: ENDO_STEEL_CLAN (0.5x multiplier)
- **Structure Points**: 25 × 0.5 = 12.5 points
- **Engine Multiplier**: CLAN_XL = 0.5x
- **Structure BV**: 12.5 × 1.5 × 0.5 × 0.5 = **4.69 BV**

#### Engine

- **Type**: CLAN_XL (0.5x multiplier)
- **Rating**: 175
- **Engine BV**: 175 × 0.5 = **87.5 BV**

#### Gyro

- **Type**: STANDARD (1.0x multiplier)
- **Gyro BV**: 25 × 1.0 = **25 BV**

#### Defensive Equipment

- **Equipment**: Clan Active Probe
- **Active Probe BV**: **12 BV**
- **Total Defensive Equipment BV**: **12 BV**

#### Movement

- **Walk MP**: 7, **Jump MP**: 6
- **TMM**: 1
- **Defensive Factor**: 1.1

### Expected Defensive BV

```
Armor BV:           201.0
Structure BV:       4.69
Engine BV:          87.5
Gyro B
```
