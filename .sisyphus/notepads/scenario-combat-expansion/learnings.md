# Task 11.1 Learnings: Combat Roles, Morale, and Scenario Types

## Completed
- ✅ Created `src/types/campaign/scenario/scenarioTypes.ts` with all enums and interfaces
- ✅ Added `moraleLevel?: AtBMoraleLevel` to IContract (Mission.ts)
- ✅ Added `combatTeams?: readonly ICombatTeam[]` to ICampaign (Campaign.ts)
- ✅ Added `conditions?: IScenarioConditions` to IScenario (Scenario.ts)
- ✅ Added `useAtBScenarios?: boolean` to ICampaignOptions (Campaign.ts)
- ✅ Created comprehensive test suite (14 tests, all passing)
- ✅ All types compile without errors
- ✅ No existing tests broken

## Key Patterns Observed

### Enum Design
- String-based enums (not numeric) for better serialization
- All enum values lowercase with underscores (e.g., `base_attack`)
- MORALE_VALUES constant maps enum to numeric values for calculations

### Type Guard Functions
- Simple pattern: `Object.values(Enum).includes(value as Enum)`
- Used for runtime validation of enum values
- Exported alongside enums for public API

### Interface Design
- All new fields are optional (`?`) for backward compatibility
- Readonly properties throughout
- JSDoc comments on all public fields
- Follows existing MekStation patterns (Campaign.ts, Mission.ts, Scenario.ts)

### Test Coverage
- Enum value count verification (7 roles, 7 morale levels, 9+ scenario types)
- Enum value correctness (exact string values)
- MORALE_VALUES mapping verification (-3 to +3)
- Type guard positive and negative cases
- All tests use Jest conventions

## Architecture Notes

### Circular Dependency Avoidance
- scenarioTypes.ts is a pure types module (no imports from CampaignInterfaces.ts)
- Imported by Mission.ts, Campaign.ts, Scenario.ts without issues
- Clean separation of concerns

### Optional Fields Strategy
- All new fields are optional to maintain backward compatibility
- Existing campaigns won't break when loading
- Default values documented in JSDoc comments
- Migration notes in plan: defaults are STALEMATE for morale, empty array for teams, false for useAtBScenarios

## Test Results
```
PASS src/types/campaign/scenario/scenarioTypes.test.ts
  CombatRole
    ✓ should have exactly 7 values
    ✓ should have all required roles
  AtBMoraleLevel
    ✓ should have exactly 7 values
    ✓ should have all required morale levels
    ✓ should have correct numeric mapping
    ✓ should have all levels in MORALE_VALUES
  AtBScenarioType
    ✓ should have at least 9 values
    ✓ should have all required scenario types
  Type Guards
    isCombatRole
      ✓ should return true for valid combat roles
      ✓ should return false for invalid values
    isMoraleLevel
      ✓ should return true for valid morale levels
      ✓ should return false for invalid values
    isScenarioType
      ✓ should return true for valid scenario types
      ✓ should return false for invalid values

Tests: 14 passed, 14 total
```

## Files Modified
1. **Created**: `src/types/campaign/scenario/scenarioTypes.ts` (7.2 KB)
   - CombatRole enum (7 values)
   - AtBMoraleLevel enum (7 values)
   - MORALE_VALUES constant
   - AtBScenarioType enum (9 values)
   - ICombatTeam interface
   - IScenarioConditions interface
   - Type guard functions

2. **Modified**: `src/types/campaign/Mission.ts`
   - Added import: `import type { AtBMoraleLevel } from './scenario/scenarioTypes'`
   - Added field: `readonly moraleLevel?: AtBMoraleLevel` to IContract

3. **Modified**: `src/types/campaign/Campaign.ts`
   - Added import: `import type { ICombatTeam } from './scenario/scenarioTypes'`
   - Added field: `readonly combatTeams?: readonly ICombatTeam[]` to ICampaign
   - Added field: `readonly useAtBScenarios?: boolean` to ICampaignOptions

4. **Modified**: `src/types/campaign/Scenario.ts`
   - Added import: `import type { IScenarioConditions } from './scenario/scenarioTypes'`
   - Added field: `readonly conditions?: IScenarioConditions` to IScenario

5. **Created**: `src/types/campaign/scenario/scenarioTypes.test.ts` (4.5 KB)
   - 14 comprehensive tests covering all enums and type guards

## Next Steps (Task 11.2+)
- Battle chance calculator will use CombatRole and AtBMoraleLevel
- Scenario type selection will use AtBScenarioType
- Morale tracking will use AtBMoraleLevel and MORALE_VALUES
- Scenario conditions will affect force composition

## Task 11.2: Battle Chance Calculator

### Implementation Complete ✓

**Key Learnings:**

1. **Morale Value Formula**: The battle type modifier uses MORALE_VALUES (numeric -3 to +3) not enum ordinal indices. Formula: `1 + (STALEMATE_VALUE - current_VALUE) * 5`
   - ROUTED (-3) → 16 (worst morale, highest modifier)
   - STALEMATE (0) → 1 (neutral)
   - OVERWHELMING (+3) → -14 (best morale, lowest modifier)

2. **D100 Roll Mechanics**: Roll = `floor(random() * 100) + 1` produces 1-100 inclusive. Battle occurs if `roll <= baseChance`.
   - 0.39 * 100 = 39, floor(39) + 1 = 40 ✓ (within 40% for Maneuver)
   - 0.40 * 100 = 40, floor(40) + 1 = 41 ✗ (exceeds 40%)

3. **Auxiliary/Reserve Always False**: These roles have 0% battle chance and return false immediately, regardless of roll.

4. **Injectable RandomFn Pattern**: Type `RandomFn = () => number` allows deterministic testing with seeded values. Essential for reproducible test results.

5. **TDD Approach**: Writing tests first revealed the correct formula interpretation. The "formula test" that passes validates the implementation against the specification.

### Files Created:
- `src/lib/campaign/scenario/battleChance.ts` - 143 lines
- `src/lib/campaign/scenario/__tests__/battleChance.test.ts` - 370 lines

### Test Coverage:
- 36 tests, all passing
- BASE_BATTLE_CHANCE: 9 tests (7 roles + range validation)
- calculateBattleTypeMod: 8 tests (all 7 morale levels + formula validation)
- checkForBattle: 19 tests (role-specific, boundaries, determinism, edge cases)

### Commit:
`feat(campaign): implement battle chance calculator per combat role`
