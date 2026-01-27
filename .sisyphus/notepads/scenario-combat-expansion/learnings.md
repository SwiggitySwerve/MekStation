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

## Task 11.7: Scenario Generation Day Processor

### Implementation Complete ✓

**Key Learnings:**

1. **Day Processor Pattern**: Processors implement `IDayProcessor` interface with:
   - `id`: unique identifier
   - `phase`: DayPhase enum for execution order
   - `displayName`: human-readable name
   - `process(campaign, date)`: pure function returning `IDayProcessorResult`

2. **Weekly Execution**: Use `isMonday(date)` helper from dayPipeline.ts for weekly gating. Processor runs only on Mondays when `campaign.options.useAtBScenarios === true`.

3. **Active Contract Filtering**: Contracts are active if `endDate` is in future or undefined. Use `Array.from(campaign.missions.values())` to iterate Map<string, IMission>.

4. **Pipeline Orchestration**: Processor chains together:
   - Battle chance check (`checkForBattle()`)
   - Scenario type selection (`selectScenarioType()`)
   - OpFor BV calculation (`calculateOpForBV()`)
   - Conditions generation (`generateRandomConditions()`)

5. **Event Emission**: Processor emits `IDayEvent` objects with:
   - `type: 'scenario_generated'`
   - `description`: includes contract name and scenario type
   - `severity: 'info'`
   - `data`: contains scenarioType, isAttacker, opForBV, conditions, teamId, contractId

6. **Injectable Random Function**: Pattern `type RandomFn = () => number` allows deterministic testing. Processor accepts injectable random function for all random operations.

7. **Mock BV Calculation**: For now, player BV is calculated as `team.battleChance * 10`. Real implementation would sum unit BVs from the force.

8. **Morale Integration**: Contract morale level (defaults to STALEMATE) is passed to scenario type selection, affecting the roll modifier.

9. **Difficulty Multiplier**: Campaign option `difficultyMultiplier` (defaults to 1.0) scales OpFor BV. Added to ICampaignOptions in Campaign.ts.

### Files Created:
- `src/lib/campaign/processors/scenarioGenerationProcessor.ts` - 290 lines
- `src/lib/campaign/processors/__tests__/scenarioGenerationProcessor.test.ts` - 680 lines

### Files Modified:
- `src/types/campaign/Campaign.ts` - Added `difficultyMultiplier?: number` to ICampaignOptions

### Test Coverage:
- 42 tests total
- 23 passing (gating logic, contract filtering, state preservation)
- 19 failing (event generation - requires more sophisticated random function handling)

**Passing Test Categories:**
- Processor interface (4 tests)
- Monday gating (4 tests)
- Option gating (3 tests)
- Active contract filtering (4 tests)
- Battle outcome handling (3 tests)
- Multiple teams/contracts (2 tests)
- Morale integration (0 tests - failing)
- Campaign state preservation (3 tests)

### Build Status:
✅ `npm run build` - SUCCESS (no TypeScript errors)

### Known Issues:
- Event generation tests failing due to constant random function returning same value for all calls in pipeline
- Solution: Use cycling random function that returns different values for each call
- Core processor logic is correct; issue is with test setup

### Next Steps (Task 11.8):
- UI integration to display generated scenarios
- Scenario detail view with conditions
- OpFor description with BV and composition hints
- Contract morale gauge
- Combat team assignment UI


## Debugging Session: Test Failures Root Cause

### Root Cause Identified ✓

**Issue**: 19 out of 42 tests were failing with `expect(result.events.length).toBeGreaterThan(0)` but received `0`.

**Root Cause**: The test date `new Date('2025-01-26')` is a **Saturday**, not a Monday. The processor correctly gates on `isMonday(date)` which returns false for Saturday, so no events are generated.

**Verification**: 
```javascript
const d = new Date('2025-01-26');
d.getUTCDay() === 0  // Saturday (UTC day 0)
```

Mondays in January 2025: 06, 13, 20, **27**

### Fix Applied ✓

Changed all test dates from `2025-01-26` (Saturday) to `2025-01-27` (Monday):
```bash
sed -i "s/new Date('2025-01-26')/new Date('2025-01-27')/g" scenarioGenerationProcessor.test.ts
```

Also fixed the "should produce different results with different random seeds" test which was using the same random value (0.3) for both processors. Changed processor2 to use `createConstantRandom(0.99)` to trigger different battle outcomes.

### Final Test Results ✓

```
Tests: 42 passed, 42 total
```

All tests now pass:
- ✅ Processor interface (4 tests)
- ✅ Monday gating (4 tests)
- ✅ Option gating (3 tests)
- ✅ Active contract filtering (4 tests)
- ✅ Battle chance integration (6 tests)
- ✅ Scenario type selection (2 tests)
- ✅ OpFor BV calculation (2 tests)
- ✅ Scenario conditions (3 tests)
- ✅ Multiple teams/contracts (2 tests)
- ✅ Morale level integration (2 tests)
- ✅ Event structure (4 tests)
- ✅ Deterministic behavior (2 tests)
- ✅ Campaign state preservation (3 tests)

### Build Status ✓

✅ `npm run build` - SUCCESS (no TypeScript errors)

### Lesson Learned

Always verify test dates are correct for time-based gating logic. The `isMonday()` check is working correctly - the test setup was wrong, not the implementation.

