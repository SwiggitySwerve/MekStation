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

## MODIFIED Requirements

### Requirement: ProtoMech Offensive BV and Main Gun

Proto offensive BV SHALL include arm weapons and a MainGun location weapon
with the same BV as a mech-mounted instance. Its offensive movement factor
SHALL use explicit Run plus rounded half of nonnegative Jump, using the shared
speed-factor owner and the pinned MegaMek calculator's UMU-zero context.

#### Scenario: Main gun BV at full value

- **GIVEN** a proto with a main-gun PPC (catalog BV 176)
- **WHEN** offensive BV is computed
- **THEN** the main gun contribution SHALL equal 176 BV (no proto-specific modifier)

#### Scenario: Proto speed factor

- **GIVEN** a proto with Walk 6, Run 9 and Jump 4
- **WHEN** offensive speed factor is computed
- **THEN** effective MP SHALL be `9 + round(4 / 2) = 11` and the factor SHALL equal 1.76
- **AND** the calculator SHALL consume explicit Run without changing or reconstructing movement from Walk or a booster flag
- **AND** negative Jump SHALL contribute zero, matching the shared movement owner

#### Scenario: Reactive and saved movement

- **WHEN** a new store or a BV-affecting edit computes a breakdown
- **THEN** its offensive factor SHALL use the current stored Run and Jump
- **GIVEN** saved movement and a cached breakdown from an earlier version
- **WHEN** the store hydrates or only identity fields change
- **THEN** neither saved movement nor cached BV SHALL be silently migrated
- **WHEN** recomputation is explicitly requested
- **THEN** the factor SHALL be refreshed from the preserved movement values

#### Scenario: Component evidence and exclusions

- **WHEN** the movement factor is compared to pinned Java
- **THEN** the 86 loaded sources and bounded synthetic components/entities SHALL compare matching Run and Jump under undamaged BV settings
- **AND** source fields, export bytes and unrelated BV components SHALL be checked separately from changed speed, offensive subtotal and total values
- **AND** equipment pools, defensive factors, chassis multipliers, damage/options, complete BV and production editor/save flows SHALL remain unverified until independently proven
