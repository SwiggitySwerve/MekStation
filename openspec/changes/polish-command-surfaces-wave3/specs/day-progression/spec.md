# day-progression — Delta for polish-command-surfaces-wave3

## MODIFIED Requirements

### Requirement: Day Report Panel UI

The system SHALL provide a UI component to display day advancement reports with healing, costs, and contract events. When more than one day is advanced at once, the panel SHALL display an aggregated summary AND a per-day breakdown listing each day's date, costs, healed personnel, expired contracts, and turnover departures. Days with no events SHALL be compressed so that advancing many days does not render one section per event-less day.

#### Scenario: Display day report after advancement

- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Day" and day advancement completes
- **THEN** a DayReportPanel is displayed showing personnel healed, contracts expired, and daily costs breakdown

#### Scenario: Advance week button

- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Week"
- **THEN** advanceDays(7) is called and an aggregated summary of all 7 days is displayed
- **AND** a per-day breakdown is displayed alongside the aggregate, listing each day's date and its own costs, healed personnel, expired contracts, and turnover departures

#### Scenario: Advance month button

- **GIVEN** a campaign dashboard page
- **WHEN** the user clicks "Advance Month"
- **THEN** advanceDays(30) is called and an aggregated summary of all 30 days is displayed
- **AND** a per-day breakdown is displayed alongside the aggregate, with event-less days compressed so the panel does not render 30 empty sections

#### Scenario: Per-day breakdown shows each event day

- **GIVEN** a multi-day advance whose reports include days with events (costs, healing, expired contracts, or turnover) and days with no events
- **WHEN** the DayReportPanel renders the multi-day report
- **THEN** each day with events SHALL appear as its own per-day section identified by that day's date
- **AND** each per-day section SHALL show that day's costs, healed personnel, expired contracts, and turnover departures
- **AND** the aggregated totals summary SHALL still be displayed

#### Scenario: Event-less days are compressed

- **GIVEN** a multi-day advance in which one or more days have no events
- **WHEN** the DayReportPanel renders the multi-day report
- **THEN** the event-less days SHALL be compressed rather than rendered as full per-day sections
- **AND** the per-day breakdown SHALL remain readable for a 30-day advance
