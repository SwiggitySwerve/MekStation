## ADDED Requirements

### Requirement: Travel and time cost projection
Campaign finances SHALL project travel fees, daily upkeep, payroll, loan, maintenance, repair, and other configured time-passage costs before travel or time cascade commands are committed.

#### Scenario: Travel preview shows funds delta
- **WHEN** a travel preview spans one or more days
- **THEN** the preview SHALL show itemized expected costs and the projected funds balance after arrival

#### Scenario: Committed ledger matches preview
- **WHEN** travel or time passage is committed
- **THEN** the finance ledger and activity entries SHALL match the previewed cost categories or record an explicit drift/reconciliation warning
