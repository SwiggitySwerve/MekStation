# pilot-system Specification Delta

## ADDED Requirements

### Requirement: Pilot-Facing SPA Browsing Surface

The pilot system SHALL expose a single browsing surface — the `SPAPicker`
component — for any pilot-facing flow that needs to present the SPA
catalog (pilot creation, mid-campaign XP spend, designer previews).

#### Scenario: Pilot flows import the picker, not the catalog directly

- **GIVEN** a pilot flow needs to let the player browse SPAs
- **WHEN** the flow is implemented
- **THEN** it SHALL import `SPAPicker` from
  `@/components/spa/SPAPicker`
- **AND** it SHALL NOT render catalog entries with ad-hoc components
- **AND** it SHALL NOT duplicate catalog list logic

#### Scenario: Picker exposes the selection contract

- **GIVEN** a pilot flow mounts the `SPAPicker`
- **WHEN** the player selects an entry
- **THEN** the flow SHALL receive the selection as
  `{ spa: ISPADefinition, designation: ISPADesignation | undefined }`
- **AND** the flow SHALL be responsible for purchase, XP deduction, and
  persistence (the picker itself remains purely presentational)
