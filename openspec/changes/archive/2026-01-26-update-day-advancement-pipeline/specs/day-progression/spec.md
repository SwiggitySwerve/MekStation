# day-progression Specification Delta

This delta documents the refactoring from hardcoded 3-phase day advancement to a plugin/registry architecture.

## MODIFIED Requirements

### Requirement: Day Advancement
The system SHALL advance the campaign date by one day using a plugin/registry architecture where processors self-register and execute in deterministic phase order.

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

## ADDED Requirements

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
