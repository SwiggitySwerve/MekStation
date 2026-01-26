# Implementation Tasks

**NOTE**: This is a retroactive OpenSpec change documenting work already completed. All tasks below were completed in PR #172 (merged 2026-01-26).

## 1. Core Architecture ✅ DONE

- [x] 1.1 Define `IDayProcessor` interface, `DayPhase` enum, `IDayEvent`, `IDayPipelineResult` types
- [x] 1.2 Implement `DayPipelineRegistry` with `register()`, `unregister()`, `getProcessors()`, `processDay()`
- [x] 1.3 Create singleton via `createSingleton()` pattern
- [x] 1.4 Write 29 tests for pipeline and registry

## 2. Processor Extraction ✅ DONE

- [x] 2.1 Create `src/lib/campaign/processors/healingProcessor.ts` wrapping `processHealing()`
- [x] 2.2 Create `src/lib/campaign/processors/contractProcessor.ts` wrapping `processContracts()`
- [x] 2.3 Create `src/lib/campaign/processors/dailyCostsProcessor.ts` wrapping `processDailyCosts()`
- [x] 2.4 Create `src/lib/campaign/processors/index.ts` with `registerBuiltinProcessors()`
- [x] 2.5 Write 12 tests for processor wrappers and registration
- [x] 2.6 Preserve all 45 existing `dayAdvancement.test.ts` tests unchanged

## 3. Store Integration ✅ DONE

- [x] 3.1 Fix `useCampaignStore.advanceDay()` to call `advanceDayPure()` instead of just incrementing date
- [x] 3.2 Update return type to `DayReport | null`
- [x] 3.3 Add `advanceDays(count: number)` store action
- [x] 3.4 Verify all 56 store tests pass

## 4. Multi-Day Advancement ✅ DONE

- [x] 4.1 Implement `advanceDays(campaign, count)` pure function
- [x] 4.2 Chain campaign state between days
- [x] 4.3 Write 5 tests for multi-day processing

## 5. UI Integration ✅ DONE

- [x] 5.1 Create `DayReportPanel` component with cost breakdown, healed personnel, expired contracts
- [x] 5.2 Add "Advance Week" (7 days) and "Advance Month" (30 days) buttons to dashboard
- [x] 5.3 Add `enableDayReportNotifications: boolean` to `ICampaignOptions` (default: true)
- [x] 5.4 Implement multi-day summary aggregation in panel

## 6. Verification ✅ DONE

- [x] 6.1 All 364 tests pass
- [x] 6.2 Type-check clean
- [x] 6.3 Build succeeds
- [x] 6.4 PR checks pass
- [x] 6.5 PR #172 merged to main
