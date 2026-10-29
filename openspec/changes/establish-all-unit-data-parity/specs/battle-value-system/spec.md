## ADDED Requirements

### Requirement: Runtime parity term validation

The comparator SHALL reject malformed runtime terms with a structured failed
result. Null and undefined entries SHALL be missing terms; other non-objects,
absent or blank field identifiers, and unknown comparison kinds SHALL be invalid
terms. An unknown comparison kind SHALL NOT silently select exact comparison.

#### Scenario: Reject JSON null and unknown comparison kinds

- **GIVEN** a term list containing JSON null or an unknown comparison kind
- **WHEN** parity is evaluated
- **THEN** the result SHALL fail and retain the entry's index in its diagnostic
- **AND** the comparator SHALL NOT throw on null or accept matching unknown-kind values

### Requirement: Strict all-family numerical parity

Every applicable numerical construction/BV result and available component term SHALL differ strictly less than 1% from its matched loaded-entity reference: `abs(actual - reference) / abs(reference) < 0.01`. Numeric acceptance SHALL compare the exact JSON decimal values so binary rounding cannot change the strict boundary; approximate ratios MAY be reported separately. Zero references SHALL require exact zero. Missing or nonfinite results SHALL fail. Discrete design facts SHALL match exactly. Existing mech BV regression gates SHALL remain enforced, but their broader aggregate thresholds SHALL NOT establish this stricter readiness.

#### Scenario: Reject the tolerance boundary

- **GIVEN** reference BV 1000
- **WHEN** local BV is 1010 or 990
- **THEN** the comparison SHALL fail without pre-rounding the relative error
- **WHEN** local BV is 1009 or 991
- **THEN** that numerical comparison SHALL pass

#### Scenario: Reject decimal boundary and missing comparison entries

- **GIVEN** reference weight 10 and actual weight 10.1 or 9.9
- **WHEN** numerical comparison runs
- **THEN** it SHALL fail at the exact decimal 1% boundary
- **AND** an array with missing comparison entries SHALL fail rather than skip them

#### Scenario: Reject missing and compensating errors

- **GIVEN** matching total weight but a failing engine or controls term
- **WHEN** numerical readiness is evaluated
- **THEN** the unit SHALL fail component parity
- **AND** zero, missing and nonfinite reference/result cases SHALL be handled explicitly

#### Scenario: Separate unsupported metrics from missing implementation

- **GIVEN** a metric unsupported by the upstream entity's rules
- **WHEN** a report marks that metric inapplicable
- **THEN** it SHALL include the upstream-supported reason
- **AND** local unimplemented calculations SHALL remain failures rather than inapplicable results
