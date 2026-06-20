## ADDED Requirements

### Requirement: Structured Diagnostic Entries
The logging system SHALL support structured diagnostic entries in addition to the existing varargs logger calls. A structured entry MUST include timestamp, level, service, event, and MAY include message, run ID, journey ID, step ID, request ID, entity IDs, metadata, and error details.

#### Scenario: Existing varargs calls remain supported
- **WHEN** existing code calls `logger.info('saved', id)`
- **THEN** the logger preserves the current varargs pass-through behavior

#### Scenario: Structured event is emitted
- **WHEN** journey execution emits a combat terminal-state diagnostic
- **THEN** the diagnostic entry includes level, service, event, run ID, journey ID, and relevant combat entity IDs

### Requirement: Correlation Context
The logging system SHALL support correlation context for journey and request-scoped diagnostics. Correlation context MUST be attachable to diagnostic entries without leaking between independent runs or tests.

#### Scenario: Journey run context is attached
- **WHEN** a journey step logs a tactical action rejection
- **THEN** the diagnostic includes the run ID, journey ID, and step ID for that journey step

#### Scenario: Context does not leak between tests
- **WHEN** two logger tests run with different diagnostic contexts
- **THEN** entries captured in one test do not contain the other test's run ID or journey ID

### Requirement: Diagnostic Test Sink
The logging system SHALL provide a test capture mechanism for structured diagnostic entries. Test capture MUST work while preserving existing test-mode suppression of console output.

#### Scenario: Test captures structured warning
- **WHEN** a unit test enables logger test mode and emits a structured warning
- **THEN** the test can inspect the captured diagnostic entry without writing to the console

### Requirement: Logging Coverage Map
The system SHALL define a logging coverage map for important runtime paths. The map MUST include required diagnostic events for character and pilot creation, Mek construction and export, encounter launch, tactical action rejection, combat simulation start and terminal state, match log and replay persistence, campaign contract resolution, repair, salvage, finance updates, API payload rejection, store recovery, journey runner failure, and bug extraction.

#### Scenario: Coverage validator rejects a missing required path
- **WHEN** the logging coverage validator runs against a map missing campaign contract resolution
- **THEN** the validator fails and names the missing path

#### Scenario: Coverage validator accepts required mappings
- **WHEN** every required path has at least one service, event, severity expectation, and test reference
- **THEN** the logging coverage validator succeeds

### Requirement: Diagnostic Separation From Domain Events
The logging system SHALL keep structured diagnostics separate from durable domain event records, replay records, simulation event logs, and match logs. Diagnostics MAY reference domain artifact identifiers, but MUST NOT replace domain persistence.

#### Scenario: Combat run writes diagnostics and domain artifacts
- **WHEN** a combat journey persists a match log and emits diagnostics
- **THEN** the diagnostic entry references the match or replay artifact and the domain artifact remains independently available

### Requirement: Diagnostic Payload Hygiene
Structured diagnostics MUST avoid secrets, raw database dumps, and unbounded unit payloads. Diagnostic metadata SHOULD contain compact identifiers, summarized validation reasons, and bounded counts instead of full object graphs.

#### Scenario: Mek construction diagnostic is bounded
- **WHEN** Mek construction validation emits a diagnostic
- **THEN** the entry includes identifiers, unitTechBase, weight class, validation summary, and bounded issue counts rather than a full serialized BattleMech object
