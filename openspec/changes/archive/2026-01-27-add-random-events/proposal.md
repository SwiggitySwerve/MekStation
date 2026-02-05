# Change: Random Events System

## Why

MekStation needs a dynamic random event system to simulate the unpredictable nature of mercenary operations. MekHQ includes prisoner events (51 types with severity), life events (births, coming-of-age, celebrations), contract special events (10 types), and historical events like Gray Monday (3132). These events add narrative depth, strategic challenges, and emergent gameplay moments that make campaigns feel alive.

Without random events, campaigns become predictable and mechanical. Players miss out on:

- Prisoner management challenges (escapes, riots, ransoms)
- Personnel life milestones (coming-of-age, celebrations)
- Contract complications (special events during missions)
- Historical simulation (Gray Monday financial collapse)

## What Changes

- **NEW**: Random event framework with typed events and probability engine
- **NEW**: ~30 prisoner events (minor + major) with severity and capacity system
- **NEW**: 4 calendar celebrations + coming-of-age at age 16
- **NEW**: Contract special events (10 types) integrated with contract system
- **NEW**: Gray Monday historical event (optional, 3132.08.03-12)
- **NEW**: Day processor with daily/weekly/monthly routing
- **NEW**: Event log UI with filtering and notification toasts
- **MODIFIED**: ICampaignOptions extended with 5 event toggles
- **MODIFIED**: Day progression pipeline includes random events processor

## Impact

### Affected Specs

- `random-events` (NEW) - Event types, probability engine, event definitions
- `day-progression` (MODIFIED) - Random events processor registration

### Affected Code

- `src/types/campaign/events/randomEventTypes.ts` - Event interfaces and enums
- `src/lib/campaign/events/eventProbability.ts` - Probability and date helpers
- `src/lib/campaign/events/prisonerEvents.ts` - ~30 prisoner event definitions
- `src/lib/campaign/events/lifeEvents.ts` - Calendar celebrations and coming-of-age
- `src/lib/campaign/events/grayMonday.ts` - Gray Monday historical event
- `src/lib/campaign/processors/randomEventsProcessor.ts` - Day processor
- `src/components/campaign/RandomEventsPanel.tsx` - Event log UI
- `src/types/campaign/Campaign.ts` - ICampaignOptions extended

### Breaking Changes

None. All event options default to enabled (opt-out), and the system is purely additive.

### Migration Notes

- New `useRandomEvents` on ICampaignOptions defaults to true (opt-out)
- New `usePrisonerEvents`, `useLifeEvents`, `useContractEvents` default to true
- New `simulateGrayMonday` defaults to false (opt-in for Dark Age campaigns)
- Random events extend IBaseEvent and are stored alongside existing game events
- No prisoner system exists yet — prisoner events only fire if campaign has POW personnel
- Contract events reference Plan 12 — if Plan 12 not built, contract events return empty
- No migration needed — event system is purely additive
