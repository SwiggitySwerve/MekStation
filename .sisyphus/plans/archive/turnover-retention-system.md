# Turnover & Retention System

> **✅ COMPLETED** — Implemented, merged, and archived. PR #178.

## Audit Corrections

> Applied 2026-01-27 — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | Age bracket modifiers (incorrect values) | age ≤ 20: -1, 50-64: +3, 65-74: +4, 75-84: +5, 85-94: +6, 95-104: +7, 105+: +8 | `RetirementDefectionTracker.java:818-838` |
| 2 | "19 modifiers" | "27 modifiers" | Validated 27 unique modifiers in RetirementDefectionTracker.java |
| 3 | (missing) Tactical Genius modifier | "+1 for non-officers" | `RetirementDefectionTracker.java:416-417` |
| 4 | (missing) Wartime modifier | "+4 when faction at war with origin faction" | `RetirementDefectionTracker.java:350-353` |
| 5 | Faction modifiers (single item) | "7 distinct faction checks" | `RetirementDefectionTracker.java:321-355` |
| 6 | Morale (implied personnel-level) | "morale is CONTRACT-level, not PERSONNEL-level" | `MHQMorale.java` |

## Context

### Original Request
Implement MekHQ's exact turnover/retention system in MekStation: a 2d6 roll against a target number composed of 27 additive modifiers. Personnel who fail the check leave the campaign. Creates tension and consequence for campaign management decisions.

### Interview Summary
**Key Discussions**:
- Exact MekHQ formula parity (1:1 match)
- 27 additive modifiers, each independently testable <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->
- Modifiers referencing unbuilt systems (fatigue, loyalty, shares, etc.) are stubbed with neutral defaults (return 0)
- Injectable `RandomFn` for testable dice rolls (following `contractMarket.ts` pattern)
- TDD approach
- UI included: turnover report display, modifier breakdown

**Research Findings**:
- `IPerson` already has `isFounder` flag (line 398) — needed for modifier #2
- `IPerson` has `injuries` array with `permanent` flag — needed for modifier #18
- `CampaignPersonnelRole` has role types — needed for officer detection (modifier #19)
- `PersonnelStatus` has all needed transition states (ACTIVE → RETIRED, DESERTED)
- NO turnover, loyalty, fatigue, or morale exists currently
- Target: `src/types/campaign/Campaign.ts` ICampaign (NOT `CampaignInterfaces.ts`)

### Metis Review
**Identified Gaps** (addressed):
- Commander immunity (commanders exempt from turnover)
- Mass exodus UI notification strategy
- Prisoner/MIA personnel don't roll turnover
- New recruits can't leave same day (founder bonus handles)
- Need injectable RandomFn for testable 2d6 rolls
- Turnover check frequency configurable (weekly/monthly/quarterly/annually)
- Payout on departure: salary × configurable multiplier

---

## Work Objectives

### Core Objective
Implement the full 27-modifier turnover check system that determines whether personnel voluntarily leave the campaign, creating meaningful tension in campaign management. <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->

### Concrete Deliverables
- `src/lib/campaign/turnover/` — All turnover logic
- `src/lib/campaign/turnover/modifiers/` — Individual modifier functions
- `src/lib/campaign/processors/turnoverProcessor.ts` — Day pipeline processor
- Updated `src/types/campaign/Person.ts` — New fields (loyalty, serviceContract)
- Updated `src/types/campaign/Campaign.ts` — New ICampaignOptions fields
- UI component for turnover reports

### Definition of Done
- [x] 2d6 roll with target number from 27 additive modifiers <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->
- [x] Each modifier independently testable with exact MekHQ values
- [x] Stub modifiers return 0 (neutral) with `@stub` JSDoc tag
- [x] Personnel who fail leave campaign (status transition)
- [x] Modifier breakdown available for UI display
- [x] Registers as day pipeline processor
- [x] Configurable check frequency via campaign options

### Must Have
- All 27 modifier functions (9 real, 18 stubbed) <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->
- 2d6 roll with injectable RandomFn
- TurnoverResult type with full modifier breakdown
- Status transition: ACTIVE → RETIRED (voluntary) or DESERTED (negative)
- Payout calculation on departure
- Campaign options for turnover configuration
- Day processor registration

### Must NOT Have (Guardrails)
- Actual fatigue system implementation (stub only)
- Actual loyalty system implementation (stub only)
- Actual shares system implementation (stub only)
- Actual unit rating calculation (stub only)
- Actual morale system (stub only)
- Complex HR strain calculation (stub only)
- Random event triggers from turnover
- Import from `CampaignInterfaces.ts`

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: Jest

---

## Task Flow

```
2.1 (Types & modifiers) → 2.2 (Core check) → 2.3 (Person fields) → 2.4 (Day processor) → 2.5 (Campaign options) → 2.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2.1 | Foundation types and modifier functions |
| B | 2.3 | New Person fields can be done alongside core check |

| Task | Depends On | Reason |
|------|------------|--------|
| 2.2 | 2.1 | Core check needs modifier functions |
| 2.4 | 2.2, 2.3 | Processor needs check + person fields |
| 2.5 | 2.1 | Options need modifier definitions |
| 2.6 | 2.4 | UI needs processor output |

---

## TODOs

- [x] 2.1 Implement All 19 Turnover Modifier Functions

  **What to do**:
  - Create `src/lib/campaign/turnover/modifiers/` directory
  - Create one file per modifier group. Each function is a pure function:
    ```typescript
    type TurnoverModifierFn = (person: IPerson, campaign: ICampaign) => number;
    ```
   - Implement these 27 modifiers (9 real, 10 stubbed) <!-- AUDIT: Missed in initial correction. Source: RetirementDefectionTracker.java -->

  **REAL MODIFIERS** (data available in current IPerson/ICampaign):
  1. `getBaseTargetModifier(campaign)` → `campaign.options.turnoverFixedTargetNumber` (default: 3)
  2. `getFounderModifier(person)` → `person.isFounder ? -2 : 0`
  3. `getRecentPromotionModifier(person, campaign)` → promoted within 6 months = -1
   4. `getAgeModifier(person, campaign)` → age ≤ 20: -1, 50-64: +3, 65-74: +4, 75-84: +5, 85-94: +6, 95-104: +7, 105+: +8 <!-- AUDIT: Corrected age brackets. Source: RetirementDefectionTracker.java:818-838 -->
  5. `getInjuryModifier(person)` → +1 per permanent injury
  6. `getOfficerModifier(person)` → `isCommander || isSecondInCommand ? -1 : 0`
  7. `getMissionStatusModifier(campaign)` → last mission: SUCCESS=-1, FAILED=+1, BREACH=+2
  8. `getServiceContractModifier(person)` → if breaking contract early: -N
   9. `getSkillDesirabilityModifier(person, campaign)` → skilled personnel (low gunnery/piloting) harder to lose: -2 to +2
   10. `getTacticalGeniusModifier(person)` → +1 for non-officers with Tactical Genius ability <!-- AUDIT: Added missing modifier. Source: RetirementDefectionTracker.java:416-417 -->
   11. `getWartimeModifier(campaign)` → +4 when faction at war with origin faction <!-- AUDIT: Added missing modifier. Source: RetirementDefectionTracker.java:350-353 -->

   **STUB MODIFIERS** (dependencies not yet built, return 0):
   12. `getFatigueModifier(person)` → `/** @stub */ return 0;` (needs fatigue system)
   13. `getHRStrainModifier(campaign)` → `/** @stub */ return 0;` (needs admin skill tracking)
   14. `getManagementSkillModifier(campaign)` → `/** @stub */ return 0;` (needs leadership skill)
   15. `getSharesModifier(person, campaign)` → `/** @stub */ return 0;` (needs shares system)
   16. `getUnitRatingModifier(campaign)` → `/** @stub */ return 0;` (needs Dragoon rating)
   17. `getHostileTerritoryModifier(campaign)` → `/** @stub */ return 0;` (needs territory tracking)
   18. `getLoyaltyModifier(person)` → `/** @stub */ return 0;` (needs loyalty system)
   19. `getFactionCampaignModifier(campaign)` → `/** @stub */ return 0;` (needs faction standing)
   20. `getFactionOriginModifier(person)` → `/** @stub */ return 0;` (needs faction data)
   21. `getFamilyModifier(person, campaign)` → `/** @stub */ return 0;` (needs family system)
   22. `getMoraleModifier(campaign)` → `/** @stub */ return 0;` (morale is CONTRACT-level, not PERSONNEL-level <!-- AUDIT: Architecture correction. Source: MHQMorale.java -->)
   23-27. Additional faction checks (7 distinct faction checks total) <!-- AUDIT: Corrected - 7 distinct faction checks, not single item. Source: RetirementDefectionTracker.java:321-355 -->

  - Create `src/lib/campaign/turnover/modifiers/index.ts` barrel export
  - Create `TurnoverModifierResult` type:
    ```typescript
    export interface TurnoverModifierResult {
      readonly modifierId: string;
      readonly displayName: string;
      readonly value: number;
      readonly isStub: boolean;
    }
    ```

  **Must NOT do**:
  - Implement actual fatigue/loyalty/shares/rating systems
  - Stub functions with complex logic (just `return 0`)

  **Parallelizable**: YES (foundation task)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:78-107` — Complete modifier table with exact values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\RetirementDefectionTracker.java:135-432` — MekHQ implementation
  - `E:\Projects\MekStation\src\types\campaign\Person.ts:398` — `isFounder` field
  - `E:\Projects\MekStation\src\types\campaign\Person.ts:injuries` — `IInjury` with `permanent` flag
  - `E:\Projects\MekStation\src\types\campaign\enums\CampaignPersonnelRole.ts` — Role enum

    **Acceptance Criteria**:
    - [x] RED: Test each real modifier returns exact MekHQ value for given inputs
    - [x] RED: Test founder gets -2 modifier
    - [x] RED: Test age 65 gets +4 modifier <!-- AUDIT: Corrected from +8. Source: RetirementDefectionTracker.java:818-838 -->
    - [x] RED: Test 3 permanent injuries = +3
    - [x] RED: Test officer gets -1
    - [x] RED: Test all stubs return 0 (includes Tactical Genius, Wartime, and 7 faction checks) <!-- AUDIT: Includes missing modifiers. Source: RetirementDefectionTracker.java:416-417, :350-353, :321-355 -->
    - [x] GREEN: All tests pass
    - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement 19 turnover modifier functions`
  - Files: `src/lib/campaign/turnover/modifiers/*.ts`

---

- [x] 2.2 Implement Core Turnover Check

  **What to do**:
  - Create `src/lib/campaign/turnover/turnoverCheck.ts`
  - Implement the core check:
    ```typescript
    export type RandomFn = () => number;  // Returns 0-1

    export function roll2d6(random: RandomFn): number {
      return Math.floor(random() * 6) + 1 + Math.floor(random() * 6) + 1;
    }

    export interface TurnoverCheckResult {
      readonly personId: string;
      readonly personName: string;
      readonly roll: number;
      readonly targetNumber: number;
      readonly modifiers: readonly TurnoverModifierResult[];
      readonly passed: boolean;  // true = stays, false = leaves
      readonly departureType: 'retired' | 'deserted' | null;
      readonly payout: Money;
    }

    export function checkTurnover(
      person: IPerson,
      campaign: ICampaign,
      random: RandomFn
    ): TurnoverCheckResult
    ```
  - Add salary stub for payout calculation (Plan 4 builds the real salary service):
    ```typescript
    /** @stub Returns flat monthly salary. Replace with Plan 4's salaryService when built. */
    export function getPersonMonthlySalary(person: IPerson, _options: ICampaignOptions): Money {
      const DEFAULT_MONTHLY_SALARY = 1000; // Flat fallback in C-bills
      return Money.fromAmount(DEFAULT_MONTHLY_SALARY);
    }
    ```
   - Logic:
     1. Skip if person is not ACTIVE
     2. Skip if person is commander and `commanderImmune` option is true
     3. Skip if person is prisoner/MIA/student
     4. Calculate all 27 modifiers, sum to targetNumber <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->
    5. Roll 2d6
    6. If roll < targetNumber → person LEAVES
    7. Departure type: `deserted` if roll < targetNumber - 4, else `retired`
    8. Payout: `getPersonMonthlySalary(person) × payoutMultiplier` (configurable)
  - Create `runTurnoverChecks()` that processes ALL eligible personnel:
    ```typescript
    export function runTurnoverChecks(
      campaign: ICampaign,
      random: RandomFn
    ): TurnoverReport
    ```

  **Must NOT do**:
  - Use `Math.random()` directly (must accept `RandomFn`)
  - Process non-ACTIVE personnel
  - Allow commanders to leave (if option enabled)

  **Parallelizable**: NO (depends on 2.1)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:78-118` — Full formula and outcome rules
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\RetirementDefectionTracker.java:135-432` — MekHQ check logic
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts:114` — `RandomFn` pattern to follow

   **Acceptance Criteria**:
   - [x] RED: Test roll >= targetNumber → person stays (passed = true)
   - [x] RED: Test roll < targetNumber → person leaves (passed = false)
   - [x] RED: Test commander immunity when option enabled
   - [x] RED: Test non-ACTIVE personnel are skipped
   - [x] RED: Test payout calculation (getPersonMonthlySalary × payoutMultiplier)
   - [x] RED: Test salary stub returns default 1000 C-bills
   - [x] RED: Test modifier breakdown is included in result
   - [x] RED: Test deterministic results with seeded random
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement core turnover check with 2d6 roll`
  - Files: `src/lib/campaign/turnover/turnoverCheck.ts`

---

- [x] 2.3 Extend Person with Turnover-Related Fields

  **What to do**:
  - Add optional fields to `IPerson` in `src/types/campaign/Person.ts`:
    ```typescript
    // Turnover fields
    readonly lastPromotionDate?: Date;        // For recent promotion modifier
    readonly serviceContractEndDate?: Date;   // For service contract modifier
    readonly departureDate?: Date;            // When person left
    readonly departureReason?: string;        // Why person left
    ```
  - Add to `IPersonCareer` sub-interface
  - Update `createDefaultPerson()` factory with defaults (undefined for all)
  - These are all OPTIONAL fields — existing saved campaigns work without migration

  **Must NOT do**:
  - Add loyalty, fatigue, morale fields yet (those come with their own systems)
  - Break existing IPerson interface (all new fields optional)

  **Parallelizable**: YES (with 2.2)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Person.ts` — Current IPerson interface
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java` — MekHQ person fields

   **Acceptance Criteria**:
   - [x] RED: Test `createDefaultPerson()` works with new optional fields
   - [x] RED: Test existing IPerson objects without new fields still work
   - [x] GREEN: Types compile, tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): extend IPerson with turnover-related fields`
  - Files: `src/types/campaign/Person.ts`

---

- [x] 2.4 Create Turnover Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/turnoverProcessor.ts`
  - Implement as `IDayProcessor`:
    ```typescript
    export const turnoverProcessor: IDayProcessor = {
      id: 'turnover',
      phase: DayPhase.PERSONNEL,
      displayName: 'Turnover Check',
      process(campaign, date) {
        // Check frequency gate
        if (!shouldRunTurnover(campaign, date)) {
          return { events: [], campaign };
        }
        
        const report = runTurnoverChecks(campaign, Math.random);
        
        // Apply departures to campaign
        const updatedCampaign = applyTurnoverResults(campaign, report);
        
        // Convert to IDayEvents
        const events = report.departures.map(d => ({
          type: 'turnover_departure',
          description: `${d.personName} has ${d.departureType}`,
          severity: 'warning' as const,
          data: { ...d }
        }));
        
        return { events, campaign: updatedCampaign };
      }
    };
    ```
  - `shouldRunTurnover()` checks frequency option (weekly=Monday, monthly=1st, etc.)
  - `applyTurnoverResults()` updates personnel status (ACTIVE → RETIRED/DESERTED), records payout, sets departure date
  - Export registration function:
    ```typescript
    export function registerTurnoverProcessor(): void {
      getDayPipeline().register(turnoverProcessor);
    }
    ```

  **Must NOT do**:
  - Process on every day (respect frequency option)
  - Use `Math.random` in tests (only in production processor)

  **Parallelizable**: NO (depends on 2.2, 2.3)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor interface (from Plan 1)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\RetirementDefectionTracker.java` — MekHQ trigger conditions

   **Acceptance Criteria**:
   - [x] RED: Test processor runs on correct frequency (weekly/monthly/etc.)
   - [x] RED: Test processor skips on wrong day
   - [x] RED: Test departures update personnel status
   - [x] RED: Test payout recorded as financial transaction
   - [x] RED: Test departure date set on person
   - [x] GREEN: All tests pass
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add turnover day processor`
  - Files: `src/lib/campaign/processors/turnoverProcessor.ts`

---

- [x] 2.5 Add Turnover Campaign Options

  **What to do**:
  - Extend `ICampaignOptions` in `src/types/campaign/Campaign.ts`:
    ```typescript
    // Turnover options
    readonly useTurnover: boolean;                    // Enable/disable (default: true)
    readonly turnoverFixedTargetNumber: number;       // Base TN (default: 3)
    readonly turnoverCheckFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'never';  // (default: 'monthly')
    readonly turnoverCommanderImmune: boolean;        // Commander can't leave (default: true)
    readonly turnoverPayoutMultiplier: number;        // Salary × this (default: 12)
    readonly turnoverUseSkillModifiers: boolean;      // Enable skill desirability mod (default: true)
    readonly turnoverUseAgeModifiers: boolean;        // Enable age mod (default: true)
    readonly turnoverUseMissionStatusModifiers: boolean; // Enable mission status mod (default: true)
    ```
  - Update `createDefaultCampaignOptions()` with defaults
  - These all default to sensible values — existing campaigns get defaults on load

  **Must NOT do**:
  - Add options for stub modifiers (those activate when their systems are built)

  **Parallelizable**: YES (with 2.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts:53-193` — Current ICampaignOptions
  - `.sisyphus/drafts/mekhq-modifier-systems.md:108-118` — Turnover trigger conditions and outcomes
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignOptions.java` — MekHQ turnover options

   **Acceptance Criteria**:
   - [x] All new options have sensible defaults
   - [x] `createDefaultCampaignOptions()` includes all turnover options
   - [x] Existing campaigns deserialize without error (optional fields default)
   - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add turnover campaign options`
  - Files: `src/types/campaign/Campaign.ts`

---

- [x] 2.6 Create Turnover Report UI

  **What to do**:
  - Create `src/components/campaign/TurnoverReportPanel.tsx`
  - Display when turnover events occur in DayReport:
    - List of departed personnel with name, role, departure type
     - For each departure: expandable modifier breakdown (all 27 modifiers with values) <!-- AUDIT: Missed in initial correction. Source: RetirementDefectionTracker.java -->
    - Roll result vs target number
    - Payout amount
  - Integrate into campaign dashboard DayReportPanel (from Plan 1)
  - Add turnover options to campaign settings UI (toggles for enable/disable, frequency dropdown, TN input)

  **Must NOT do**:
  - Full turnover history page (defer)
  - Retention intervention UI (defer)

  **Parallelizable**: NO (depends on 2.4)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard
  - `E:\Projects\MekStation\src\components\campaign\DayReportPanel.tsx` — Day report panel (from Plan 1)

   **Acceptance Criteria**:
   - [x] Turnover events displayed in day report with departure details
   - [x] Modifier breakdown expandable for each departure
   - [x] Campaign settings show turnover options
   - [x] Manual verification: dev server → advance month → see turnover report

  **Commit**: YES
  - Message: `feat(ui): add turnover report panel and campaign options`
  - Files: `src/components/campaign/TurnoverReportPanel.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 2.1 | `feat(campaign): implement 19 turnover modifier functions` | `npm test` |
| 2.2 | `feat(campaign): implement core turnover check with 2d6 roll` | `npm test` |
| 2.3 | `feat(campaign): extend IPerson with turnover-related fields` | `npm test` |
| 2.4 | `feat(campaign): add turnover day processor` | `npm test` |
| 2.5 | `feat(campaign): add turnover campaign options` | `npm test` |
| 2.6 | `feat(ui): add turnover report panel and campaign options` | Manual verify |

---

## Success Criteria

### Verification Commands
```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] All 27 modifiers return exact MekHQ values <!-- AUDIT: Corrected from "19 modifiers". Source: RetirementDefectionTracker.java -->
- [x] 2d6 roll with injectable random is deterministic in tests
- [x] Stub modifiers clearly marked with `@stub` JSDoc
- [x] Personnel departures update status correctly
- [x] Payout recorded as financial transaction
- [x] Day processor respects frequency setting
- [x] UI shows modifier breakdown per departure

---

## Registration Snippet

```typescript
// In campaign initialization:
import { registerTurnoverProcessor } from '@/lib/campaign/processors/turnoverProcessor';
registerTurnoverProcessor();
```

---

## Migration Notes

- New optional fields on `IPerson` (lastPromotionDate, etc.) — existing campaigns unaffected
- New `ICampaignOptions` fields have sensible defaults — existing campaigns get defaults on load
- Stub modifiers will activate as their systems are built (no migration needed)
- `getPersonMonthlySalary()` is a stub returning 1000 C-bills — Plan 4 (Financial Expansion) replaces this with role-based salary calculation

---

*Plan generated by Prometheus. Execute with `/start-work`.*
