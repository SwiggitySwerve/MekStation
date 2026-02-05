# Implementation Tasks: Random Events System

## 1. Foundation - Event Types and Probability

- [ ] 1.1 Define RandomEventCategory enum (PRISONER, LIFE, CONTRACT, HISTORICAL)
- [ ] 1.2 Define RandomEventSeverity enum (MINOR, MAJOR, CRITICAL)
- [ ] 1.3 Define IRandomEvent interface extending IBaseEvent
- [ ] 1.4 Define IRandomEventEffect union type (8 effect types)
- [ ] 1.5 Define PrisonerEventType enum (~30 event types)
- [ ] 1.6 Add 5 event toggles to ICampaignOptions
- [ ] 1.7 Implement probability engine (rollForEvent, selectRandomEvent, selectWeightedEvent)
- [ ] 1.8 Implement date helpers (isMonday, isFirstOfMonth, isBirthday, isSpecificDate)

## 2. Prisoner Events

- [ ] 2.1 Define IPrisonerCapacity interface
- [ ] 2.2 Implement calculatePrisonerCapacity (conventional infantry=5, BA=20)
- [ ] 2.3 Define MINOR_PRISONER_EVENTS constant (~20 minor events)
- [ ] 2.4 Define MAJOR_PRISONER_EVENTS constant (~10 major events)
- [ ] 2.5 Implement processPrisonerEvents (weekly on Monday, monthly ransom)
- [ ] 2.6 Implement overflow-based event probability
- [ ] 2.7 Implement 20% major event chance

## 3. Life Events

- [ ] 3.1 Define ICalendarCelebration interface
- [ ] 3.2 Define CALENDAR_CELEBRATIONS constant (4 celebrations)
- [ ] 3.3 Implement processLifeEvents (daily check for celebrations)
- [ ] 3.4 Implement coming-of-age event (age 16 birthday)
- [ ] 3.5 Implement XP award for coming-of-age

## 4. Gray Monday Historical Event

- [ ] 4.1 Define Gray Monday date constants (3132.08.03-12)
- [ ] 4.2 Implement processGrayMonday (bankruptcy on day 7)
- [ ] 4.3 Implement 99% balance debit effect
- [ ] 4.4 Implement employer begging event (day 8)
- [ ] 4.5 Gate behind simulateGrayMonday option

## 5. Random Events Day Processor

- [ ] 5.1 Create randomEventsProcessor with id='random-events'
- [ ] 5.2 Implement daily routing (life events, Gray Monday)
- [ ] 5.3 Implement weekly routing (prisoner events on Monday)
- [ ] 5.4 Implement monthly routing (contract events on 1st)
- [ ] 5.5 Integrate with day pipeline registry
- [ ] 5.6 Emit events for all random event outcomes
- [ ] 5.7 Apply event effects to campaign state

## 6. Contract Events Integration

- [ ] 6.1 Define contract event types (reference Plan 12)
- [ ] 6.2 Implement processContractRandomEvents stub
- [ ] 6.3 Document Plan 12 dependency

## 7. Event Log UI

- [ ] 7.1 Create RandomEventsPanel component (event log)
- [ ] 7.2 Implement chronological event display
- [ ] 7.3 Implement category filtering (prisoner, life, contract, historical)
- [ ] 7.4 Implement severity coloring (minor=blue, major=orange, critical=red)
- [ ] 7.5 Create event notification toasts
- [ ] 7.6 Create prisoner overview panel (capacity gauge, recent events)
- [ ] 7.7 Add event category toggles to campaign settings
- [ ] 7.8 Add Gray Monday toggle to campaign settings

## 8. Testing

- [ ] 8.1 Test probability engine (deterministic with seeded random)
- [ ] 8.2 Test prisoner events (capacity, overflow, ransom)
- [ ] 8.3 Test life events (celebrations, coming-of-age)
- [ ] 8.4 Test Gray Monday (date triggers, effects)
- [ ] 8.5 Test day processor (frequency routing, event emission)
- [ ] 8.6 Test event effects application
- [ ] 8.7 Test UI components (event log, filtering, toasts)

## 9. Documentation

- [ ] 9.1 Update day-progression spec with random events processor
- [ ] 9.2 Document prisoner capacity calculation
- [ ] 9.3 Document event probability formulas
- [ ] 9.4 Document Gray Monday mechanics
- [ ] 9.5 Add examples to random-events spec
