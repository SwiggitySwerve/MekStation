# Implementation Tasks

## 1. Core Turnover System

- [ ] 1.1 Implement 19 turnover modifier functions
  - Create `src/lib/campaign/turnover/modifiers/` directory
  - Implement 9 real modifiers (founder, age, injury, officer, mission status, service contract, skill desirability, recent promotion, base target)
  - Implement 10 stub modifiers (fatigue, HR strain, management skill, shares, unit rating, hostile territory, loyalty, faction campaign, faction origin, family)
  - Each stub returns 0 with `@stub` JSDoc tag
  - Create `TurnoverModifierResult` type with modifierId, displayName, value, isStub
  - Acceptance: All modifier tests pass, stubs clearly marked

- [ ] 1.2 Implement core turnover check
  - Create `src/lib/campaign/turnover/turnoverCheck.ts`
  - Implement `roll2d6(random: RandomFn)` for testable dice rolls
  - Implement `checkTurnover(person, campaign, random)` returning `TurnoverCheckResult`
  - Logic: skip non-ACTIVE, skip commander if immune, calculate 19 modifiers, roll 2d6, determine pass/fail
  - Departure type: deserted if roll < TN-4, else retired
  - Implement `getPersonMonthlySalary()` stub (returns 1000 C-bills)
  - Payout calculation: salary × configurable multiplier
  - Implement `runTurnoverChecks()` for batch processing
  - Acceptance: Deterministic tests with seeded random pass, commander immunity works, payout calculated correctly

- [ ] 1.3 Extend Person with turnover fields
  - Add optional fields to `IPerson` in `src/types/campaign/Person.ts`:
    - `lastPromotionDate?: Date`
    - `serviceContractEndDate?: Date`
    - `departureDate?: Date`
    - `departureReason?: string`
  - Update `createDefaultPerson()` factory (all undefined by default)
  - Acceptance: Existing campaigns load without migration, new fields available

- [ ] 1.4 Create turnover day processor
  - Create `src/lib/campaign/processors/turnoverProcessor.ts`
  - Implement as `IDayProcessor` with phase PERSONNEL
  - Implement `shouldRunTurnover()` frequency gate (weekly/monthly/quarterly/annually)
  - Implement `applyTurnoverResults()` to update personnel status (ACTIVE → RETIRED/DESERTED)
  - Record payout as financial transaction
  - Set departure date on person
  - Export `registerTurnoverProcessor()` function
  - Acceptance: Processor runs on correct frequency, skips wrong days, updates status correctly

- [ ] 1.5 Add turnover campaign options
  - Extend `ICampaignOptions` in `src/types/campaign/Campaign.ts`:
    - `useTurnover: boolean` (default: true)
    - `turnoverFixedTargetNumber: number` (default: 3)
    - `turnoverCheckFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'never'` (default: 'monthly')
    - `turnoverCommanderImmune: boolean` (default: true)
    - `turnoverPayoutMultiplier: number` (default: 12)
    - `turnoverUseSkillModifiers: boolean` (default: true)
    - `turnoverUseAgeModifiers: boolean` (default: true)
    - `turnoverUseMissionStatusModifiers: boolean` (default: true)
  - Update `createDefaultCampaignOptions()` with defaults
  - Acceptance: All options have sensible defaults, existing campaigns deserialize

- [ ] 1.6 Create turnover report UI
  - Create `src/components/campaign/TurnoverReportPanel.tsx`
  - Display departed personnel with name, role, departure type
  - Expandable modifier breakdown (all 19 modifiers with values)
  - Show roll result vs target number
  - Show payout amount
  - Integrate into campaign dashboard DayReportPanel
  - Add turnover options to campaign settings UI
  - Acceptance: Manual verification in dev server, turnover events display correctly

## 2. Testing

- [ ] 2.1 Write comprehensive tests
  - Test each modifier function with exact MekHQ values
  - Test core check with deterministic random
  - Test commander immunity
  - Test frequency gates
  - Test status transitions
  - Test payout calculations
  - Acceptance: 100% test pass rate, TDD approach maintained

## 3. Documentation

- [ ] 3.1 Update documentation
  - Document turnover system in campaign guide
  - Document stub modifiers and future expansion
  - Document configuration options
  - Acceptance: Clear documentation for users and future developers
