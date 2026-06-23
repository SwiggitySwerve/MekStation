# logging-system Specification

## Purpose

Provides a centralized logging utility with configurable log levels and environment-aware output suppression. Supports debug, info, warn, and error levels with automatic filtering based on NODE_ENV.
## Requirements
### Requirement: Log Level Support

The logging system SHALL support four standard log levels with corresponding console methods.

#### Scenario: Debug logging

- **WHEN** logger.debug() is called with arguments
- **THEN** console.debug() is invoked with the same arguments
- **AND** output is suppressed in production environment
- **AND** output is suppressed in test environment unless test mode is enabled

#### Scenario: Info logging

- **WHEN** logger.info() is called with arguments
- **THEN** console.info() is invoked with the same arguments
- **AND** output is suppressed in test environment unless test mode is enabled

#### Scenario: Warning logging

- **WHEN** logger.warn() is called with arguments
- **THEN** console.warn() is invoked with the same arguments
- **AND** output is suppressed in test environment unless test mode is enabled

#### Scenario: Error logging

- **WHEN** logger.error() is called with arguments
- **THEN** console.error() is invoked with the same arguments
- **AND** output is suppressed in test environment unless test mode is enabled

### Requirement: Environment Detection

The logging system SHALL detect the runtime environment from NODE_ENV.

#### Scenario: Development environment

- **WHEN** NODE_ENV is "development" or undefined
- **THEN** all log levels are enabled
- **AND** debug, info, warn, and error messages are output to console

#### Scenario: Production environment

- **WHEN** NODE_ENV is "production"
- **THEN** debug level is suppressed
- **AND** info, warn, and error messages are output to console

#### Scenario: Test environment

- **WHEN** NODE_ENV is "test"
- **THEN** all log levels are suppressed by default
- **AND** logs can be enabled via enableTestMode()

### Requirement: Test Mode Control

The logging system SHALL provide explicit test mode control for unit testing.

#### Scenario: Test mode disabled (default)

- **WHEN** test environment is detected
- **AND** test mode is not enabled
- **THEN** all log levels are suppressed
- **AND** no console output is produced

#### Scenario: Test mode enabled

- **WHEN** enableTestMode() is called
- **THEN** all log levels are enabled in test environment
- **AND** console output is produced for verification

#### Scenario: Test mode disabled after enabling

- **WHEN** disableTestMode() is called after enableTestMode()
- **THEN** all log levels are suppressed again
- **AND** no console output is produced

### Requirement: Multiple Arguments

The logging system SHALL support multiple arguments of any type.

#### Scenario: Multiple arguments

- **WHEN** logger method is called with multiple arguments
- **THEN** all arguments are passed to the corresponding console method
- **AND** arguments can be strings, objects, numbers, or any type
- **AND** console formatting is preserved (e.g., object inspection)

#### Scenario: Object logging

- **WHEN** logger.info() is called with an object
- **THEN** console.info() receives the object
- **AND** browser/Node.js console formatting applies (expandable objects)

### Requirement: Convenience Exports

The logging system SHALL export individual log functions for direct import.

#### Scenario: Direct function import

- **WHEN** debug, info, warn, or error are imported directly
- **THEN** functions behave identically to logger.debug(), logger.info(), etc.
- **AND** environment filtering applies
- **AND** test mode control applies

#### Scenario: Logger object import

- **WHEN** logger object is imported
- **THEN** all four log methods are available as properties
- **AND** behavior is identical to direct function imports

### Requirement: Console Method Mapping

The logging system MUST use the correct console method for each log level.

#### Scenario: Console method correspondence

- **WHEN** logger.debug() is called
- **THEN** console.debug() is invoked (not console.log)
- **WHEN** logger.info() is called
- **THEN** console.info() is invoked (not console.log)
- **WHEN** logger.warn() is called
- **THEN** console.warn() is invoked (not console.log)
- **WHEN** logger.error() is called
- **THEN** console.error() is invoked (not console.log)

### Requirement: Production Debug Suppression

The logging system MUST suppress debug logs in production to reduce noise.

#### Scenario: Production debug suppression

- **WHEN** NODE_ENV is "production"
- **AND** logger.debug() is called
- **THEN** no console output is produced
- **AND** no console.debug() call is made

#### Scenario: Production other levels

- **WHEN** NODE_ENV is "production"
- **AND** logger.info(), logger.warn(), or logger.error() is called
- **THEN** console output is produced
- **AND** corresponding console method is invoked

### Requirement: Test Environment Silence

The logging system MUST suppress all logs in test environment by default to prevent test output pollution.

#### Scenario: Test environment default behavior

- **WHEN** NODE_ENV is "test"
- **AND** test mode is not enabled
- **AND** any logger method is called
- **THEN** no console output is produced
- **AND** no console method is invoked

#### Scenario: Test mode override

- **WHEN** NODE_ENV is "test"
- **AND** enableTestMode() has been called
- **AND** any logger method is called
- **THEN** console output is produced
- **AND** corresponding console method is invoked

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

### Requirement: Journey Diagnostic Triage Context
Structured journey diagnostics SHALL include standardized triage context when emitted by journey QC. The context MUST identify actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, failureCause, evidenceRefs, and nextDebuggingHint when those fields are applicable to the step. Failure diagnostics MUST include a stable fingerprint that can be used by log search and bug reports.

#### Scenario: Tactical rejection diagnostic explains action context
- **WHEN** a tactical action rejection is logged by a journey step
- **THEN** the structured diagnostic includes actor, rejected action, state before/after summary, rule decision, validation result, warning reasons, evidence references, and a stable fingerprint

#### Scenario: Failure diagnostic links to bug packet
- **WHEN** a required journey step fails
- **THEN** the failure diagnostic includes failureCause and fingerprint
- **AND** the generated bug packet references that fingerprint in its triage logFingerprints

### Requirement: Journey bug extraction diagnostic context
The logging system SHALL require journey QC bug extraction diagnostics to carry standardized triage context. A `bug.candidate_extracted` diagnostic MUST include actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, evidenceRefs, and nextDebuggingHint metadata describing the extraction run, severity gate, generated bug packet, and generated report.

#### Scenario: Bug extraction log describes the bug packet
- **WHEN** `qc:journeys` extracts one or more bug candidates
- **THEN** `system.ndjson` includes a `journey.bugs` `bug.candidate_extracted` entry with a triage packet
- **AND** the triage packet identifies the bug count, gated bug count, severity gate, `bugs.json`, `report.md`, and the next command to inspect the bugs

#### Scenario: Search returns extraction triage by fingerprint
- **WHEN** the user searches journey logs by the extraction diagnostic fingerprint
- **THEN** the log search command returns the extraction diagnostic and its triage metadata

## Data Model Requirements

### LogLevel Type

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

**Purpose**: Defines the four supported log levels.

**Constraints**:

- MUST be one of the four literal values
- MUST correspond to console method names

### Logger Interface

```typescript
interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}
```

**Purpose**: Defines the logger object API.

**Constraints**:

- Each method MUST accept variadic arguments of any type
- Each method MUST return void
- Each method MUST apply environment filtering

### Environment Type

```typescript
type Environment = 'development' | 'production' | 'test';
```

**Purpose**: Defines the three recognized runtime environments.

**Constraints**:

- MUST match NODE_ENV values
- MUST default to 'development' if NODE_ENV is undefined

## Implementation Notes

### Performance Considerations

- **Conditional Execution**: The `shouldLog()` check occurs before console method invocation to avoid unnecessary argument evaluation in suppressed environments.
- **No-Op in Test**: In test environment with test mode disabled, logger methods are effectively no-ops with minimal overhead.

### Environment Detection

- **Browser Compatibility**: The `getEnvironment()` function checks for `process` existence to support both Node.js and browser environments.
- **Default to Development**: If NODE_ENV is not set, the system defaults to development mode (all logs enabled).

### Test Mode State

- **Module-Level State**: Test mode is tracked in a module-level variable (`testMode`) to persist across logger method calls.
- **Test Isolation**: Tests should call `disableTestMode()` in `afterEach()` to prevent state leakage between tests.

### Console Method Fidelity

- **Direct Passthrough**: Arguments are passed directly to console methods using spread syntax to preserve formatting, object inspection, and stack traces.
- **No Transformation**: The logger does not transform, serialize, or format arguments—console behavior is preserved.

## Examples

### Basic Usage

```typescript
import { logger } from '@/utils/logger';

// Development: all output
logger.debug('Initializing component', { props });
logger.info('User logged in', userId);
logger.warn('Deprecated API usage', apiName);
logger.error('Failed to fetch data', error);

// Production: debug suppressed, others output
logger.debug('This will not appear in production');
logger.info('This will appear in production');
```

### Direct Function Import

```typescript
import { debug, info, warn, error } from '@/utils/logger';

debug('Component mounted');
info('Data loaded successfully');
warn('Cache miss');
error('Network request failed');
```

### Test Mode Control

```typescript
import { logger, enableTestMode, disableTestMode } from '@/utils/logger';

describe('MyComponent', () => {
  beforeEach(() => {
    enableTestMode(); // Enable logs for debugging tests
  });

  afterEach(() => {
    disableTestMode(); // Restore default silence
  });

  it('should log on mount', () => {
    const spy = jest.spyOn(console, 'info');
    render(<MyComponent />);
    expect(spy).toHaveBeenCalledWith('Component mounted');
  });
});
```

### Multiple Arguments

```typescript
import { info, error } from '@/utils/logger';

// Multiple arguments of different types
info('User action', { action: 'click', target: 'button' }, Date.now());

// Error with context
error('API request failed', {
  endpoint: '/api/units',
  status: 500,
  error: new Error('Internal Server Error'),
});
```

### Environment-Specific Behavior

```typescript
// Development (NODE_ENV=development or undefined)
logger.debug('Verbose debugging info'); // ✓ Output
logger.info('General information'); // ✓ Output
logger.warn('Warning message'); // ✓ Output
logger.error('Error occurred'); // ✓ Output

// Production (NODE_ENV=production)
logger.debug('Verbose debugging info'); // ✗ Suppressed
logger.info('General information'); // ✓ Output
logger.warn('Warning message'); // ✓ Output
logger.error('Error occurred'); // ✓ Output

// Test (NODE_ENV=test, test mode disabled)
logger.debug('Verbose debugging info'); // ✗ Suppressed
logger.info('General information'); // ✗ Suppressed
logger.warn('Warning message'); // ✗ Suppressed
logger.error('Error occurred'); // ✗ Suppressed

// Test (NODE_ENV=test, test mode enabled)
logger.debug('Verbose debugging info'); // ✓ Output
logger.info('General information'); // ✓ Output
logger.warn('Warning message'); // ✓ Output
logger.error('Error occurred'); // ✓ Output
```

## Dependencies

**Depends On**: None (standalone utility)

**Used By**:

- All application code requiring logging
- Unit tests requiring log verification
- Development debugging workflows

## References

- **Implementation**: `src/utils/logger.ts`
- **Tests**: `src/utils/__tests__/logger.test.ts`
- **Console API**: [MDN Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console)
- **NODE_ENV**: [Node.js Environment Variables](https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production)
