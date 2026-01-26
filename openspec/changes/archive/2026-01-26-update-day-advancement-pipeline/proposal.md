# Change: Day Advancement Pipeline with Plugin Registry

## Why

The original day advancement system hardcoded 3 processing phases (healing, contracts, daily costs) directly in sequence. This design was inflexible and made it impossible for future campaign systems (turnover, repair quality, financial, faction standing, etc.) to hook into the daily processing without modifying core files.

Additionally, a critical bug existed where `useCampaignStore.advanceDay()` only incremented the date without calling the comprehensive processing logic, meaning healing, contract payments, and costs were never actually applied.

## What Changes

**BREAKING**: None (backward compatible enhancement)

- Replaced hardcoded 3-phase processing with a plugin/registry architecture
- Created `DayPipelineRegistry` where campaign modules register `IDayProcessor` plugins
- Defined 10 processing phases (SETUP → PERSONNEL → FACILITIES → MARKETS → MISSIONS → UNITS → FORCES → FINANCES → EVENTS → CLEANUP)
- Extracted existing logic into three processors: `healingProcessor`, `contractProcessor`, `dailyCostsProcessor`
- Fixed critical store bug: `advanceDay()` now calls the full pipeline
- Added multi-day advancement: `advanceDays(count)` processes N days with chained state
- Added `DayReportPanel` UI component with "Advance Week" and "Advance Month" buttons
- Added `enableDayReportNotifications` campaign option

## Impact

- **Affected specs**: `day-progression` (core architecture changed from hardcoded to plugin-based)
- **Affected code**:
  - `src/lib/campaign/dayPipeline.ts` (NEW - registry and types)
  - `src/lib/campaign/processors/` (NEW - extracted processors)
  - `src/lib/campaign/dayAdvancement.ts` (MODIFIED - added `advanceDays` and `convertToLegacyDayReport`)
  - `src/stores/campaign/useCampaignStore.ts` (MODIFIED - bug fix, now calls pipeline)
  - `src/types/campaign/Campaign.ts` (MODIFIED - added `enableDayReportNotifications`)
  - `src/components/campaign/DayReportPanel.tsx` (NEW)
  - `src/pages/gameplay/campaigns/[id]/index.tsx` (MODIFIED - UI integration)
- **Test coverage**: 364 tests passing (45 original + 46 new for pipeline/processors/multi-day)
- **Migration**: None required - all existing code continues to work

## Architecture

Future campaign systems register processors like:
```typescript
import { getDayPipeline, DayPhase } from '@/lib/campaign/dayPipeline';

getDayPipeline().register({
  id: 'turnover',
  phase: DayPhase.PERSONNEL,
  displayName: 'Turnover & Retention',
  process(campaign, date) {
    // Process turnover logic
    return { events: [...], campaign: updatedCampaign };
  }
});
```

The pipeline orchestrates all registered processors:
1. Sort by phase (ascending)
2. Execute each processor in order
3. Chain campaign state between processors
4. Aggregate events from all processors
5. Advance date by one day after all processing

This establishes the backbone for all 16 remaining campaign system plans (Plans 2-17).
