## ADDED Requirements

### Requirement: Encounter Force Selection Recovery Trust Anchor
The journey QC system SHALL maintain a blocking browser journey for encounter
force-selection recovery. The journey SHALL exercise both side-aware links
through the live UI and pair visual evidence with concrete route, request,
response, store-rehydration, raw API, navigation, and cold-reload assertions.
Screenshot-only or browser-local state SHALL NOT satisfy the trust anchor.

#### Scenario: Player and opponent assignments cross authority boundaries
- **WHEN** the browser journey assigns an existing force to each encounter slot through the real selection routes
- **THEN** the evidence SHALL identify each side-specific request and successful response
- **AND** it SHALL prove the reloaded store and raw encounter API contain the selected ids while the non-target slot was preserved after each assignment

#### Scenario: Cold reload proves hydrated continuity
- **WHEN** the journey cold reloads encounter detail after both assignments
- **THEN** it SHALL prove the concrete route returns, both hydrated force summaries remain visible, and both raw force ids still match
- **AND** any screenshot SHALL be paired with the authoritative assertions that produced it

#### Scenario: Empty-force recovery remains honest
- **WHEN** the journey opens the selection route with no stored forces
- **THEN** it SHALL prove the no-candidate explanation and create-force recovery link are visible and keyboard reachable
- **AND** the evidence SHALL show that neither encounter slot was written

#### Scenario: Invalid side cannot pass softly
- **WHEN** the journey opens the route with a missing or unsupported `type`
- **THEN** it SHALL prove that no assignment request occurred and the recoverable invalid-link state rendered
- **AND** a generic page render, console-free screenshot, or local store value SHALL NOT count as a passing substitute
