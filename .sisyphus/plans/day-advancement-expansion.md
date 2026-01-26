# Day Advancement Pipeline Expansion

## Context

### Original Request
Refactor MekStation's day advancement system from 3-4 hardcoded processing phases into a plugin/registry architecture where campaign modules self-register daily processors. Fix the critical store integration bug and expand to support 10+ processing phases.

### Interview Summary
**Key Discussions**:
- Plugin/registry pattern chosen over pre-defined slots or hardcoded phases
- This plan is the BACKBONE — all other Phase 2 plans (Turnover, Repair Quality, Financial, Faction Standing) register processors into this pipeline
- Existing `dayAdvancement.ts` has comprehensive logic (402 lines) but store's `advanceDay()` only increments the date (critical bug)
- 1,013 lines of existing tests must be preserved
- TDD approach (RED-GREEN-REFACTOR)

**Research Findings**:
- `src/lib/campaign/dayAdvancement.ts` — Pure functions: `advanceDay()`, `processHealing()`, `processContracts()`, `processDailyCosts()`
- `src/stores/campaign/useCampaignStore.ts:358-380` — Store `advanceDay()` only increments date, does NOT call comprehensive logic
- `src/lib/campaign/__tests__/dayAdvancement.test.ts` — 1,013 lines of tests
- `DayReport` interface already defined with healing events, expired contracts, cost breakdown
- Target is `src/types/campaign/Campaign.ts` ICampaign (NOT `CampaignInterfaces.ts`)

### Metis Review
**Identified Gaps** (addressed):
- Two ICampaign interfaces exist — this plan targets `Campaign.ts` only
- Existing 1,013 test lines must survive the refactor unchanged
- Processor ordering is critical (healing before turnover, costs before financial)
- Multi-day advancement edge case (process each day individually)
- Processor failure handling (skip failing processor, log error, continue)
- Empty campaign handling (zero personnel/units/missions)

---

## Work Objectives

### Core Objective
Refactor the day advancement system into a plugin/registry architecture where campaign modules register processors, fix the store integration bug, and establish the backbone for all Phase 2 systems.

### Concrete Deliverables
- `src/lib/campaign/dayPipeline.ts` — Plugin registry and pipeline orchestrator
- `src/lib/campaign/processors/` — Individual processor implementations
- Updated `src/stores/campaign/useCampaignStore.ts` — Store calls pipeline
- Updated `src/lib/campaign/dayAdvancement.ts` — Refactored to use pipeline
- Tests for all new code + preservation of existing tests

### Definition of Done
- [ ] Plugin registry accepts processor registration
- [ ] Pipeline processes all registered processors in deterministic order
- [ ] Store's `advanceDay()` calls pipeline and applies full DayReport
- [ ] All 1,013 existing test lines pass unchanged
- [ ] New processor can be added without modifying pipeline code
- [ ] DayReport aggregates events from all processors
- [ ] Multi-day advancement works (advance N days = N individual pipeline runs)

### Must Have
- `IDayProcessor` interface with `id`, `phase`, `process()` method
- `DayPipelineRegistry` with `register()`, `getProcessors()`, `processDay()`
- Three built-in processors: healing, contracts, dailyCosts
- Store bug fix: call pipeline instead of just incrementing date
- DayReport aggregation from all processor results

### Must NOT Have (Guardrails)
- Async processors (keep everything synchronous)
- Middleware chains or interceptors
- Priority-based ordering beyond defined phases
- Event bus for processor communication (processors are pure functions)
- Import from `src/types/campaign/CampaignInterfaces.ts` (wrong campaign system)
- Modification of `DayReport` interface shape (consumed by UI)
- Merging `processHealing`, `processContracts`, `processDailyCosts` into monolith

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Jest configured)
- **User wants tests**: TDD (RED-GREEN-REFACTOR)
- **Framework**: Jest + React Testing Library

---

## Task Flow

```
1.1 (IDayProcessor interface) → 1.2 (Registry) → 1.3 (Refactor existing processors) → 1.4 (Store bug fix) → 1.5 (Multi-day) → 1.6 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1.1, 1.2 | Interface and registry can be developed together |

| Task | Depends On | Reason |
|------|------------|--------|
| 1.3 | 1.1, 1.2 | Needs interface and registry to refactor into |
| 1.4 | 1.3 | Store needs refactored pipeline to call |
| 1.5 | 1.4 | Multi-day needs working single-day first |
| 1.6 | 1.5 | UI needs everything working |

---

## TODOs

- [ ] 1.1 Define IDayProcessor Interface and Pipeline Types

  **What to do**:
  - Create `src/lib/campaign/dayPipeline.ts`
  - Define the core interface:
    ```typescript
    export enum DayPhase {
      SETUP = 0,          // Pre-processing setup
      PERSONNEL = 100,    // Personnel: healing, medical, education
      FACILITIES = 200,   // Facilities: field kitchen, MASH
      MARKETS = 300,      // Market refreshes
      MISSIONS = 400,     // Contract/scenario processing
      UNITS = 500,        // Maintenance, parts, refits
      FORCES = 600,       // Force processing, combat teams
      FINANCES = 700,     // Financial processing (salaries, taxes)
      EVENTS = 800,       // Random events, faction standing
      CLEANUP = 900,      // Cleanup and reporting
    }

    export interface IDayProcessorResult {
      readonly events: readonly IDayEvent[];
      readonly campaign: ICampaign;
    }

    export interface IDayEvent {
      readonly type: string;
      readonly description: string;
      readonly severity: 'info' | 'warning' | 'critical';
      readonly data?: Record<string, unknown>;
    }

    export interface IDayProcessor {
      readonly id: string;
      readonly phase: DayPhase;
      readonly displayName: string;
      process(campaign: ICampaign, date: Date): IDayProcessorResult;
    }
    ```
  - Define `IDayPipelineResult` that aggregates all processor results:
    ```typescript
    export interface IDayPipelineResult {
      readonly date: Date;
      readonly events: readonly IDayEvent[];
      readonly campaign: ICampaign;
      readonly processorsRun: readonly string[];
    }
    ```
  - Ensure `IDayEvent` is generic enough to represent healing events, cost events, turnover events, etc.

  **Must NOT do**:
  - Async processor interface
  - Middleware or interceptor patterns
  - Priority within same phase (order by registration for now)

  **Parallelizable**: YES (with 1.2)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:86-97` — Existing `DayReport` interface (preserve compatibility)
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — Target `ICampaign` interface
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java:234-502` — MekHQ's 24-phase ordering (reference for DayPhase enum values)
  - `.sisyphus/drafts/mekhq-modifier-systems.md:32-59` — Day advancement pipeline phases

  **Acceptance Criteria**:
  - [ ] RED: Test `IDayProcessor` interface type constraints compile
  - [ ] RED: Test `DayPhase` enum has correct ordering (SETUP < PERSONNEL < ... < CLEANUP)
  - [ ] GREEN: All types defined and exported
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define IDayProcessor interface and pipeline types`
  - Files: `src/lib/campaign/dayPipeline.ts`

---

- [ ] 1.2 Implement DayPipelineRegistry

  **What to do**:
  - In `src/lib/campaign/dayPipeline.ts`, add the registry:
    ```typescript
    export class DayPipelineRegistry {
      private processors: IDayProcessor[] = [];
      
      register(processor: IDayProcessor): void
      unregister(id: string): void
      getProcessors(): readonly IDayProcessor[]
      getProcessorsByPhase(phase: DayPhase): readonly IDayProcessor[]
      
      processDay(campaign: ICampaign): IDayPipelineResult
    }
    ```
  - `processDay()` implementation:
    1. Sort processors by `phase` (ascending)
    2. For each processor, call `process(campaign, date)` with the CURRENT campaign state
    3. Each processor returns updated campaign + events
    4. Pass updated campaign to next processor (chain)
    5. Aggregate all events into `IDayPipelineResult`
    6. If a processor throws, log error, skip it, continue with unchanged campaign
    7. Advance date by 1 day AFTER all processors run
  - Create singleton instance:
    ```typescript
    const pipelineRegistry = createSingleton(() => new DayPipelineRegistry());
    export function getDayPipeline(): DayPipelineRegistry { return pipelineRegistry.get(); }
    export function _resetDayPipeline(): void { pipelineRegistry.reset(); }
    ```
  - Add `isFirstOfMonth(date)`, `isMonday(date)`, `isFirstOfYear(date)` helper functions for frequency-gated processors

  **Must NOT do**:
  - Async processing
  - Event bus between processors
  - Circular dependency on stores

  **Parallelizable**: YES (with 1.1)

  **References**:
  - `E:\Projects\MekStation\src\services\core\createSingleton.ts` — Singleton factory pattern to follow
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:361-401` — Current `advanceDay()` orchestration (replace with pipeline)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java` — MekHQ's phase ordering reference

  **Acceptance Criteria**:
  - [ ] RED: Test `register()` adds processor, `getProcessors()` returns it sorted by phase
  - [ ] RED: Test `processDay()` calls processors in phase order
  - [ ] RED: Test processor failure doesn't crash pipeline (skip and continue)
  - [ ] RED: Test events from all processors are aggregated
  - [ ] RED: Test date advances by 1 day after all processors
  - [ ] GREEN: All tests pass
  - [ ] REFACTOR: Clean up any duplication
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement DayPipelineRegistry`
  - Files: `src/lib/campaign/dayPipeline.ts`, `src/lib/campaign/__tests__/dayPipeline.test.ts`

---

- [ ] 1.3 Refactor Existing Processors into Pipeline

  **What to do**:
  - Create `src/lib/campaign/processors/` directory
  - Extract `processHealing` → `src/lib/campaign/processors/healingProcessor.ts`:
    ```typescript
    export const healingProcessor: IDayProcessor = {
      id: 'healing',
      phase: DayPhase.PERSONNEL,
      displayName: 'Personnel Healing',
      process(campaign, date) {
        const result = processHealing(campaign.personnel);
        // Convert HealedPersonEvent[] to IDayEvent[]
        // Return updated campaign with healed personnel
      }
    };
    ```
  - Extract `processContracts` → `src/lib/campaign/processors/contractProcessor.ts`
  - Extract `processDailyCosts` → `src/lib/campaign/processors/dailyCostsProcessor.ts`
  - Register all three in a `registerBuiltinProcessors()` function
  - Update `dayAdvancement.ts` to use the pipeline:
    ```typescript
    export function advanceDay(campaign: ICampaign): DayReport {
      const pipeline = getDayPipeline();
      const result = pipeline.processDay(campaign);
      // Convert IDayPipelineResult to DayReport (backward compatibility)
      return convertToLegacyDayReport(result);
    }
    ```
  - **CRITICAL**: Keep existing `processHealing`, `processContracts`, `processDailyCosts` as exported functions (they're used in tests). The processor wrappers call them internally.
  - Create `convertToLegacyDayReport()` that maps `IDayPipelineResult` → `DayReport` for backward compatibility:
    ```typescript
    export function convertToLegacyDayReport(result: IDayPipelineResult): DayReport {
      return {
        date: result.date,
        healedPersonEvents: result.events
          .filter(e => e.type === 'healing')
          .map(e => e.data as HealedPersonEvent),
        expiredContracts: result.events
          .filter(e => e.type === 'contract_expired')
          .map(e => e.data as ExpiredContractEvent),
        dailyCosts: result.events
          .find(e => e.type === 'daily_costs')
          ?.data as DailyCostBreakdown ?? { salaries: Money.ZERO, maintenance: Money.ZERO, total: Money.ZERO },
        campaign: result.campaign,
        allEvents: result.events,  // NEW: Pass-through for Phase 2+ processors
      };
    }
    ```
    **Note**: Each builtin processor must set `event.type` to the legacy type string ('healing', 'contract_expired', 'daily_costs') so this mapping works. Phase 2+ processor events flow through `allEvents`.

  **Must NOT do**:
  - Delete existing function exports (tests depend on them)
  - Change function signatures of `processHealing`, `processContracts`, `processDailyCosts`
  - Modify existing test file `dayAdvancement.test.ts`

  **Parallelizable**: NO (depends on 1.1, 1.2)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:116-185` — `processHealing()` function to extract
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:200-236` — `processContracts()` function to extract
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:254-334` — `processDailyCosts()` function to extract
  - `E:\Projects\MekStation\src\lib\campaign\__tests__\dayAdvancement.test.ts` — 1,013 lines of tests that MUST continue to pass
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:42-97` — DayReport, HealedPersonEvent, ExpiredContractEvent, DailyCostBreakdown types

  **Acceptance Criteria**:
  - [ ] RED: Test `healingProcessor.process()` returns correct events for wounded personnel
  - [ ] RED: Test `contractProcessor.process()` returns correct events for expired contracts
  - [ ] RED: Test `dailyCostsProcessor.process()` returns correct cost events
  - [ ] RED: Test `registerBuiltinProcessors()` registers all three processors
  - [ ] GREEN: All new tests pass
  - [ ] **CRITICAL**: All 1,013 existing lines in `dayAdvancement.test.ts` pass without modification
  - [ ] `npm test` passes (entire test suite)

  **Commit**: YES
  - Message: `refactor(campaign): extract day processors into plugin architecture`
  - Files: `src/lib/campaign/processors/*.ts`, `src/lib/campaign/dayAdvancement.ts`
  - Pre-commit: `npm test`

---

- [ ] 1.4 Fix Store Integration Bug

  **What to do**:
  - Update `src/stores/campaign/useCampaignStore.ts` `advanceDay()` action (currently lines 358-380)
  - Replace simple date increment with full pipeline call:
    ```typescript
    advanceDay: () => {
      const { campaign } = get();
      if (!campaign) return null;
      
      // Ensure builtin processors are registered
      registerBuiltinProcessors();
      
      const report = advanceDay(campaign);  // Uses pipeline internally
      
      set({ campaign: report.campaign });
      get().saveCampaign();
      
      return report;  // Return DayReport for UI consumption
    }
    ```
  - Update the action's return type to include `DayReport | null`
  - Ensure the store's `advanceDay()` also persists the updated campaign
  - Add store test verifying full pipeline execution (healing, costs, contracts)

  **Must NOT do**:
  - Change the store's persistence pattern
  - Bypass the pure function pipeline (all logic in `dayAdvancement.ts`, not in store)

  **Parallelizable**: NO (depends on 1.3)

  **References**:
  - `E:\Projects\MekStation\src\stores\campaign\useCampaignStore.ts:358-380` — Current buggy `advanceDay()` that only increments date
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts` — `advanceDay()` pure function to call
  - `E:\Projects\MekStation\src\stores\campaign/__tests__/useCampaignStore.test.ts` — Existing store tests

  **Acceptance Criteria**:
  - [ ] RED: Test store `advanceDay()` processes healing (wounded person heals)
  - [ ] RED: Test store `advanceDay()` deducts daily costs from balance
  - [ ] RED: Test store `advanceDay()` expires completed contracts
  - [ ] RED: Test store `advanceDay()` returns DayReport with events
  - [ ] RED: Test store `advanceDay()` persists campaign after processing
  - [ ] GREEN: All tests pass
  - [ ] Verify: Start dev server, create campaign, add personnel, advance day — verify costs deducted and healing works
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `fix(campaign): store advanceDay now calls full day pipeline`
  - Files: `src/stores/campaign/useCampaignStore.ts`
  - Pre-commit: `npm test`

---

- [ ] 1.5 Implement Multi-Day Advancement

  **What to do**:
  - Add `advanceDays(campaign: ICampaign, count: number): DayReport[]` to `dayAdvancement.ts`
  - Process each day individually (NOT batch) to match MekHQ behavior
  - Each day uses the campaign state returned by the previous day
  - Return array of DayReports (one per day)
  - Add store action `advanceDays(count: number): DayReport[]`
  - Add "Advance Week" and "Advance Month" buttons to UI (calls advanceDays with 7 or 30)
  - Handle edge case: if campaign runs out of money mid-advance, continue processing but flag warning

  **Must NOT do**:
  - Batch processing (skip days or aggregate)
  - Stop advancement on negative balance (MekHQ continues)

  **Parallelizable**: NO (depends on 1.4)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:361-401` — Current single-day `advanceDay()`
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java` — MekHQ processes each day individually

  **Acceptance Criteria**:
  - [ ] RED: Test `advanceDays(campaign, 7)` returns 7 DayReports
  - [ ] RED: Test each day uses previous day's campaign state (chained processing)
  - [ ] RED: Test negative balance doesn't stop advancement
  - [ ] RED: Test healing progresses correctly over multiple days
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add multi-day advancement`
  - Files: `src/lib/campaign/dayAdvancement.ts`, `src/stores/campaign/useCampaignStore.ts`

---

- [ ] 1.6 Update Campaign Dashboard UI

  **What to do**:
  - Update `src/pages/gameplay/campaigns/[id]/index.tsx` to display DayReport results after advancing
  - Show day report as a notification/summary panel:
    - Personnel healed (list names + injuries)
    - Contracts expired (list names)
    - Daily costs breakdown (salaries, maintenance, total)
    - Any warnings (negative balance, etc.)
  - Add "Advance Week" and "Advance Month" buttons alongside "Advance Day"
  - For multi-day advancement, show aggregated summary (total costs, all events)
  - Add campaign options to ICampaignOptions:
    ```typescript
    enableDayReportNotifications: boolean;  // Show day reports (default: true)
    ```

  **Must NOT do**:
  - Full day report history page (defer)
  - Animated transitions between days

  **Parallelizable**: NO (depends on 1.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx:64-66` — Current `handleAdvanceDay()` callback
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx:140-146` — Current "Advance Day" button
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:86-97` — `DayReport` interface for display

  **Acceptance Criteria**:
  - [ ] Advance Day button shows DayReport summary after clicking
  - [ ] Advance Week/Month buttons visible and functional
  - [ ] Cost breakdown displayed (salaries, maintenance, total)
  - [ ] Healed personnel listed by name
  - [ ] Expired contracts listed by name
  - [ ] Negative balance warning shown
  - [ ] Manual verification: dev server → campaign → advance day → verify report displays

  **Commit**: YES
  - Message: `feat(ui): display day advancement reports in campaign dashboard`
  - Files: `src/pages/gameplay/campaigns/[id]/index.tsx`, `src/components/campaign/DayReportPanel.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1.1 | `feat(campaign): define IDayProcessor interface and pipeline types` | dayPipeline.ts | `npm test` |
| 1.2 | `feat(campaign): implement DayPipelineRegistry` | dayPipeline.ts, tests | `npm test` |
| 1.3 | `refactor(campaign): extract day processors into plugin architecture` | processors/*.ts, dayAdvancement.ts | `npm test` (ALL existing tests) |
| 1.4 | `fix(campaign): store advanceDay now calls full day pipeline` | useCampaignStore.ts | `npm test` + manual verify |
| 1.5 | `feat(campaign): add multi-day advancement` | dayAdvancement.ts, store | `npm test` |
| 1.6 | `feat(ui): display day advancement reports in campaign dashboard` | pages, components | Manual verify |

---

## Success Criteria

### Verification Commands
```bash
npm test                    # ALL tests pass (including 1,013 existing lines)
npm run build              # Build succeeds
npm run dev                # Dev server starts, campaign advancement works
```

### Final Checklist
- [ ] All 1,013 existing `dayAdvancement.test.ts` lines pass
- [ ] Pipeline registry accepts new processors without code changes
- [ ] Store `advanceDay()` processes healing, costs, contracts
- [ ] Multi-day advancement works correctly
- [ ] UI displays day reports
- [ ] New processor can be registered by other Phase 2 plans

---

## Registration Bootstrap

**IMPORTANT**: `registerBuiltinProcessors()` must be called during campaign initialization (in the store or app startup),
NOT at module import time. This ensures deterministic registration order. Example:

```typescript
// In useCampaignStore.ts or campaign initialization:
import { registerBuiltinProcessors } from '@/lib/campaign/dayPipeline';

function initializeCampaign() {
  registerBuiltinProcessors();  // Healing, Contracts, DailyCosts
  // Phase 2 processors register themselves when their modules are imported
}
```

## Registration Snippet (For Other Plans)

Other Phase 2 plans (Turnover, Repair Quality, Financial, Faction Standing) will register their processors like this:

```typescript
import { getDayPipeline, DayPhase, type IDayProcessor } from '@/lib/campaign/dayPipeline';

export const turnoverProcessor: IDayProcessor = {
  id: 'turnover',
  phase: DayPhase.PERSONNEL,  // or appropriate phase
  displayName: 'Turnover Check',
  process(campaign, date) {
    // Turnover logic here
    return { events: [...], campaign: updatedCampaign };
  }
};

// Register during module initialization
getDayPipeline().register(turnoverProcessor);
```

---

## Migration Notes

- Existing saved campaigns will work unchanged (no schema changes)
- Store's `advanceDay()` now returns `DayReport` (was void) — UI code needs to handle this
- `processHealing`, `processContracts`, `processDailyCosts` remain exported (backward compatible)
- New `ICampaignOptions` field `enableDayReportNotifications` defaults to `true`

---

*Plan generated by Prometheus. Execute with `/start-work`.*
