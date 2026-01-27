# day-progression Specification

## Purpose
TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.
## Requirements
### Requirement: Day Advancement
The system SHALL advance the campaign date by one day using a plugin/registry architecture where processors self-register and execute in deterministic phase order, including monthly financial processing on the 1st of each month.

#### Scenario: Advance date by one day
- **GIVEN** a campaign with currentDate 2025-01-15
- **WHEN** advanceDay is called
- **THEN** currentDate is updated to 2025-01-16

#### Scenario: Process multiple daily events via pipeline
- **GIVEN** a campaign with wounded personnel, active contracts, and daily costs
- **WHEN** advanceDay is called
- **THEN** the day pipeline processes all registered processors in phase order, healing is processed, contract payments are credited, daily costs are deducted, and a DayReport is returned

#### Scenario: Day report contains all events
- **GIVEN** a day with healing, payments, and costs
- **WHEN** advanceDay is called
- **THEN** DayReport contains personnelHealed count, contractPayments array, dailyCosts total, date, and allEvents array from all processors

#### Scenario: Process monthly financial events on 1st of month
- **GIVEN** a campaign with currentDate 2025-01-31 and useRoleBasedSalaries enabled
- **WHEN** advanceDay is called
- **THEN** currentDate is updated to 2025-02-01, monthly salaries are processed, overhead is calculated, food and housing costs are deducted, loan payments are made, and taxes are calculated

#### Scenario: Skip monthly financial processing on non-1st days
- **GIVEN** a campaign with currentDate 2025-01-15 and useRoleBasedSalaries enabled
- **WHEN** advanceDay is called
- **THEN** monthly financial processing is skipped and only daily maintenance costs are processed

### Requirement: Personnel Healing
The system SHALL process personnel healing using the selected medical system (Standard/Advanced/Alternate) with doctor skill checks and capacity management.

#### Scenario: Reduce injury duration
- **GIVEN** a wounded person with injury daysToHeal 14
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced based on medical system outcome

#### Scenario: Heal completed injuries
- **GIVEN** a wounded person with injury daysToHeal 1
- **WHEN** advanceDay is called and medical check succeeds
- **THEN** injury daysToHeal becomes 0 and injury is removed from injuries array

#### Scenario: Return to active status
- **GIVEN** a wounded person with last injury healing (daysToHeal 1) and no other injuries
- **WHEN** advanceDay is called and medical check succeeds
- **THEN** person status changes to ACTIVE and daysToWaitForHealing is set to 0

#### Scenario: Multiple injuries heal independently
- **GIVEN** a person with 3 injuries having daysToHeal [5, 10, 15]
- **WHEN** advanceDay is called
- **THEN** each injury is checked independently based on medical system

#### Scenario: Medical system determines healing rate
- **GIVEN** a campaign with medicalSystem set to STANDARD
- **WHEN** advanceDay is called
- **THEN** doctor Medicine skill check determines if injury heals

#### Scenario: Doctor capacity affects treatment
- **GIVEN** a doctor with 30 patients and capacity 25
- **WHEN** advanceDay is called
- **THEN** overload penalty is applied to medical checks

#### Scenario: Natural healing for unassigned patients
- **GIVEN** a patient with no assigned doctor
- **WHEN** advanceDay is called
- **THEN** natural healing check occurs every naturalHealingWaitingPeriod days

### Requirement: Contract Processing
The system SHALL process active contracts checking for expiration and scheduled payments.

#### Scenario: Credit monthly payment
- **GIVEN** an active contract with monthly payment due today
- **WHEN** advanceDay is called
- **THEN** payment amount is credited to campaign finances and transaction is recorded

#### Scenario: Expire completed contract
- **GIVEN** an active contract with endDate yesterday
- **WHEN** advanceDay is called
- **THEN** contract status changes to SUCCESS or FAILED based on completion

#### Scenario: No payment on non-payment days
- **GIVEN** an active contract with next payment in 15 days
- **WHEN** advanceDay is called
- **THEN** no payment is credited

### Requirement: Daily Costs
The system SHALL calculate and deduct daily costs for salaries and maintenance.

#### Scenario: Calculate salary costs
- **GIVEN** a campaign with 10 active personnel and salaryMultiplier 1.0
- **WHEN** daily costs are calculated
- **THEN** salary cost is 5000 C-bills (10 × 500)

#### Scenario: Calculate maintenance costs
- **GIVEN** a campaign with 8 units and maintenanceCostMultiplier 1.0
- **WHEN** daily costs are calculated
- **THEN** maintenance cost is 800 C-bills (8 × 100)

#### Scenario: Deduct total daily costs
- **GIVEN** a campaign with salary costs 5000 and maintenance costs 800
- **WHEN** advanceDay is called
- **THEN** 5800 C-bills are deducted from campaign balance and transaction is recorded

#### Scenario: Respect campaign options
- **GIVEN** a campaign with payForSalaries false
- **WHEN** daily costs are calculated
- **THEN** salary costs are 0 C-bills

### Requirement: Healing Rate Modifiers
The system SHALL apply healing rate multipliers from campaign options.

#### Scenario: Normal healing rate
- **GIVEN** a campaign with healingRateMultiplier 1.0 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 1 to 9

#### Scenario: Faster healing rate
- **GIVEN** a campaign with healingRateMultiplier 2.0 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 2 to 8

#### Scenario: Slower healing rate
- **GIVEN** a campaign with healingRateMultiplier 0.5 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 0.5 (rounds to 0 or 1 based on implementation)

### Requirement: Cost Multipliers
The system SHALL apply cost multipliers from campaign options to daily expenses.

#### Scenario: Increased salary multiplier
- **GIVEN** a campaign with 10 personnel and salaryMultiplier 1.5
- **WHEN** daily costs are calculated
- **THEN** salary cost is 7500 C-bills (10 × 500 × 1.5)

#### Scenario: Reduced maintenance multiplier
- **GIVEN** a campaign with 8 units and maintenanceCostMultiplier 0.5
- **WHEN** daily costs are calculated
- **THEN** maintenance cost is 400 C-bills (8 × 100 × 0.5)

#### Scenario: Combined multipliers
- **GIVEN** a campaign with salaryMultiplier 1.2 and maintenanceCostMultiplier 0.8
- **WHEN** daily costs are calculated
- **THEN** costs reflect both multipliers applied to base rates

### Requirement: Day Report Generation
The system SHALL generate a comprehensive report of all events that occurred during day advancement.

#### Scenario: Report includes personnel healed
- **GIVEN** a day where 3 personnel complete healing
- **WHEN** advanceDay is called
- **THEN** DayReport.personnelHealed is 3

#### Scenario: Report includes contract payments
- **GIVEN** a day with 2 contract payments totaling 150000 C-bills
- **WHEN** advanceDay is called
- **THEN** DayReport.contractPayments contains 2 payment records

#### Scenario: Report includes daily costs
- **GIVEN** a day with 5800 C-bills in costs
- **WHEN** advanceDay is called
- **THEN** DayReport.dailyCosts is 5800

#### Scenario: Report includes date
- **GIVEN** a day advancement to 2025-01-16
- **WHEN** advanceDay is called
- **THEN** DayReport.date is 2025-01-16

### Requirement: Pure Function Design
The system SHALL implement day advancement as a pure function returning a new campaign state.

#### Scenario: Original campaign unchanged
- **GIVEN** a campaign object
- **WHEN** advanceDay is called
- **THEN** the original campaign object is not mutated

#### Scenario: New campaign returned
- **GIVEN** a campaign object
- **WHEN** advanceDay is called
- **THEN** a new campaign object is returned with updated state

#### Scenario: Deterministic with same inputs
- **GIVEN** identical campaign states
- **WHEN** advanceDay is called on both
- **THEN** identical results are produced

### Requirement: Edge Case Handling
The system SHALL handle edge cases in day advancement gracefully.

#### Scenario: No personnel to heal
- **GIVEN** a campaign with no wounded personnel
- **WHEN** advanceDay is called
- **THEN** healing processing completes without errors and DayReport.personnelHealed is 0

#### Scenario: No active contracts
- **GIVEN** a campaign with no active contracts
- **WHEN** advanceDay is called
- **THEN** contract processing completes without errors and DayReport.contractPayments is empty

#### Scenario: Insufficient funds for costs
- **GIVEN** a campaign with balance 1000 and daily costs 5000
- **WHEN** advanceDay is called
- **THEN** costs are still deducted (balance goes negative) or error is raised based on campaign options

#### Scenario: Permanent injuries do not heal
- **GIVEN** a person with permanent injury (permanent: true)
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal remains unchanged

### Requirement: Test Coverage
The system SHALL have comprehensive test coverage for day advancement logic.

#### Scenario: All event types tested
- **GIVEN** day advancement tests
- **WHEN** tests are run
- **THEN** healing, contract payments, daily costs, and date advancement are all covered

#### Scenario: Edge cases tested
- **GIVEN** day advancement tests
- **WHEN** tests are run
- **THEN** edge cases (no personnel, no contracts, negative balance) are covered

#### Scenario: Integration tests verify end-to-end
- **GIVEN** day advancement integration tests
- **WHEN** tests are run
- **THEN** complete day advancement flow is verified with all systems working together

### Requirement: Day Processing Phases
The system SHALL define 10 processing phases executed in deterministic order during day advancement.

#### Scenario: Phase ordering is deterministic
- **GIVEN** processors registered in phases SETUP, PERSONNEL, FACILITIES, MARKETS, MISSIONS, UNITS, FORCES, FINANCES, EVENTS, CLEANUP
- **WHEN** processDay is called
- **THEN** processors execute in ascending phase order (SETUP=0, PERSONNEL=100, ..., CLEANUP=900)

#### Scenario: Multiple processors in same phase
- **GIVEN** two processors both registered in PERSONNEL phase
- **WHEN** processDay is called
- **THEN** processors in the same phase execute in registration order

### Requirement: Processor Registration
The system SHALL provide a registry where day processors can self-register with an id, phase, and process function.

#### Scenario: Register a processor
- **GIVEN** a DayPipelineRegistry instance
- **WHEN** register(processor) is called with a valid IDayProcessor
- **THEN** the processor is added to the registry and will execute during processDay

#### Scenario: Unregister a processor
- **GIVEN** a registered processor with id "healing"
- **WHEN** unregister("healing") is called
- **THEN** the processor is removed and will not execute during processDay

#### Scenario: Get processors by phase
- **GIVEN** processors registered in PERSONNEL and FINANCES phases
- **WHEN** getProcessorsByPhase(DayPhase.PERSONNEL) is called
- **THEN** only processors in PERSONNEL phase are returned

### Requirement: Processor Interface
The system SHALL define an IDayProcessor interface with id, phase, displayName, and process method.

#### Scenario: Processor returns updated campaign state
- **GIVEN** a processor that heals wounded personnel
- **WHEN** process(campaign, date) is called
- **THEN** an IDayProcessorResult is returned with updated campaign and healing events

#### Scenario: Processor is a pure function
- **GIVEN** a processor and a campaign state
- **WHEN** process(campaign, date) is called
- **THEN** the original campaign object is not mutated, and a new campaign state is returned

### Requirement: Campaign State Chaining
The system SHALL pass the updated campaign state from each processor to the next processor in the pipeline.

#### Scenario: Sequential state updates
- **GIVEN** processors A, B, C in phases 100, 200, 300
- **WHEN** processDay is called with initial campaign state S0
- **THEN** processor A receives S0 and returns S1, processor B receives S1 and returns S2, processor C receives S2 and returns S3, and final result contains S3

#### Scenario: Processor failure does not break chain
- **GIVEN** processors A, B, C where B throws an error
- **WHEN** processDay is called
- **THEN** processor A executes, processor B is skipped with error logged, processor C receives state from A, and pipeline completes

### Requirement: Built-in Processors
The system SHALL provide three built-in processors for healing, contracts, and daily costs.

#### Scenario: Healing processor registered
- **GIVEN** registerBuiltinProcessors() is called
- **WHEN** getProcessors() is called
- **THEN** a processor with id "healing" and phase PERSONNEL is registered

#### Scenario: Contract processor registered
- **GIVEN** registerBuiltinProcessors() is called
- **WHEN** getProcessors() is called
- **THEN** a processor with id "contracts" and phase MISSIONS is registered

#### Scenario: Daily costs processor registered
- **GIVEN** registerBuiltinProcessors() is called
- **WHEN** getProcessors() is called
- **THEN** a processor with id "daily_costs" and phase FINANCES is registered

### Requirement: Multi-Day Advancement
The system SHALL provide an advanceDays function that processes multiple days sequentially, chaining campaign state between days.

#### Scenario: Advance multiple days
- **GIVEN** a campaign with currentDate 2025-01-15
- **WHEN** advanceDays(campaign, 7) is called
- **THEN** 7 DayReports are returned, one for each day from 2025-01-16 to 2025-01-22

#### Scenario: Each day uses previous day's state
- **GIVEN** a campaign with 10,000 C-bills and daily costs of 2,000 C-bills
- **WHEN** advanceDays(campaign, 3) is called
- **THEN** day 1 deducts 2,000 (balance 8,000), day 2 deducts 2,000 (balance 6,000), day 3 deducts 2,000 (balance 4,000)

#### Scenario: Negative balance does not stop advancement
- **GIVEN** a campaign with 1,000 C-bills and daily costs of 5,000 C-bills
- **WHEN** advanceDays(campaign, 2) is called
- **THEN** both days process, balance goes to -4,000 after day 1 and -9,000 after day 2, and warning events are generated

### Requirement: Store Integration
The system SHALL integrate the day pipeline into the campaign store's advanceDay action.

#### Scenario: Store calls pipeline
- **GIVEN** a campaign store with a loaded campaign
- **WHEN** store.advanceDay() is called
- **THEN** the day pipeline processes all registered processors, the store's campaign state is updated with the result, and a DayReport is returned

#### Scenario: Store persists updated campaign
- **GIVEN** a campaign store with a loaded campaign
- **WHEN** store.advanceDay() is called
- **THEN** the updated campaign state is persisted to storage after processing

### Requirement: Day Report Panel UI
The system SHALL provide a UI component to display day advancement reports with healing, costs, and contract events.

#### Scenario: Display day report after advancement
- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Day" and day advancement completes
- **THEN** a DayReportPanel is displayed showing personnel healed, contracts expired, and daily costs breakdown

#### Scenario: Advance week button
- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Week"
- **THEN** advanceDays(7) is called and an aggregated summary of all 7 days is displayed

#### Scenario: Advance month button
- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Month"
- **THEN** advanceDays(30) is called and an aggregated summary of all 30 days is displayed

### Requirement: Day Report Notifications Option
The system SHALL provide a campaign option to enable or disable day report notifications.

#### Scenario: Day report notifications enabled
- **GIVEN** a campaign with enableDayReportNotifications set to true
- **WHEN** advanceDay is called
- **THEN** the DayReportPanel is displayed after processing

#### Scenario: Day report notifications disabled
- **GIVEN** a campaign with enableDayReportNotifications set to false
- **WHEN** advanceDay is called
- **THEN** the DayReportPanel is not displayed, but the DayReport is still returned

### Requirement: Singleton Registry Pattern
The system SHALL provide a singleton DayPipelineRegistry instance accessible via getDayPipeline().

#### Scenario: Get singleton instance
- **GIVEN** no prior calls to getDayPipeline()
- **WHEN** getDayPipeline() is called
- **THEN** a DayPipelineRegistry instance is created and returned

#### Scenario: Singleton returns same instance
- **GIVEN** getDayPipeline() has been called once
- **WHEN** getDayPipeline() is called again
- **THEN** the same DayPipelineRegistry instance is returned

#### Scenario: Reset singleton for testing
- **GIVEN** a DayPipelineRegistry with registered processors
- **WHEN** _resetDayPipeline() is called
- **THEN** the singleton is cleared and the next getDayPipeline() call creates a fresh instance

### Requirement: Backward Compatibility
The system SHALL maintain backward compatibility with existing DayReport consumers by providing a conversion function.

#### Scenario: Convert pipeline result to legacy DayReport
- **GIVEN** an IDayPipelineResult with events from healing, contracts, and daily costs processors
- **WHEN** convertToLegacyDayReport(result) is called
- **THEN** a DayReport is returned with healedPersonEvents, expiredContracts, dailyCosts, and allEvents fields

#### Scenario: Existing tests continue to pass
- **GIVEN** 1,013 lines of existing tests in dayAdvancement.test.ts
- **WHEN** the refactor to plugin architecture is complete
- **THEN** all existing tests pass without modification

#### Scenario: Exported functions remain available
- **GIVEN** existing code that imports processHealing, processContracts, processDailyCosts
- **WHEN** the refactor to plugin architecture is complete
- **THEN** these functions remain exported and functional for backward compatibility

### Requirement: Turnover Processor Registration
The system SHALL support registration of a turnover processor in the day pipeline that executes personnel turnover checks at configurable intervals.

#### Scenario: Register turnover processor
- **GIVEN** a campaign with turnover enabled
- **WHEN** the day pipeline is initialized
- **THEN** turnover processor is registered with phase PERSONNEL
- **AND** processor has unique ID "turnover"
- **AND** processor respects campaign turnover options

#### Scenario: Turnover processor executes on schedule
- **GIVEN** a campaign with turnover frequency set to "monthly"
- **WHEN** day advancement reaches the 1st of the month
- **THEN** turnover processor executes
- **AND** all eligible personnel are checked
- **AND** turnover events are generated for departures

### Requirement: Configurable Turnover Frequency
The system SHALL support configurable turnover check frequency with options for weekly, monthly, quarterly, annually, or never.

#### Scenario: Weekly turnover checks
- **GIVEN** a campaign with turnover frequency "weekly"
- **WHEN** day advancement reaches Monday
- **THEN** turnover processor executes
- **AND** checks are performed for all eligible personnel

#### Scenario: Monthly turnover checks
- **GIVEN** a campaign with turnover frequency "monthly"
- **WHEN** day advancement reaches the 1st of any month
- **THEN** turnover processor executes
- **AND** checks are performed for all eligible personnel

#### Scenario: Turnover disabled
- **GIVEN** a campaign with turnover frequency "never"
- **WHEN** day advancement occurs
- **THEN** turnover processor does not execute
- **AND** no turnover checks are performed

#### Scenario: Skip non-scheduled days
- **GIVEN** a campaign with turnover frequency "monthly"
- **WHEN** day advancement reaches the 15th of the month
- **THEN** turnover processor does not execute
- **AND** no turnover checks are performed

### Requirement: Maintenance Processor Registration
The system SHALL support registration of a maintenance processor in the day pipeline that executes equipment maintenance checks at configurable intervals.

#### Scenario: Register maintenance processor
- **GIVEN** a campaign with maintenance enabled
- **WHEN** the day pipeline is initialized
- **THEN** maintenance processor is registered with phase MAINTENANCE
- **AND** processor has unique ID "maintenance"
- **AND** processor respects campaign maintenance options

#### Scenario: Maintenance processor executes on schedule
- **GIVEN** a campaign with maintenance frequency set to "monthly"
- **WHEN** day advancement reaches the 1st of the month
- **THEN** maintenance processor executes
- **AND** all active units are checked
- **AND** maintenance events are generated for failures

### Requirement: Configurable Maintenance Frequency
The system SHALL support configurable maintenance check frequency with options for weekly, monthly, quarterly, annually, or never.

#### Scenario: Weekly maintenance checks
- **GIVEN** a campaign with maintenance frequency "weekly"
- **WHEN** day advancement reaches Monday
- **THEN** maintenance processor executes
- **AND** checks are performed for all active units

#### Scenario: Monthly maintenance checks
- **GIVEN** a campaign with maintenance frequency "monthly"
- **WHEN** day advancement reaches the 1st of any month
- **THEN** maintenance processor executes
- **AND** checks are performed for all active units

#### Scenario: Maintenance disabled
- **GIVEN** a campaign with maintenance frequency "never"
- **WHEN** day advancement occurs
- **THEN** maintenance processor does not execute
- **AND** no maintenance checks are performed

#### Scenario: Skip non-scheduled days
- **GIVEN** a campaign with maintenance frequency "monthly"
- **WHEN** day advancement reaches the 15th of the month
- **THEN** maintenance processor does not execute
- **AND** no maintenance checks are performed

### Requirement: Maintenance Event Generation
The system SHALL generate day events for maintenance check results, including failures, quality changes, and critical failures.

#### Scenario: Generate event for maintenance failure
- **GIVEN** a maintenance check that fails
- **WHEN** maintenance processor completes
- **THEN** day event is generated with type "maintenance_failure"
- **AND** event includes unit ID, quality before/after, and roll details

#### Scenario: Generate event for quality improvement
- **GIVEN** a maintenance check that succeeds with high margin
- **WHEN** maintenance processor completes and quality improves
- **THEN** day event is generated with type "maintenance_quality_improved"
- **AND** event includes unit ID and new quality grade

#### Scenario: Generate event for critical failure
- **GIVEN** a maintenance check that critically fails
- **WHEN** maintenance processor completes
- **THEN** day event is generated with type "maintenance_critical_failure"
- **AND** event includes unit ID, damage details, and quality degradation

### Requirement: Acquisition Day Processing
The system SHALL include an acquisition processor that runs daily to process acquisition rolls and deliveries.

#### Scenario: Acquisition processor runs daily
- **GIVEN** a campaign with useAcquisitionSystem enabled
- **WHEN** advanceDay is called
- **THEN** the acquisition processor attempts pending acquisitions, delivers arrived items, and emits acquisition events

#### Scenario: Acquisition processor is skipped when disabled
- **GIVEN** a campaign with useAcquisitionSystem set to false
- **WHEN** advanceDay is called
- **THEN** the acquisition processor returns immediately without processing

#### Scenario: Acquisition events are emitted
- **GIVEN** a campaign with pending acquisitions
- **WHEN** the acquisition processor runs
- **THEN** events are emitted for successful rolls, failed rolls, and deliveries

### Requirement: Monthly Financial Processing
The system SHALL process monthly financial events on the 1st of each month when role-based salaries are enabled.

#### Scenario: Process monthly salaries
- **GIVEN** a campaign with 10 personnel and useRoleBasedSalaries enabled on 1st of month
- **WHEN** financial processor executes
- **THEN** role-based salaries are calculated for all active personnel and deducted from balance

#### Scenario: Process monthly overhead
- **GIVEN** a campaign with total monthly salary 50,000 C-bills and overhead percent 5 on 1st of month
- **WHEN** financial processor executes
- **THEN** overhead of 2,500 C-bills is deducted from balance

#### Scenario: Process food and housing costs
- **GIVEN** a campaign with 10 personnel on 1st of month
- **WHEN** financial processor executes
- **THEN** food and housing costs are calculated per person based on rank tier and deducted from balance

#### Scenario: Process loan payments
- **GIVEN** a campaign with 2 active loans on 1st of month
- **WHEN** financial processor executes
- **THEN** monthly payments for both loans are deducted from balance and loan balances are updated

#### Scenario: Process taxes
- **GIVEN** a campaign with positive profits and useTaxes enabled on 1st of month
- **WHEN** financial processor executes
- **THEN** taxes are calculated on profits and deducted from balance

#### Scenario: Financial events appear in day report
- **GIVEN** a campaign with monthly financial processing on 1st of month
- **WHEN** advanceDay is called
- **THEN** DayReport contains financial events for salaries, overhead, food/housing, loans, and taxes

### Requirement: Daily Cost Processor Gating
The system SHALL gate the existing daily cost processor to prevent double-deduction when role-based salaries are enabled.

#### Scenario: Daily cost processor skips salaries when role-based enabled
- **GIVEN** a campaign with useRoleBasedSalaries set to true
- **WHEN** daily cost processor executes
- **THEN** salary costs are NOT deducted (handled by monthly financial processor instead)

#### Scenario: Daily cost processor continues maintenance costs
- **GIVEN** a campaign with useRoleBasedSalaries set to true
- **WHEN** daily cost processor executes
- **THEN** daily maintenance costs are still calculated and deducted

#### Scenario: Daily cost processor works normally when role-based disabled
- **GIVEN** a campaign with useRoleBasedSalaries set to false
- **WHEN** daily cost processor executes
- **THEN** both salary and maintenance costs are calculated and deducted as before (fallback mode)

### Requirement: Vocational Training Processing
The system SHALL include a vocational training processor that runs monthly to award XP based on 2d6 rolls.

#### Scenario: Vocational check runs monthly
- **GIVEN** a person with vocationalXPTimer at 30 days
- **WHEN** the vocational processor runs
- **THEN** a 2d6 roll is made against vocationalXPTargetNumber (default 7)
- **AND** on success, vocationalXP (default 1) is awarded
- **AND** the timer resets to 0

#### Scenario: Failed roll resets timer
- **GIVEN** a person rolls below the target number
- **WHEN** processing vocational training
- **THEN** no XP is awarded
- **AND** the timer still resets to 0

#### Scenario: Timer increments daily
- **GIVEN** a person with vocationalXPTimer at 15
- **WHEN** a day advances
- **THEN** the timer increments to 16

### Requirement: Aging Day Processing
The system SHALL include an aging processor that applies milestone effects on birthdays.

#### Scenario: Aging processor runs on birthday
- **GIVEN** a person's birthday is today
- **WHEN** the aging processor runs
- **THEN** the person's age is calculated
- **AND** if crossing a milestone boundary, attribute modifiers are applied
- **AND** aging events are emitted

#### Scenario: Non-birthday skips processing
- **GIVEN** today is not a person's birthday
- **WHEN** the aging processor runs
- **THEN** no modifiers are applied
- **AND** no events are emitted

### Requirement: Monthly Auto-Awards Processor
The system SHALL run auto-award checks on the 1st of each month.

#### Scenario: Monthly auto-award check
- **GIVEN** a campaign advancing to the 1st of the month
- **WHEN** the auto-awards processor runs
- **THEN** all enabled award categories are checked
- **AND** eligible personnel are processed
- **AND** qualifying awards are granted automatically

#### Scenario: Skip non-1st days
- **GIVEN** a campaign advancing to the 15th of the month
- **WHEN** the auto-awards processor runs
- **THEN** no auto-award checks are performed
- **AND** the processor returns immediately

#### Scenario: Opt-in via campaign option
- **GIVEN** a campaign with all auto-award categories disabled
- **WHEN** the auto-awards processor runs
- **THEN** no awards are granted
- **AND** manual award granting still works

#### Scenario: Auto-award events in day report
- **GIVEN** auto-awards are granted during day advancement
- **WHEN** viewing the day report
- **THEN** each granted award appears as an IAwardGrantedEvent
- **AND** events show: person name, award name, category, trigger type

### Requirement: Random Events Processing
The system SHALL process random events daily with frequency-based routing (daily, weekly, monthly) for prisoner events, life events, contract events, and historical events.

#### Scenario: Random events processor registered
- **GIVEN** the day pipeline is initialized
- **WHEN** processors are registered
- **THEN** the random events processor is registered with id='random-events' and phase=DayPhase.EVENTS

#### Scenario: Life events fire daily
- **GIVEN** a campaign with useLifeEvents enabled
- **WHEN** advanceDay is called
- **THEN** life events are checked and generated if applicable

#### Scenario: Prisoner events fire on Mondays
- **GIVEN** a campaign with usePrisonerEvents enabled and currentDate is Monday
- **WHEN** advanceDay is called
- **THEN** prisoner events are processed based on capacity and overflow

#### Scenario: Contract events fire on 1st of month
- **GIVEN** a campaign with useContractEvents enabled and currentDate is 1st of month
- **WHEN** advanceDay is called
- **THEN** contract events are processed for all active contracts

#### Scenario: Gray Monday fires on specific dates
- **GIVEN** a campaign with simulateGrayMonday enabled and currentDate is 3132-08-09
- **WHEN** advanceDay is called
- **THEN** Gray Monday bankruptcy event is generated with 99% balance debit

#### Scenario: Disabled event categories produce no events
- **GIVEN** a campaign with usePrisonerEvents disabled
- **WHEN** advanceDay is called on Monday
- **THEN** no prisoner events are generated

#### Scenario: Random events included in day report
- **GIVEN** a day with random events generated
- **WHEN** advanceDay is called
- **THEN** DayReport.allEvents includes random event entries with category, severity, and effects

