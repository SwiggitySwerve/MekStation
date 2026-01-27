# Random Events

> **✅ COMPLETED** — Implemented, merged, and archived. PR #203.

## Audit Corrections

> Applied 2026-01-27 — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | "51 prisoner event types" | "57 prisoner event types" | `PrisonerEvent.java` |
| 2 | "weekly on Mondays" | "fortnightly on Mondays" (every 2 weeks: `WEEK_OF_WEEK_BASED_YEAR % 2 == 0`) | `PrisonerEventManager.java:144` |
| 3 | Commander's Day = March 15 | Commander's Day = June 16 | `CommandersDayAnnouncement.java:66-67` |
| 4 | Freedom Day = July 4 | Freedom Day = March 18 | `FreedomDayAnnouncement.java:68-69` |
| 5 | Winter Holiday = December 25 | Winter Holiday = December 10 & 27 (two dates) | `WinterHolidayAnnouncement.java:69-70` |
| 6 | (missing) PrisonerCaptureStyle.MEKHQ gate | Add: prisoner events require `PrisonerCaptureStyle.MEKHQ` | `PrisonerEventManager.java:156` |
| 7 | "10 contract event types" | "11 contract event types" — add SPORADIC_UPRISINGS | `AtBEventType.java:39` |

## Context

### Original Request
Implement MekHQ's random event system: prisoner events (57 prisoner event types <!-- AUDIT: Corrected from '51'. Source: PrisonerEvent.java --> with severity), life events (births, coming-of-age, celebrations), contract special events (10 types), and the Gray Monday historical event (3132). Events trigger through the day advancement pipeline at daily, weekly, and monthly frequencies.

### Interview Summary
**Key Discussions**:
- Event categories: Prisoner, Life, Contract, Historical
- Prisoner events: ~30 representative types (minor + major), fortnightly on Mondays (every 2 weeks) <!-- AUDIT: Corrected from 'weekly'. Source: PrisonerEventManager.java:144 -->
- Life events: coming-of-age (age 16), calendar celebrations, simplified (no family system)
- Contract events: 10 types checked monthly per active contract
- Gray Monday: optional historical event (3132.08.03–12), 99% balance loss
- Each category has enable/disable toggle
- Events stored as IRandomEvent extending IBaseEvent
- Event definitions as TypeScript constant objects (not YAML)
- Injectable RandomFn for testing

**Research Findings**:
- `PrisonerEvent.java`: 51 event types with major/minor severity
- `PrisonerEventManager.java`: Ransom 10% monthly, capacity system (conv infantry=5, BA=20), prisoner events require PrisonerCaptureStyle.MEKHQ <!-- AUDIT: Added missing requirement. Source: PrisonerEventManager.java:156 -->
- `CampaignNewDayManager.java` (line 444): Prisoner events on Monday or 1st of month
- `AtBContract.java`: 11 contract event types including SPORADIC_UPRISINGS <!-- AUDIT: Corrected from '10'. Source: AtBEventType.java:39 --> checked monthly
- `GrayMonday.java`: 3132.08.03–12, bankruptcy on day 7 (99% balance debited)
- Life events: BirthAnnouncement (50 variants), ComingOfAgeAnnouncement (age 16)
- Calendar celebrations: Commander's Day (June 16 <!-- AUDIT: Corrected from March 15. Source: CommandersDayAnnouncement.java:66-67 -->), Freedom Day (March 18 <!-- AUDIT: Corrected from July 4. Source: FreedomDayAnnouncement.java:68-69 -->), New Year's, Winter Holiday (December 10 & 27 <!-- AUDIT: Corrected from December 25, and note TWO dates. Source: WinterHolidayAnnouncement.java:69-70 -->)
- Riot scenario: 25% chance on Mondays for riot duty contracts

### Metis Review
**Identified Gaps** (addressed):
- No prisoner system in MekStation yet — need IPrisoner interface or reuse IPerson with prisoner flag
- No family system — coming-of-age events simplified to just SPA generation hook
- Birth events require pregnancy system — defer births, keep other life events
- Contract events overlap with Plan 12 contractEvents.ts — Plan 16 defines the general random event framework, Plan 12's contract events plug into it
- Gray Monday needs campaign date tracking to know when to fire

---

## Work Objectives

### Core Objective
Build a random event framework with probability tables, event effect processing, and day processor integration. Implement prisoner events (~30 types), life events (celebrations, coming-of-age), contract special events (10 types), and Gray Monday.

### Concrete Deliverables
- `src/types/campaign/events/randomEventTypes.ts` — Random event interfaces and enums
- `src/lib/campaign/events/eventProbability.ts` — Probability engine with injectable random
- `src/lib/campaign/events/prisonerEvents.ts` — ~30 prisoner event types with effects
- `src/lib/campaign/events/lifeEvents.ts` — Life events (celebrations, coming-of-age)
- `src/lib/campaign/events/grayMonday.ts` — Gray Monday historical event
- `src/lib/campaign/processors/randomEventsProcessor.ts` — Day processor with frequency routing

### Definition of Done
- [x] Random event framework with typed events and probability engine
- [x] ~30 prisoner events (minor + major) with severity and effects
- [x] Life events: 4 calendar celebrations + coming-of-age at 16
- [x] Contract events referenced from Plan 12 (10 types)
- [x] Gray Monday: optional, fires on specific dates in 3132
- [x] Day processor with daily/weekly/monthly routing

### Must Have
- IRandomEvent extending IBaseEvent
- Probability engine with RandomFn
- ~30 prisoner events with minor/major severity
- Prisoner capacity calculation
- 4 calendar celebrations
- Coming-of-age event (age 16)
- Gray Monday event (optional)
- Day processor registered with appropriate frequencies

### Must NOT Have (Guardrails)
- Full 57 prisoner events (start with ~30 representative ones) <!-- AUDIT: Missed in initial correction. Source: PrisonerEvent.java -->
- Birth/pregnancy system
- Family/genealogy events
- Personality generation system
- Detailed prisoner management UI (just event log)
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
16.1 (Types) → 16.2 (Probability) → 16.3 (Prisoner events) → 16.4 (Life events) → 16.5 (Gray Monday) → 16.6 (Processor) → 16.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 16.1 | Foundation types |
| B | 16.2 | Probability engine used by all |
| C | 16.3, 16.4, 16.5 | Event types are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 16.2 | 16.1 | Probability engine needs event types |
| 16.3 | 16.2 | Prisoner events use probability |
| 16.4 | 16.2 | Life events use probability |
| 16.5 | 16.1 | Gray Monday uses event types |
| 16.6 | 16.3-16.5 | Processor orchestrates all |
| 16.7 | 16.6 | UI shows events |

---

## TODOs

- [x] 16.1 Define Random Event Types

  **What to do**:
  - Create `src/types/campaign/events/randomEventTypes.ts`:
    ```typescript
    export enum RandomEventCategory {
      PRISONER = 'prisoner',
      LIFE = 'life',
      CONTRACT = 'contract',
      HISTORICAL = 'historical',
    }

    export enum RandomEventSeverity {
      MINOR = 'minor',
      MAJOR = 'major',
      CRITICAL = 'critical',
    }

    export interface IRandomEvent {
      readonly id: string;
      readonly category: RandomEventCategory;
      readonly severity: RandomEventSeverity;
      readonly title: string;
      readonly description: string;
      readonly effects: readonly IRandomEventEffect[];
      readonly timestamp: string;
    }

    export type IRandomEventEffect =
      | { type: 'morale_change'; value: number }
      | { type: 'financial'; amount: number; description: string }
      | { type: 'prisoner_escape'; percentage: number }
      | { type: 'prisoner_casualty'; count: number }
      | { type: 'scenario_trigger'; scenarioType: string }
      | { type: 'personnel_status_change'; personId: string; newStatus: string }
      | { type: 'xp_award'; personId: string; amount: number }
      | { type: 'notification'; message: string; severity: string };

    export enum PrisonerEventType {
      // Minor events
      ARGUMENT = 'argument', WILD_STORIES = 'wild_stories', CONVERSATIONS = 'conversations',
      RATIONS = 'rations', TRADE = 'trade', VETERAN = 'veteran', GRAFFITI = 'graffiti',
      PRAYER = 'prayer', BARTERING = 'bartering', SONGS = 'songs', PROPAGANDA = 'propaganda',
      PLOTTING = 'plotting', LETTER = 'letter', ILLNESS = 'illness', PARANOIA = 'paranoia',
      SINGING = 'singing', HOLIDAY = 'holiday', WHISPERS = 'whispers',
      SENTIMENTAL_ITEM = 'sentimental_item', PHOTO = 'photo',
      // Major events
      BREAKOUT = 'breakout', RIOT = 'riot', MURDER = 'murder', FIRE = 'fire',
      POISON = 'poison', HOSTAGE = 'hostage', ESCAPE_ROPE = 'escape_rope',
      TUNNEL = 'tunnel', UNDERCOVER = 'undercover', UNITED = 'united',
    }
    ```
  - Add to ICampaignOptions:
    - `useRandomEvents?: boolean` (default true)
    - `usePrisonerEvents?: boolean` (default true)
    - `useLifeEvents?: boolean` (default true)
    - `useContractEvents?: boolean` (default true)
    - `simulateGrayMonday?: boolean` (default false)

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\events\BaseEventInterfaces.ts` — IBaseEvent
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\prisoners\enums\PrisonerEvent.java` — 51 types

  **Acceptance Criteria**:
  - [x] RED: Test RandomEventCategory has 4 values
  - [x] RED: Test PrisonerEventType has ~30 values
  - [x] RED: Test RandomEventSeverity has 3 values
  - [x] GREEN: Types compile
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define random event types and prisoner events`
  - Files: `src/types/campaign/events/randomEventTypes.ts`

---

- [x] 16.2 Implement Event Probability Engine

  **What to do**:
  - Create `src/lib/campaign/events/eventProbability.ts`:
    ```typescript
    export function rollForEvent(
      probability: number, // 0.0 to 1.0
      random: RandomFn
    ): boolean {
      return random() < probability;
    }

    export function selectRandomEvent<T>(
      events: readonly T[],
      random: RandomFn
    ): T {
      const index = Math.floor(random() * events.length);
      return events[index];
    }

    export function selectWeightedEvent<T>(
      events: readonly { item: T; weight: number }[],
      random: RandomFn
    ): T;

    export function isMonday(dateStr: string): boolean;
    export function isFirstOfMonth(dateStr: string): boolean;
    export function isBirthday(birthDate: string, currentDate: string): boolean;
    export function isSpecificDate(month: number, day: number, currentDate: string): boolean;
    ```

  **Parallelizable**: NO (depends on 16.1)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts:114` — RandomFn pattern

  **Acceptance Criteria**:
  - [x] RED: Test rollForEvent with probability 1.0 always returns true
  - [x] RED: Test rollForEvent with probability 0.0 always returns false
  - [x] RED: Test selectRandomEvent is deterministic with seeded random
  - [x] RED: Test isMonday correctly identifies Mondays
  - [x] RED: Test isFirstOfMonth correctly identifies 1st
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement event probability engine`
  - Files: `src/lib/campaign/events/eventProbability.ts`

---

- [x] 16.3 Implement Prisoner Events

  **What to do**:
  - Create `src/lib/campaign/events/prisonerEvents.ts`:
    ```typescript
    export interface IPrisonerCapacity {
      readonly maxCapacity: number;
      readonly currentPrisoners: number;
      readonly overflowPercentage: number;
    }

    export function calculatePrisonerCapacity(campaign: ICampaign): IPrisonerCapacity {
      // Conventional Infantry: 5 prisoners per unit
      // Battle Armor: 20 prisoners per unit
      // Default temp capacity: 100
      // ...
    }

    // Minor event definitions (flavor text, small effects)
    export const MINOR_PRISONER_EVENTS: Record<PrisonerEventType, { title: string; description: string; effects: IRandomEventEffect[] }> = { ... };

    // Major event definitions (escapes, riots, casualties)
    export const MAJOR_PRISONER_EVENTS: Record<PrisonerEventType, { title: string; description: string; effects: IRandomEventEffect[] }> = {
      breakout: { title: 'Prisoner Breakout', description: 'A group of prisoners has broken out!', effects: [{ type: 'prisoner_escape', percentage: 0.2 }] },
      riot: { title: 'Prisoner Riot', description: 'The prisoners have started a riot!', effects: [{ type: 'prisoner_casualty', count: 2 }, { type: 'notification', message: 'Guards injured in riot', severity: 'warning' }] },
      // ... ~10 major events
    };

    export function processPrisonerEvents(
      campaign: ICampaign,
      random: RandomFn
    ): IRandomEvent[] {
      const capacity = calculatePrisonerCapacity(campaign);
      if (capacity.currentPrisoners === 0) return [];

      const events: IRandomEvent[] = [];

      // Monthly: 10% ransom chance
      if (isFirstOfMonth(campaign.currentDate)) {
        if (rollForEvent(0.10, random)) {
          events.push(createRansomEvent(campaign, random));
        }
      }

      // Weekly: random event based on overflow
      if (isMonday(campaign.currentDate)) {
        const eventChance = Math.min(0.5, capacity.overflowPercentage * 0.5);
        if (rollForEvent(eventChance, random)) {
          const isMajor = rollForEvent(0.2, random); // 20% chance of major event
          const event = isMajor ? selectMajorEvent(random) : selectMinorEvent(random);
          events.push(event);
        }
      }

      return events;
    }
    ```

  **Parallelizable**: YES (with 16.4, 16.5)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\prisoners\PrisonerEventManager.java` — Capacity and events
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\prisoners\enums\PrisonerEvent.java` — Event types

  **Acceptance Criteria**:
  - [x] RED: Test prisoner capacity calculated from unit composition
  - [x] RED: Test ransom event fires at 10% monthly
  - [x] RED: Test overflow increases event probability
  - [x] RED: Test major events have escape/casualty effects
  - [x] RED: Test no events when no prisoners
  - [x] RED: Test deterministic with seeded random
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement ~30 prisoner events with capacity system`
  - Files: `src/lib/campaign/events/prisonerEvents.ts`

---

- [x] 16.4 Implement Life Events

  **What to do**:
  - Create `src/lib/campaign/events/lifeEvents.ts`:
    ```typescript
    export interface ICalendarCelebration {
      readonly name: string;
      readonly month: number; // 1-12
      readonly day: number;   // 1-31
      readonly description: string;
    }

    export const CALENDAR_CELEBRATIONS: ICalendarCelebration[] = [
      { name: "New Year's Day", month: 1, day: 1, description: 'The unit celebrates the new year.' },
      { name: "Commander's Day", month: 3, day: 15, description: 'A day honoring the unit commander.' },
      { name: 'Freedom Day', month: 7, day: 4, description: 'Celebrating independence and freedom.' },
      { name: 'Winter Holiday', month: 12, day: 25, description: 'Winter holiday celebrations.' },
    ];

    export function processLifeEvents(
      campaign: ICampaign,
      random: RandomFn
    ): IRandomEvent[] {
      const events: IRandomEvent[] = [];

      // Calendar celebrations
      for (const celebration of CALENDAR_CELEBRATIONS) {
        if (isSpecificDate(celebration.month, celebration.day, campaign.currentDate)) {
          events.push({
            id: generateId(),
            category: RandomEventCategory.LIFE,
            severity: RandomEventSeverity.MINOR,
            title: celebration.name,
            description: celebration.description,
            effects: [{ type: 'notification', message: celebration.name, severity: 'positive' }],
            timestamp: campaign.currentDate,
          });
        }
      }

      // Coming of age (age 16)
      for (const person of campaign.personnel) {
        if (isBirthday(person.birthDate, campaign.currentDate) && calculateAge(person.birthDate, campaign.currentDate) === 16) {
          events.push({
            id: generateId(),
            category: RandomEventCategory.LIFE,
            severity: RandomEventSeverity.MINOR,
            title: 'Coming of Age',
            description: `${person.name} has come of age at 16.`,
            effects: [
              { type: 'notification', message: `${person.name} has come of age`, severity: 'positive' },
              { type: 'xp_award', personId: person.id, amount: 5 },
            ],
            timestamp: campaign.currentDate,
          });
        }
      }

      return events;
    }
    ```

  **Must NOT do**:
  - Birth/pregnancy events (no family system)
  - Personality generation

  **Parallelizable**: YES (with 16.3, 16.5)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\lifeEvents\` — Life event classes

  **Acceptance Criteria**:
  - [x] RED: Test New Year's fires on Jan 1
  - [x] RED: Test Commander's Day fires on Mar 15
  - [x] RED: Test coming-of-age fires on 16th birthday
  - [x] RED: Test no celebration on non-celebration dates
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement life events with celebrations and coming-of-age`
  - Files: `src/lib/campaign/events/lifeEvents.ts`

---

- [x] 16.5 Implement Gray Monday Event

  **What to do**:
  - Create `src/lib/campaign/events/grayMonday.ts`:
    ```typescript
    const GRAY_MONDAY_START = { year: 3132, month: 8, day: 3 };
    const GRAY_MONDAY_END = { year: 3132, month: 8, day: 12 };
    const BANKRUPTCY_DAY = { year: 3132, month: 8, day: 9 };
    const EMPLOYER_BEGGING_DAY = { year: 3132, month: 8, day: 10 };

    export function processGrayMonday(
      campaign: ICampaign
    ): IRandomEvent | null {
      if (!campaign.options.simulateGrayMonday) return null;

      const date = parseDate(campaign.currentDate);

      if (matchesDate(date, BANKRUPTCY_DAY)) {
        return {
          id: generateId(),
          category: RandomEventCategory.HISTORICAL,
          severity: RandomEventSeverity.CRITICAL,
          title: 'Gray Monday - Financial Collapse',
          description: 'The HPG network has collapsed. Your accounts have been seized. 99% of your balance has been debited.',
          effects: [{ type: 'financial', amount: -Math.floor(campaign.balance * 0.99), description: 'Gray Monday bankruptcy' }],
          timestamp: campaign.currentDate,
        };
      }

      if (matchesDate(date, EMPLOYER_BEGGING_DAY)) {
        return {
          id: generateId(),
          category: RandomEventCategory.HISTORICAL,
          severity: RandomEventSeverity.CRITICAL,
          title: 'Gray Monday - Employer Begging',
          description: 'Your employer cannot pay. Contract payments zeroed. Salvage rights set to 100%.',
          effects: [
            { type: 'notification', message: 'Contract payments suspended', severity: 'negative' },
          ],
          timestamp: campaign.currentDate,
        };
      }

      return null;
    }
    ```

  **Parallelizable**: YES (with 16.3, 16.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\GrayMonday.java` — Gray Monday logic

  **Acceptance Criteria**:
  - [x] RED: Test bankruptcy on 3132.08.09 debits 99% balance
  - [x] RED: Test employer begging on 3132.08.10
  - [x] RED: Test no event on non-Gray-Monday dates
  - [x] RED: Test disabled when simulateGrayMonday is false
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement Gray Monday historical event`
  - Files: `src/lib/campaign/events/grayMonday.ts`

---

- [x] 16.6 Register Random Events Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/randomEventsProcessor.ts`:
    ```typescript
    export function processRandomEvents(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IRandomEvent[] } {
      const allEvents: IRandomEvent[] = [];

      // Daily: life events, Gray Monday
      if (campaign.options.useLifeEvents !== false) {
        allEvents.push(...processLifeEvents(campaign, random));
      }
      const grayMondayEvent = processGrayMonday(campaign);
      if (grayMondayEvent) allEvents.push(grayMondayEvent);

      // Weekly (Monday): prisoner events
      if (isMonday(campaign.currentDate) && campaign.options.usePrisonerEvents !== false) {
        allEvents.push(...processPrisonerEvents(campaign, random));
      }

      // Monthly (1st): contract events (from Plan 12)
      if (isFirstOfMonth(campaign.currentDate) && campaign.options.useContractEvents !== false) {
        for (const contract of getActiveContracts(campaign)) {
          allEvents.push(...processContractRandomEvents(contract, campaign, random));
        }
      }

      return { updatedCampaign: applyEventEffects(campaign, allEvents), events: allEvents };
    }
    ```

  **Parallelizable**: NO (depends on 16.3-16.5)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)

  **Acceptance Criteria**:
  - [x] RED: Test life events fire daily
  - [x] RED: Test prisoner events fire on Mondays only
  - [x] RED: Test contract events fire on 1st of month
  - [x] RED: Test Gray Monday fires on correct dates
  - [x] RED: Test disabled categories produce no events
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): register random events day processor`
  - Files: `src/lib/campaign/processors/randomEventsProcessor.ts`

---

- [x] 16.7 Create Random Events UI

  **What to do**:
  - Event log/timeline on campaign dashboard (chronological, filterable by category)
  - Event notification toasts with severity coloring (minor=blue, major=orange, critical=red)
  - Prisoner overview panel (if prisoners exist): capacity gauge, recent events
  - Campaign settings: event category toggles, Gray Monday toggle
  - Coming-of-age dialog with SPA hook (tie to Plan 10)

  **Parallelizable**: NO (depends on 16.6)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [x] Event log shows recent events with severity icons
  - [x] Filter by category works
  - [x] Event toasts appear with correct colors
  - [x] Prisoner panel shows capacity and events
  - [x] Settings toggles work
  - [x] Manual verification: dev server → advance days → verify events appear → filter → verify

  **Commit**: YES
  - Message: `feat(ui): add random events log and notification system`
  - Files: event UI components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 16.1 | `feat(campaign): define random event types` | `npm test` |
| 16.2 | `feat(campaign): implement event probability engine` | `npm test` |
| 16.3 | `feat(campaign): implement prisoner events` | `npm test` |
| 16.4 | `feat(campaign): implement life events` | `npm test` |
| 16.5 | `feat(campaign): implement Gray Monday` | `npm test` |
| 16.6 | `feat(campaign): register random events processor` | `npm test` |
| 16.7 | `feat(ui): add event log and notifications` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] Random event framework with typed events
- [x] ~30 prisoner events with capacity system
- [x] 4 calendar celebrations
- [x] Coming-of-age at 16 with XP award
- [x] Gray Monday optional historical event
- [x] Day processor with frequency routing
- [x] Contract events integrated from Plan 12

---

## Registration Snippet

```typescript
registry.register({
  id: 'random-events-processor',
  name: 'Random Events',
  phase: 'events',
  frequency: 'daily', // handles weekly/monthly routing internally
  process: processRandomEvents,
  optionGate: (opts) => opts.useRandomEvents !== false,
});
```

---

## Migration Notes

- New `useRandomEvents` on ICampaignOptions defaults to true (opt-out)
- New `usePrisonerEvents`, `useLifeEvents`, `useContractEvents` default to true
- New `simulateGrayMonday` defaults to false (opt-in — only for campaigns in Dark Age era)
- Random events extend IBaseEvent — stored alongside existing game events
- No prisoner system exists yet — prisoner events only fire if campaign has POW personnel
- Contract events reference Plan 12 — if Plan 12 not built, contract events return empty
- No migration needed — event system is purely additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
