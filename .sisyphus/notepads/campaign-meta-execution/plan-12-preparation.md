# Plan 12 Preparation: Contract Types Expansion

**Status**: Preparatory analysis (Phase B blocked until PR #195 merges)  
**Date**: 2026-01-27

---

## Overview

**Change-ID**: `add-contract-types`  
**OpenSpec PR**: #193 (MERGED on 2026-01-27)  
**Sisyphus Plan**: `contract-types-expansion.md`  
**Dependency**: Plan 11 (CombatRole type) - MUST merge before Phase B starts

### Scope

Expand from 5 basic contract types to 19 AtB contract types with:
- Variable contract lengths
- Operations tempo multipliers
- Combat role assignments (uses Plan 11's CombatRole)
- Parts availability modifiers
- 4-clause negotiation system
- 10 monthly contract event types

---

## Task Breakdown Analysis

### Task 12.1: Contract Type Definitions (Foundation)

**Files to create**:
- `src/types/campaign/contracts/contractTypes.ts`

**Key types**:
```typescript
enum AtBContractType {
  // Garrison (5 types)
  GARRISON_DUTY, CADRE_DUTY, SECURITY_DUTY, RIOT_DUTY, PLANETARY_ASSAULT,
  // Raid (6 types)
  RELIEF_DUTY, GUERRILLA_WARFARE, PIRATE_HUNTING, DIVERSIONARY_RAID, OBJECTIVE_RAID, RECON_RAID,
  // Guerrilla (4 types)
  EXTRACTION_RAID, ASSASSINATION, ESPIONAGE, MOLE_HUNTING,
  // Special (4 types)
  OBSERVATION_RAID, RETAINER, SABOTAGE, TERRORISM
}

type ContractGroup = 'garrison' | 'raid' | 'guerrilla' | 'special';

interface IContractTypeDefinition {
  type: AtBContractType;
  name: string;
  group: ContractGroup;
  constantLengthMonths: number;
  opsTempo: number;
  defaultCombatRole: CombatRole;  // ← DEPENDENCY on Plan 11
  partsAvailabilityMod: number;
  description: string;
}
```

**Data to define** (from MekHQ research):
- 19 contract type definitions with exact MekHQ values
- Ops tempo ranges: 0.8× (Cadre) to 2.4× (Espionage/Sabotage)
- Constant lengths: 6-18 months
- Parts availability mods: -2 to +2

**Estimated effort**: ~2-3 hours (large constant data structure)

**Tests needed**:
- Enum has 19 values
- CONTRACT_TYPE_DEFINITIONS has all 19 entries
- Each definition has required fields
- Type guards for AtBContractType
- Group categorization correct

---

### Task 12.2: Variable Contract Length

**Files to create**:
- `src/lib/campaign/contracts/contractLength.ts`

**Formula** (from MekHQ):
```typescript
function calculateVariableLength(
  constantLength: number,
  random: RandomFn
): number {
  const base = Math.round(constantLength * 0.75);
  const variance = Math.round(constantLength * 0.5);
  return base + Math.floor(random() * variance);
}
```

**Example**:
- Garrison Duty: constantLength = 18 months
- Base: 18 × 0.75 = 13.5 → 14 months
- Variance: 18 × 0.5 = 9 months
- Result: 14 + random(0-8) = 14-22 months

**Estimated effort**: ~1 hour (simple formula)

**Tests needed**:
- Formula produces correct ranges for all 19 types
- Deterministic with seeded random
- Edge cases (minimum/maximum lengths)
- Rounding behavior matches MekHQ

---

### Task 12.3: Contract Negotiation

**Files to create**:
- `src/lib/campaign/contracts/contractNegotiation.ts`

**4 Clause Types**:
1. **Command Rights**: Independent, Liaison, Integrated
2. **Salvage Rights**: None, 40%, 60%, 80%, 100%
3. **Support Rights**: None, Battle Loss Comp, Straight Support
4. **Transport Rights**: None, Employer Provides, Independent

**Negotiation mechanics**:
```typescript
interface INegotiationRoll {
  baseTarget: number;
  skillModifier: number;      // from Plan 7 (Negotiation skill)
  standingModifier: number;   // from Plan 5 (Faction Standing)
  roll: number;               // 2d6
  success: boolean;
}

function negotiateClause(
  clauseType: ClauseType,
  skill: number,
  standing: number,
  random: RandomFn
): ClauseResult;
```

**Dependencies**:
- Plan 7: Negotiation skill level
- Plan 5: Faction standing modifier

**Estimated effort**: ~3-4 hours (complex logic with multiple modifiers)

**Tests needed**:
- Each clause type negotiation
- Skill modifier effects
- Standing modifier effects
- Success/failure outcomes
- Edge cases (max skill, min standing)

---

### Task 12.4: Contract Events

**Files to create**:
- `src/lib/campaign/contracts/contractEvents.ts`

**10 Event Types** (from MekHQ):
1. BONUS_ROLL - Extra payment
2. SPECIAL_SCENARIO - Unique mission
3. CIVIL_DISTURBANCE - Morale penalty
4. REBELLION - Major combat
5. BETRAYAL (6 sub-types) - Employer turns hostile
6. TREACHERY - Sabotage
7. LOGISTICS_FAILURE - Parts shortage
8. REINFORCEMENTS - Ally support
9. SPECIAL_EVENTS (6 sub-types) - Various effects
10. BIG_BATTLE - Large-scale engagement

**Event checking**:
```typescript
interface IContractEvent {
  type: ContractEventType;
  description: string;
  effects: {
    moraleChange?: number;
    partsAvailabilityMod?: number;
    scenarioGeneration?: boolean;
    paymentMultiplier?: number;
  };
}

function checkMonthlyEvents(
  contract: IContract,
  random: RandomFn
): IContractEvent[];
```

**Integration points**:
- Plan 11: Morale changes
- Plan 9: Parts availability
- Plan 16: Random events system

**Estimated effort**: ~4-5 hours (10 event types with effects)

**Tests needed**:
- Each event type generation
- Event probability correct
- Effect application
- Multiple events per month
- Event history tracking

---

### Task 12.5: Contract Market Update

**Files to modify**:
- `src/lib/campaign/contractMarket.ts` (existing)

**Changes needed**:
- Generate contracts using all 19 types (not just 5)
- Apply type-specific modifiers
- Calculate variable lengths
- Set default combat roles
- Apply ops tempo to scenario generation

**Integration**:
- Plan 11: Ops tempo affects scenario frequency
- Plan 9: Parts availability affects acquisition

**Estimated effort**: ~2-3 hours (update existing system)

**Tests needed**:
- All 19 types can be generated
- Type distribution reasonable
- Variable lengths applied
- Modifiers correctly set

---

### Task 12.6: UI Updates (Optional/Deferred)

**Files to modify**:
- Contract selection UI
- Contract detail view
- Negotiation interface

**Changes needed**:
- Display all 19 contract types
- Show type-specific information (ops tempo, parts mod)
- Negotiation clause selection UI
- Contract event notifications

**Note**: Like Plan 11 Task 11.8, UI work may be deferred if problematic.

**Estimated effort**: ~4-6 hours (if implemented)

---

## Dependencies Analysis

### Critical Dependency: Plan 11 CombatRole

**Why it's critical**:
- `IContractTypeDefinition.defaultCombatRole` field uses `CombatRole` enum
- Cannot define contract types without this type available
- Plan 11 PR #195 MUST merge before Plan 12 Phase B starts

**Import statement**:
```typescript
import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';
```

**Verification after Plan 11 merge**:
```bash
# Verify CombatRole is available
grep -r "export enum CombatRole" src/types/campaign/scenario/
```

### Integration Dependencies

**Plan 7 (Skills)**:
- Negotiation skill for contract negotiation
- Already merged ✅

**Plan 5 (Faction Standing)**:
- Standing modifier for negotiation
- Already merged ✅

**Plan 9 (Acquisition)**:
- Parts availability modifier affects acquisition TN
- Already merged ✅

**Plan 11 (Scenario Generation)**:
- Ops tempo multiplier affects scenario frequency
- Awaiting merge (PR #195)

**Plan 16 (Random Events)**:
- Contract events integrate with random events system
- OpenSpec merged, implementation pending

---

## Test Strategy

### Test Coverage Goals

**Unit Tests** (~150-200 tests total):
- Task 12.1: ~30 tests (enum validation, type definitions)
- Task 12.2: ~20 tests (length calculation, ranges)
- Task 12.3: ~40 tests (negotiation mechanics, modifiers)
- Task 12.4: ~50 tests (event types, effects, probabilities)
- Task 12.5: ~30 tests (market generation, type distribution)

**Integration Tests** (~20 tests):
- Contract creation with all 19 types
- Negotiation with skill/standing modifiers
- Event effects on campaign state
- Ops tempo integration with scenario generation

### TDD Approach

Follow Plan 11's successful pattern:
1. Write failing tests first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor for clarity (REFACTOR)
4. Use injectable RandomFn for deterministic testing

---

## Technical Patterns to Reuse

### From Plan 11

1. **Enum Design**: String-based enums for serialization
   ```typescript
   export enum AtBContractType {
     GARRISON_DUTY = 'garrison_duty',
     // ...
   }
   ```

2. **Type Guards**: Simple validation pattern
   ```typescript
   export function isAtBContractType(value: unknown): value is AtBContractType {
     return Object.values(AtBContractType).includes(value as AtBContractType);
   }
   ```

3. **Injectable RandomFn**: Deterministic testing
   ```typescript
   type RandomFn = () => number;
   
   function calculateVariableLength(
     constantLength: number,
     random: RandomFn = Math.random
   ): number {
     // ...
   }
   ```

4. **Constant Data Structures**: Large lookup tables
   ```typescript
   export const CONTRACT_TYPE_DEFINITIONS: Record<AtBContractType, IContractTypeDefinition> = {
     // 19 entries...
   };
   ```

---

## Potential Challenges

### Challenge 1: Large Constant Data

**Issue**: 19 contract type definitions with 8+ fields each = ~150 lines of data

**Solution**:
- Use TypeScript const assertions for type safety
- Validate all entries have required fields in tests
- Consider extracting to JSON if data becomes unwieldy

### Challenge 2: Complex Negotiation Logic

**Issue**: 4 clause types × multiple outcomes × skill/standing modifiers = complex state space

**Solution**:
- Break into smaller functions per clause type
- Use lookup tables for modifier calculations
- Comprehensive test coverage for all combinations

### Challenge 3: Event System Integration

**Issue**: Contract events overlap with Plan 16 random events

**Solution**:
- Plan 12 defines contract-specific events
- Plan 16 references and extends them
- Clear separation of concerns in event types

### Challenge 4: Backward Compatibility

**Issue**: Existing campaigns have 5 legacy contract types

**Solution**:
- Map legacy types to AtB equivalents:
  - Garrison → GARRISON_DUTY
  - Recon → RECON_RAID
  - Raid → OBJECTIVE_RAID
  - Extraction → EXTRACTION_RAID
  - Escort → SECURITY_DUTY
- Optional `atbContractType` field on IContract
- Default values for new fields (ops tempo = 1.0, parts mod = 0)

---

## Estimated Timeline

**Total Effort**: ~15-20 hours

| Task | Effort | Tests | Complexity |
|------|--------|-------|------------|
| 12.1 | 2-3h | 30 | Medium (large data) |
| 12.2 | 1h | 20 | Low (simple formula) |
| 12.3 | 3-4h | 40 | High (complex logic) |
| 12.4 | 4-5h | 50 | High (10 event types) |
| 12.5 | 2-3h | 30 | Medium (integration) |
| 12.6 | 4-6h | - | Medium (UI - may defer) |

**Critical Path**: 12.1 → 12.2 → 12.5 (contract generation)

**Parallel Work**: 12.3 and 12.4 can be done in parallel after 12.1

---

## Pre-Implementation Checklist

Before starting Phase B:

- [ ] Verify PR #195 (Plan 11) is merged
- [ ] Pull latest main branch
- [ ] Verify CombatRole type is available
- [ ] Create branch: `git checkout -b feat/add-contract-types`
- [ ] Read OpenSpec proposal and tasks
- [ ] Review this preparation document
- [ ] Set up notepad: `.sisyphus/notepads/contract-types-expansion/`

---

## Success Criteria

**Phase B Complete When**:
- [ ] All 19 contract types defined with correct MekHQ values
- [ ] Variable length formula matches MekHQ behavior
- [ ] 4-clause negotiation system working
- [ ] 10 contract event types implemented
- [ ] Contract market generates all 19 types
- [ ] ~170 tests passing (150 unit + 20 integration)
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Backward compatible with legacy contracts

---

**Status**: Preparation complete. Ready to start Phase B immediately after PR #195 merges.
