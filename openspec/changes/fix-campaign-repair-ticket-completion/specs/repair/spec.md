## ADDED Requirements

### Requirement: Campaign Repair Ticket Completion
Campaign repair tickets SHALL restore their unit through the shared repair application rules and consume available required parts once when completed normally or by the GM. GM completion SHALL bypass work hours while blocking missing required parts or missing unit state. Existing matched-part semantics SHALL remain unchanged.

#### Scenario: GM completes a repair
- **GIVEN** an active ticket, its unit and sufficient parts
- **WHEN** the GM completes the ticket
- **THEN** the unit SHALL be repaired within its maximum caps and required stock consumed once
- **AND** the ticket SHALL have zero remaining hours

#### Scenario: Missing parts prevent completion
- **GIVEN** a ticket requiring unavailable parts
- **WHEN** the GM previews completion
- **THEN** the preview SHALL be blocked without changing the campaign

### Requirement: Safe Terminal Repair Ticket Pruning
Repair processing SHALL prune previously completed or cancelled tickets only when no pending or recently applied outcome references their source match. It SHALL NOT reapply repairs or consume parts during pruning and SHALL preserve the existing processed battle ledger.

#### Scenario: Old save cleanup
- **GIVEN** an old saved campaign containing many unreferenced terminal tickets
- **WHEN** it is loaded, repair processing runs and the result is saved
- **THEN** the saved queue SHALL omit those tickets without changing unit damage or parts

#### Scenario: References protect terminal tickets
- **GIVEN** terminal tickets referenced by pending or recently applied outcomes
- **WHEN** repair processing prunes the queue
- **THEN** every referenced ticket SHALL remain

#### Scenario: Reprocessing after pruning
- **GIVEN** an outcome whose repairs completed and terminal tickets were pruned
- **WHEN** that outcome is processed again
- **THEN** it SHALL NOT create duplicate tickets, repeat repairs or consume parts again
