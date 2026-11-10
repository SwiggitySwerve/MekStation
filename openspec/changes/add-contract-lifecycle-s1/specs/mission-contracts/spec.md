## ADDED Requirements

### Requirement: Contract lifecycle version ownership

The system SHALL interpret absent and explicit version 1 as legacy, version 2
as staged, and invalid or unsupported future values as unsupported. The writer
SHALL remain 1. Rule introductions SHALL be owned by one append-only map.

#### Scenario: Legacy round trip

- **GIVEN** a contract without a version or with explicit version 1
- **WHEN** it is loaded and serialized
- **THEN** its JSON bytes are unchanged and staged rules are disabled

#### Scenario: Future state

- **GIVEN** a contract with an unsupported version and unfamiliar nested state
- **WHEN** it is loaded
- **THEN** its version accessor returns unsupported and its bytes are retained

### Requirement: Staged lifecycle load validation

The mission loader SHALL reject malformed known-version lifecycle state,
including fractional cents and duplicate match identifiers, without rewriting
legacy records or validating an unknown future schema as the current schema.

#### Scenario: Corrupt staged state

- **GIVEN** a version 2 contract with an invalid lifecycle block
- **WHEN** loaded as a mission, a mission-map entry or a market offer
- **THEN** hydration fails with a lifecycle validation error

### Requirement: Pure staged completion rules

The contract owner SHALL derive readiness from ACTIVE status and the saved end
date, expose pending match identifiers as blockers, and recommend SUCCESS for
no resolved fighting or a nonnegative lifetime score, otherwise FAILED.
Victory scores 2, defeat scores -2, draw and unscored score zero. Unknown
history SHALL be reported as insufficient rather than inferred as success.

#### Scenario: Term boundary with blockers

- **GIVEN** an active contract at its saved end date with a pending match
- **WHEN** readiness is evaluated
- **THEN** it is ready with a blocker and completion cannot proceed

#### Scenario: Lifetime recommendation

- **GIVEN** one victory and one defeat in complete lifetime history
- **WHEN** recommendation is evaluated
- **THEN** the score is zero and the recommendation is SUCCESS

### Requirement: Exact contract-month installments and settlement

The owner SHALL plan N minus one installments where N is max(1, ceil(termDays /
30)), due every 30 days from the saved generation-time start date. Each
installment SHALL be floor(baseCents / N). Final settlement SHALL select the
existing verdict payout column and subtract max(record credits, ledger credits)
from the unchanged total. Amounts SHALL be nonnegative safe integer cents.
The final payment SHALL retain the entire division remainder.

#### Scenario: Remainder and record disagreement

- **GIVEN** 10001 base cents over 90 days and 3333 ledger-evidenced cents
- **WHEN** settlement is calculated with a record showing zero credits
- **THEN** ledger evidence is subtracted once and the remainder is retained

### Requirement: Pure idempotent completion transform

The owner SHALL return a new contract and deterministic settlement transaction
without persistence, wall-clock reads or input mutation. Existing receipt or
ledger evidence SHALL prevent a second payment; receipt without ledger SHALL
surface a mismatch. No production caller SHALL invoke completion in S1.

#### Scenario: Completion retry

- **GIVEN** a ready staged contract completed under tx-contract-settlement-id
- **WHEN** completion is requested again with its receipt or ledger transaction
- **THEN** no additional transaction is returned
