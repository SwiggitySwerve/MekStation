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
