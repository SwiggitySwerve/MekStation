## ADDED Requirements

### Requirement: Campaign Battle Ledger Hydration

Campaign activation and browser rehydration SHALL restore battle queues,
processed IDs, and available reviewed timestamps from the incoming campaign.
State for the same campaign SHALL be merged by match ID, with applied outcomes
excluded from the pending queue. Activating a different campaign SHALL replace
the old campaign's ledgers. Activation SHALL clear transient application errors.
Reviewed status alone SHALL NOT count as application.

#### Scenario: Server-loaded battle is republished

- **GIVEN** a server campaign containing an applied battle ID
- **WHEN** the campaign is activated, the outcome is republished, and a day advances
- **THEN** the ID SHALL remain applied and its effects SHALL NOT run again

#### Scenario: Switching campaigns isolates battle state

- **GIVEN** campaign A has pending, processed, reviewed, and error state
- **WHEN** campaign B is created or activated
- **THEN** A's state SHALL NOT be attached to B
- **AND** loading A again SHALL restore A's persisted battle state

#### Scenario: Same-campaign copies contain different battle records

- **GIVEN** the store and incoming campaign have different records for the same campaign
- **WHEN** the incoming campaign is activated
- **THEN** the pending and applied records SHALL be merged by match ID
- **AND** an applied ID SHALL NOT remain pending

### Requirement: Shared Applied Outcome Guard

Enqueue, retry, and review SHALL use the union of the active store and campaign
applied ledgers to prevent repeated application. Reviewing an unapplied outcome
SHALL NOT add it to the applied ledger.

#### Scenario: Either ledger records application

- **GIVEN** either the store or embedded campaign records battle M as applied
- **WHEN** enqueue, retry, or review attempts to apply M
- **THEN** M's battle effects SHALL NOT be applied again

### Requirement: Persisted Salvage Idempotency

A persisted salvage allocation marked processed SHALL prevent salvage
regeneration even when the transient reported-battle ledger is absent.

#### Scenario: Salvage survives a serialization round trip

- **GIVEN** a processed allocation survives save and load without the reported-ID ledger
- **WHEN** the same outcome reaches salvage processing again
- **THEN** the existing allocation and player decisions SHALL remain unchanged

### Requirement: Partial Battle Application Errors

Per-unit application errors SHALL reach the existing day-event, store-error,
and review surfaces. An outcome whose other effects have committed SHALL remain
applied and SHALL NOT be offered for whole-outcome reapplication. This change
SHALL preserve existing event payload shapes.

#### Scenario: One unit fails while the battle otherwise commits

- **GIVEN** a per-unit delta fails while other battle effects commit
- **WHEN** day advancement or manual application completes
- **THEN** the unit error SHALL be visible with its match ID
- **AND** enqueue, retry, and review SHALL NOT repeat the committed effects
