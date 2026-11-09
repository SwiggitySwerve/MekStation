## ADDED Requirements

### Requirement: Attempt-specific co-op creation cleanup

When room creation fails before a room is acknowledged, co-op entry SHALL delete only the new campaign identified by that attempt's successful save acknowledgement. The id SHALL match the campaign created by that attempt and SHALL differ from the pre-existing campaign id. Cleanup SHALL NOT select records by name, recency, or the currently selected campaign.

#### Scenario: Room request fails after campaign save

- **GIVEN** a pre-existing campaign and a newly created campaign acknowledged by a successful save
- **WHEN** the new campaign's room request fails
- **THEN** cleanup SHALL delete only the newly saved campaign
- **AND** the pre-existing campaign SHALL never be deleted
- **AND** the previous local campaign and persistence state SHALL be restored if this attempt's campaign remains selected

#### Scenario: Save fails or acknowledges a different campaign

- **GIVEN** a co-op creation attempt
- **WHEN** its save fails or acknowledges a different campaign
- **THEN** entry SHALL show the failure and SHALL NOT request a room
- **AND** cleanup SHALL NOT delete an unacknowledged or pre-existing campaign

#### Scenario: Cleanup fails

- **GIVEN** a failed room request whose cleanup also fails
- **WHEN** the failure is displayed
- **THEN** entry SHALL show the cleanup failure
- **AND** the next attempt SHALL retry that cleanup before another campaign can be created

#### Scenario: Another campaign is selected during creation

- **GIVEN** a room request is in flight
- **WHEN** another campaign is selected before the request fails
- **THEN** cleanup MAY delete this attempt's acknowledged campaign
- **AND** cleanup SHALL NOT replace the newly selected campaign or its persistence state

#### Scenario: Acknowledged room cannot be opened

- **GIVEN** a room was acknowledged for the newly created campaign
- **WHEN** later setup or navigation fails
- **THEN** entry SHALL retain that campaign and room and show the failure
- **AND** entry SHALL offer the created campaign without allowing a second creation
