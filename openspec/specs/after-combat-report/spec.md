# after-combat-report Specification

## Purpose

Defines the ACAR (Automated Combat Analysis and Resolution) system for resolving combat scenarios and processing battle results. ACAR calculates victory probability based on Battle Value, distributes damage and casualties based on outcome severity, and provides a framework for applying results to campaign state.

## Scope

**In Scope:**

- Victory probability calculation using Battle Value ratios
- Damage distribution formulas with randomization
- Personnel casualty determination with status distribution
- Scenario resolution with outcome-based severity/intensity
- Battle result processing stub with intended behavior
- Injectable random number generation for deterministic testing

**Out of Scope:**

- Campaign state persistence and UI integration
- Salvage generation algorithms (placeholder only)
- Specific unit/personnel data models (uses generic IDs)
- Repair mechanics and resource management
- Mission/scenario definition and configuration

## Key Concepts

### ACAR (Automated Combat Analysis and Resolution)

A deterministic combat resolution system that:

1. Calculates victory probability from Battle Value (BV) ratios
2. Rolls for outcome (victory/defeat/draw)
3. Distributes damage to units based on severity
4. Determines personnel casualties based on battle intensity
5. Returns structured results for campaign integration

### Battle Value (BV)

A numeric measure of unit combat effectiveness used to calculate victory probability. Higher BV indicates stronger forces.

### Severity and Intensity

- **Severity**: Damage multiplier (0-1) determining unit damage percentage
- **Intensity**: Casualty multiplier (0-1) determining personnel casualty rate

Outcomes have different severity/intensity values:

- **Victory**: Low damage (0.3 severity), low casualties (0.4 intensity)
- **Defeat**: High damage (0.8 severity), high casualties (0.9 intensity)
- **Draw**: Moderate damage (0.5 severity), moderate casualties (0.6 intensity)

### Personnel Status Distribution

Casualties are distributed across three status types:

- **WOUNDED**: 60% of casualties (0.0-0.6 roll)
- **MIA** (Missing in Action): 30% of casualties (0.6-0.9 roll)
- **KIA** (Killed in Action): 10% of casualties (0.9-1.0 roll)

### Deterministic Testing

All ACAR functions accept an optional `random` parameter (defaults to `Math.random`) to enable deterministic testing with seeded random number generators.

---

## Requirements

### Requirement: Victory Probability Calculation

The system SHALL calculate victory probability based on Battle Value ratios.

#### Scenario: Equal Battle Values

- **GIVEN** player BV is 3000 and opponent BV is 3000
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 0.5 (50% chance)

#### Scenario: Player Advantage

- **GIVEN** player BV is 4000 and opponent BV is 2000
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 0.667 (2/3 chance)

#### Scenario: Opponent Advantage

- **GIVEN** player BV is 2000 and opponent BV is 6000
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 0.25 (1/4 chance)

#### Scenario: Both BVs Zero (Edge Case)

- **GIVEN** player BV is 0 and opponent BV is 0
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 0.5 (default to even odds)

#### Scenario: Player BV Zero

- **GIVEN** player BV is 0 and opponent BV is 5000
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 0 (no chance of victory)

#### Scenario: Opponent BV Zero

- **GIVEN** player BV is 5000 and opponent BV is 0
- **WHEN** calculating victory probability
- **THEN** the result SHALL be 1.0 (guaranteed victory)

---

### Requirement: Damage Distribution

The system SHALL distribute damage to units based on severity and randomization.

#### Scenario: Single Unit Damage

- **GIVEN** a unit with severity 0.5 and random value 0.5
- **WHEN** distributing damage
- **THEN** the unit SHALL receive 37.5% damage (0.5 × (0.5 + 0.5 × 0.5) × 100)

#### Scenario: Multiple Units with Varying Damage

- **GIVEN** three units with severity 0.6 and random values [0.0, 0.5, 1.0]
- **WHEN** distributing damage
- **THEN** unit 1 SHALL receive 30% damage (minimum)
- **AND** unit 2 SHALL receive 45% damage (mid-range)
- **AND** unit 3 SHALL receive 60% damage (maximum)

#### Scenario: Damage Capped at 100%

- **GIVEN** a unit with severity 1.0 and random value 1.0
- **WHEN** distributing damage
- **THEN** the unit SHALL receive 100% damage (capped)

#### Scenario: Zero Severity

- **GIVEN** a unit with severity 0 and any random value
- **WHEN** distributing damage
- **THEN** the unit SHALL receive 0% damage

#### Scenario: Empty Unit List

- **GIVEN** an empty array of unit IDs
- **WHEN** distributing damage
- **THEN** the result SHALL be an empty Map

---

### Requirement: Personnel Casualty Determination

The system SHALL determine personnel casualties based on battle intensity.

#### Scenario: Casualty Rate Calculation

- **GIVEN** battle intensity is 0.5
- **WHEN** determining casualties
- **THEN** the casualty rate SHALL be 5% (0.5 × 0.1)

#### Scenario: WOUNDED Status Assignment

- **GIVEN** a casualty with status roll 0.3
- **WHEN** determining status
- **THEN** the status SHALL be WOUNDED (roll < 0.6)

#### Scenario: MIA Status Assignment

- **GIVEN** a casualty with status roll 0.75
- **WHEN** determining status
- **THEN** the status SHALL be MIA (0.6 ≤ roll < 0.9)

#### Scenario: KIA Status Assignment

- **GIVEN** a casualty with status roll 0.95
- **WHEN** determining status
- **THEN** the status SHALL be KIA (roll ≥ 0.9)

#### Scenario: Multiple Personnel with Mixed Outcomes

- **GIVEN** four personnel with battle intensity 1.0 (10% casualty rate)
- **AND** casualty rolls [0.08, 0.15, 0.09, 0.02] and status rolls [0.5, N/A, 0.85, 0.92]
- **WHEN** determining casualties
- **THEN** pilot 1 SHALL be WOUNDED (0.08 < 0.1, status 0.5)
- **AND** pilot 2 SHALL NOT be a casualty (0.15 > 0.1)
- **AND** pilot 3 SHALL be MIA (0.09 < 0.1, status 0.85)
- **AND** pilot 4 SHALL be KIA (0.02 < 0.1, status 0.92)

#### Scenario: Zero Intensity

- **GIVEN** battle intensity is 0
- **WHEN** determining casualties
- **THEN** the result SHALL be an empty Map (no casualties)

#### Scenario: Empty Personnel List

- **GIVEN** an empty array of personnel IDs
- **WHEN** determining casualties
- **THEN** the result SHALL be an empty Map

---

### Requirement: Scenario Resolution

The system SHALL resolve combat scenarios with outcome-based damage and casualties.

#### Scenario: Victory Outcome

- **GIVEN** player BV 3000, opponent BV 3000, and outcome roll 0.3 (< 0.5 probability)
- **WHEN** resolving the scenario
- **THEN** the outcome SHALL be "victory"
- **AND** severity SHALL be 0.3
- **AND** intensity SHALL be 0.4

#### Scenario: Defeat Outcome

- **GIVEN** player BV 3000, opponent BV 3000, and outcome roll 0.8 (> 0.5 threshold)
- **WHEN** resolving the scenario
- **THEN** the outcome SHALL be "defeat"
- **AND** severity SHALL be 0.8
- **AND** intensity SHALL be 0.9

#### Scenario: Draw Outcome

- **GIVEN** player BV 3000, opponent BV 3000, and outcome roll 0.5 (middle range)
- **WHEN** resolving the scenario
- **THEN** the outcome SHALL be "draw"
- **AND** severity SHALL be 0.5
- **AND** intensity SHALL be 0.6

#### Scenario: Complete Resolution with Units and Personnel

- **GIVEN** player BV 3000, opponent BV 2500, units ['unit1', 'unit2'], personnel ['pilot1', 'pilot2']
- **WHEN** resolving the scenario
- **THEN** the result SHALL contain outcome, unitDamage Map, personnelCasualties Map, and salvage array
- **AND** unitDamage SHALL have entries for all units
- **AND** personnelCasualties SHALL have entries for casualties only (non-casualties excluded)
- **AND** salvage SHALL be an empty array (placeholder)

#### Scenario: Empty Units and Personnel

- **GIVEN** player BV 3000, opponent BV 3000, empty unit and personnel arrays
- **WHEN** resolving the scenario
- **THEN** unitDamage SHALL be an empty Map
- **AND** personnelCasualties SHALL be an empty Map

---

### Requirement: Battle Result Processing

The system SHALL provide a framework for applying ACAR results to campaign state.

#### Scenario: Process Scenario Result (Current Stub Behavior)

- **GIVEN** a campaign, scenario, and ACAR result
- **WHEN** processing the scenario result
- **THEN** the function SHALL return the campaign unchanged (stub implementation)

#### Scenario: Process Scenario Result (Intended Behavior)

- **GIVEN** a campaign, scenario, and ACAR result with unit damage, personnel casualties, outcome, and salvage
- **WHEN** processing the scenario result (future implementation)
- **THEN** unit damage SHALL be recorded (percentage damage to each unit)
- **AND** personnel casualties SHALL be applied (WOUNDED, MIA, KIA status updates)
- **AND** scenario status SHALL be updated based on outcome
- **AND** salvage items SHALL be added to campaign finances
- **AND** the function SHALL return a new ICampaign instance (immutable update pattern)

---

## Data Model Requirements

### ISalvageItem Interface

```typescript
interface ISalvageItem {
  /** Unique identifier for the salvage item */
  id: string;
  /** Display name of the salvage item */
  name: string;
  /** Monetary value of the item */
  value: number;
}
```

**Validation Rules:**

- `id` MUST be a non-empty string
- `name` MUST be a non-empty string
- `value` MUST be a non-negative number

---

### ResolveScenarioResult Interface

```typescript
interface ResolveScenarioResult {
  /** Outcome of the scenario (e.g., 'victory', 'defeat', 'draw') */
  outcome: string;
  /** Map of unit IDs to damage amounts sustained (0-100 percentage) */
  unitDamage: Map<string, number>;
  /** Map of unit IDs to personnel casualty counts (1 = casualty) */
  personnelCasualties: Map<string, number>;
  /** Array of salvageable items recovered from the scenario */
  salvage: ISalvageItem[];
}
```

**Validation Rules:**

- `outcome` MUST be one of: "victory", "defeat", "draw"
- `unitDamage` values MUST be in range [0, 100]
- `personnelCasualties` values MUST be 1 (casualty indicator)
- `salvage` MUST be an array (may be empty)

---

### PersonnelStatus Enum

```typescript
enum PersonnelStatus {
  ACTIVE = 'ACTIVE',
  WOUNDED = 'WOUNDED',
  MIA = 'MIA',
  KIA = 'KIA',
}
```

**Usage:**

- Imported from `@/types/campaign/enums`
- Used in `determineCasualties` to assign casualty status
- Distribution: 60% WOUNDED, 30% MIA, 10% KIA

---

## Calculation Formulas

### Victory Probability Formula

```
probability = playerBV / (playerBV + opponentBV)
```

**Edge Case:**

```
if (playerBV === 0 && opponentBV === 0) {
  probability = 0.5
}
```

**Examples:**

| Player BV | Opponent BV | Probability |
| --------- | ----------- | ----------- |
| 3000      | 3000        | 0.5         |
| 4000      | 2000        | 0.667       |
| 6000      | 2000        | 0.75        |
| 0         | 5000        | 0.0         |
| 5000      | 0           | 1.0         |
| 0         | 0           | 0.5         |

---

### Damage Distribution Formula

```
damage = min(severity × (0.5 + random() × 0.5) × 100, 100)
```

**Components:**

- `severity`: Damage multiplier (0-1) based on outcome
- `random()`: Random value [0, 1) for variation
- `(0.5 + random() × 0.5)`: Ensures damage is 50-100% of severity
- `× 100`: Converts to percentage
- `min(..., 100)`: Caps damage at 100%

**Examples:**

| Severity | Random | Calculation                       | Damage |
| -------- | ------ | --------------------------------- | ------ |
| 0.3      | 0.5    | 0.3 × (0.5 + 0.5 × 0.5) × 100     | 22.5%  |
| 0.5      | 0.5    | 0.5 × (0.5 + 0.5 × 0.5) × 100     | 37.5%  |
| 0.8      | 0.5    | 0.8 × (0.5 + 0.5 × 0.5) × 100     | 60%    |
| 1.0      | 1.0    | min(1.0 × (0.5 + 1.0 × 0.5) × 100 | 100%   |
| 0.0      | 1.0    | 0.0 × (0.5 + 1.0 × 0.5) × 100     | 0%     |

---

### Casualty Rate Formula

```
casualtyRate = battleIntensity × 0.1
```

**Examples:**

| Battle Intensity | Casualty Rate |
| ---------------- | ------------- |
| 0.4              | 4%            |
| 0.6              | 6%            |
| 0.9              | 9%            |
| 1.0              | 10%           |
| 0.0              | 0%            |

---

### Casualty Status Distribution

```
statusRoll = random()

if (statusRoll < 0.6) {
  status = PersonnelStatus.WOUNDED  // 60%
} else if (statusRoll < 0.9) {
  status = PersonnelStatus.MIA      // 30%
} else {
  status = PersonnelStatus.KIA      // 10%
}
```

**Distribution:**

| Status  | Roll Range | Probability |
| ------- | ---------- | ----------- |
| WOUNDED | [0.0, 0.6) | 60%         |
| MIA     | [0.6, 0.9) | 30%         |
| KIA     | [0.9, 1.0] | 10%         |

---

### Outcome Determination Logic

```
probability = calculateVictoryProbability(playerBV, opponentBV)
roll = random()

if (roll < probability) {
  outcome = 'victory'
  severity = 0.3
  intensity = 0.4
} else if (roll > 1 - probability) {
  outcome = 'defeat'
  severity = 0.8
  intensity = 0.9
} else {
  outcome = 'draw'
  severity = 0.5
  intensity = 0.6
}
```

**Outcome Ranges:**

| Outcome | Roll Range                  | Severity | Intensity |
| ------- | --------------------------- | -------- | --------- |
| Victory | [0, probability)            | 0.3      | 0.4       |
| Draw    | [probability, 1-probability | 0.5      | 0.6       |
| Defeat  | (1-probability, 1.0]        | 0.8      | 0.9       |

**Example (Equal BVs, probability = 0.5):**

| Roll | Outcome |
| ---- | ------- |
| 0.3  | Victory |
| 0.5  | Draw    |
| 0.8  | Defeat  |

---

## Validation Rules

### calculateVictoryProbability

- **Input Validation:**
  - `playerBV` MUST be a finite number ≥ 0
  - `opponentBV` MUST be a finite number ≥ 0
- **Output Validation:**
  - Result MUST be in range [0, 1]
- **Edge Cases:**
  - Both BVs = 0 → return 0.5
  - Player BV = 0 → return 0
  - Opponent BV = 0 → return 1.0

---

### distributeDamage

- **Input Validation:**
  - `unitIds` MUST be an array (may be empty)
  - `severity` MUST be a number in range [0, 1]
  - `random` MUST be a function returning [0, 1)
- **Output Validation:**
  - All damage values MUST be in range [0, 100]
  - Map size MUST equal unitIds.length
  - All unitIds MUST be present as keys
- **Edge Cases:**
  - Empty unitIds → return empty Map
  - Severity = 0 → all damage = 0
  - Severity = 1, random = 1 → damage capped at 100

---

### determineCasualties

- **Input Validation:**
  - `personnelIds` MUST be an array (may be empty)
  - `battleIntensity` MUST be a number in range [0, 1]
  - `random` MUST be a function returning [0, 1)
- **Output Validation:**
  - All status values MUST be valid PersonnelStatus enum values
  - Map MUST only contain casualties (non-casualties excluded)
  - All personnelIds in Map MUST be from input array
- **Edge Cases:**
  - Empty personnelIds → return empty Map
  - Battle intensity = 0 → return empty Map (no casualties)
  - All personnel survive → return empty Map

---

### resolveScenario

- **Input Validation:**
  - `playerBV` MUST be a finite number ≥ 0
  - `opponentBV` MUST be a finite number ≥ 0
  - `unitIds` MUST be an array (may be empty)
  - `personnelIds` MUST be an array (may be empty)
  - `random` MUST be a function returning [0, 1)
- **Output Validation:**
  - `outcome` MUST be "victory", "defeat", or "draw"
  - `unitDamage` MUST be a valid Map with all unitIds
  - `personnelCasualties` MUST be a valid Map (casualties only)
  - `salvage` MUST be an array (currently empty)
- **Edge Cases:**
  - Empty unitIds → unitDamage is empty Map
  - Empty personnelIds → personnelCasualties is empty Map

---

### processScenarioResult

- **Input Validation:**
  - `campaign` MUST be a valid ICampaign instance
  - `scenario` MUST be a valid IScenario instance
  - `result` MUST be a valid ResolveScenarioResult
- **Output Validation:**
  - MUST return a new ICampaign instance (immutable)
  - MUST NOT mutate input parameters
- **Current Behavior:**
  - Returns campaign unchanged (stub implementation)
- **Intended Behavior (Future):**
  - Apply unit damage to campaign units
  - Apply personnel casualties to campaign personnel
  - Update scenario status based on outcome
  - Add salvage to campaign finances

---

## Implementation Notes

### Random Number Generation

All ACAR functions accept an optional `random` parameter to enable deterministic testing:

```typescript
function distributeDamage(
  unitIds: string[],
  severity: number,
  random: () => number = Math.random,
): Map<string, number>;
```

**Testing Pattern:**

```typescript
const seededRandom = () => 0.5; // Deterministic
const result = distributeDamage(['unit1'], 0.8, seededRandom);
expect(result.get('unit1')).toBe(60); // Predictable result
```

---

### Immutable Update Pattern

`processScenarioResult` follows an immutable update pattern:

- Creates new Maps/objects instead of mutating inputs
- Returns a new ICampaign instance
- Original campaign, scenario, and result remain unchanged

**Example:**

```typescript
const updatedCampaign = processScenarioResult(campaign, scenario, result);
// campaign !== updatedCampaign (new instance)
// campaign is unchanged
```

---

### Casualty Map Representation

`determineCasualties` returns a Map of `personnelId → PersonnelStatus`, but `resolveScenario` converts this to `personnelId → 1` (casualty count) for the `ResolveScenarioResult`:

```typescript
// determineCasualties output
Map { 'pilot1' => PersonnelStatus.WOUNDED, 'pilot2' => PersonnelStatus.MIA }

// resolveScenario output (personnelCasualties)
Map { 'pilot1' => 1, 'pilot2' => 1 }
```

This simplifies the result interface while preserving casualty information.

---

### Salvage Placeholder

The `salvage` field in `ResolveScenarioResult` is currently a placeholder (always empty array). Future implementations will populate this with salvageable items based on outcome and opponent forces.

---

### Performance Considerations

- All functions operate in O(n) time where n is the number of units/personnel
- Map operations are efficient for lookups and iteration
- No recursive calls or complex algorithms
- Suitable for real-time combat resolution

---

## Examples

### Example 1: Calculate Victory Probability

```typescript
import { calculateVictoryProbability } from '@/lib/combat/acar';

// Equal forces
const prob1 = calculateVictoryProbability(3000, 3000);
console.log(prob1); // 0.5

// Player advantage
const prob2 = calculateVictoryProbability(4000, 2000);
console.log(prob2); // 0.6666666666666666

// Edge case: both zero
const prob3 = calculateVictoryProbability(0, 0);
console.log(prob3); // 0.5
```

---

### Example 2: Distribute Damage with Seeded Random

```typescript
import { distributeDamage } from '@/lib/combat/acar';

const seededRandom = () => 0.5;
const unitIds = ['mech1', 'mech2', 'mech3'];
const severity = 0.8; // Defeat severity

const damageMap = distributeDamage(unitIds, severity, seededRandom);

console.log(damageMap.get('mech1')); // 60
console.log(damageMap.get('mech2')); // 60
console.log(damageMap.get('mech3')); // 60
```

---

### Example 3: Determine Casualties with Mixed Outcomes

```typescript
import { determineCasualties } from '@/lib/combat/acar';
import { PersonnelStatus } from '@/types/campaign/enums';

const randomValues = [0.08, 0.3, 0.15, 0.09, 0.85, 0.02, 0.92];
let index = 0;
const seededRandom = () => randomValues[index++];

const personnelIds = ['pilot1', 'pilot2', 'pilot3', 'pilot4'];
const battleIntensity = 1.0; // 10% casualty rate

const casualties = determineCasualties(
  personnelIds,
  battleIntensity,
  seededRandom,
);

console.log(casualties.get('pilot1')); // PersonnelStatus.WOUNDED
console.log(casualties.has('pilot2')); // false (no casualty)
console.log(casualties.get('pilot3')); // PersonnelStatus.MIA
console.log(casualties.get('pilot4')); // PersonnelStatus.KIA
```

---

### Example 4: Resolve Complete Scenario

```typescript
import { resolveScenario } from '@/lib/combat/acar';

const randomValues = [0.3, 0.5, 0.03, 0.3];
let index = 0;
const seededRandom = () => randomValues[index++];

const result = resolveScenario(
  3000, // player BV
  3000, // opponent BV
  ['unit1'],
  ['pilot1'],
  seededRandom,
);

console.log(result.outcome); // 'victory'
console.log(result.unitDamage.get('unit1')); // 22.5
console.log(result.personnelCasualties.get('pilot1')); // 1
console.log(result.salvage); // []
```

---

### Example 5: Process Scenario Result (Stub)

```typescript
import { processScenarioResult } from '@/lib/combat/battleResultProcessing';
import { resolveScenario } from '@/lib/combat/acar';

const result = resolveScenario(3000, 2500, unitIds, personnelIds);
const updatedCampaign = processScenarioResult(campaign, scenario, result);

// Current stub behavior: returns campaign unchanged
console.log(updatedCampaign === campaign); // true (for now)

// Future behavior: will apply damage, casualties, status, salvage
// console.log(updatedCampaign === campaign); // false (new instance)
```

---

## Dependencies

### Depends On

- `@/types/campaign/enums` - PersonnelStatus enum
- `@/types/campaign/Campaign` - ICampaign interface (for processScenarioResult)
- `@/types/campaign/Scenario` - IScenario interface (for processScenarioResult)

### Used By

- `battleResultProcessing.ts` - Consumes ACAR results to update campaign state
- Campaign system - Uses ACAR for scenario resolution
- Testing framework - Uses injectable random for deterministic tests

---

## Non-Goals

- **Campaign State Persistence**: Campaign save/load is handled by separate persistence layer
- **UI Integration**: Battle result display and user interaction are UI concerns
- **Salvage Generation**: Detailed salvage algorithms are out of scope (placeholder only)
- **Repair Mechanics**: Unit repair costs and timelines are separate systems
- **Mission Configuration**: Scenario setup and objective definition are separate concerns

---

## References

- **Source Files:**
  - `src/lib/combat/acar.ts` - ACAR type definitions and algorithms
  - `src/lib/combat/battleResultProcessing.ts` - Battle result processing stub
  - `src/lib/combat/__tests__/acar.test.ts` - Comprehensive test suite
- **Related Specifications:**
  - `campaign-system` - Campaign management and state
  - `battle-value-system` - Battle Value calculation rules
  - `damage-system` - Unit damage mechanics
- **External References:**
  - BattleTech: Total Warfare (combat resolution rules)
  - BattleTech: Campaign Operations (campaign management)

---

## Changelog

### Version 1.0.0 (2026-02-13)

- Initial specification
- Defined ACAR type system (ISalvageItem, ResolveScenarioResult)
- Documented victory probability formula with edge cases
- Documented damage distribution formula with randomization
- Documented casualty determination with status distribution
- Documented scenario resolution with outcome logic
- Documented processScenarioResult stub and intended behavior
- Added comprehensive examples and test patterns
