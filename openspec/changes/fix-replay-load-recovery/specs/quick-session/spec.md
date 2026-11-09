## ADDED Requirements

### Requirement: Standalone Replay Load Recovery

The standalone replay page SHALL display an accessible banner when its match
log is missing or fails to load. The banner SHALL distinguish a missing replay
from a load failure and SHALL offer Retry. If the browser event timeline fails
and no usable direct replay is active, the page SHALL show its useful error in
the recovery banner. File upload SHALL remain available after either failure.

Retry SHALL repeat the current game's match-log read and refresh the browser
event timeline. While retrying, the page SHALL show pending feedback and prevent
duplicate retry requests. A successful retry SHALL remove the failure banner
and show the recovered replay; another failure SHALL remain retryable.

Uploaded events SHALL retain precedence over persisted match-log events, which
retain precedence over browser events. Clearing an upload SHALL restore the
existing prior source without an implicit match-log reload. An active upload
SHALL hide match-log failure feedback. A usable direct replay SHALL remain
visible if its fallback browser timeline is loading or failed.

Responses from a superseded game or disposed load SHALL NOT replace the current
load state, even when response JSON finishes parsing after navigation.

#### Scenario: Match log is missing

- **GIVEN** the match-log read returns HTTP 404 and no upload is active
- **WHEN** loading settles
- **THEN** the page SHALL show a missing-replay banner and enabled Retry action
- **AND** file upload SHALL remain available

#### Scenario: Match log fails to load

- **GIVEN** the match-log read returns an unsuccessful status other than 404,
  rejects, or returns JSON that cannot be parsed
- **WHEN** loading settles with no active upload
- **THEN** the page SHALL show a load-failure banner and enabled Retry action

#### Scenario: Retry recovers playback

- **GIVEN** a missing or failed replay banner
- **WHEN** Retry is activated repeatedly before the next request settles
- **THEN** the page SHALL issue one additional match-log request and refresh the timeline
- **AND** the Retry action SHALL show pending feedback and be disabled
- **WHEN** the request succeeds
- **THEN** the page SHALL remove the banner and display the recovered replay

#### Scenario: A retry fails again

- **GIVEN** a retry is pending
- **WHEN** the request fails
- **THEN** the page SHALL display the failure and enable Retry again

#### Scenario: Browser timeline fails

- **GIVEN** the browser timeline reports an error and no direct replay is active
- **WHEN** the page renders
- **THEN** its recovery banner SHALL show that error and offer Retry
- **AND** file upload SHALL remain available

#### Scenario: Direct playback survives a fallback timeline failure

- **GIVEN** persisted match-log events or uploaded events are active
- **WHEN** the fallback browser timeline is loading or failed
- **THEN** direct replay playback SHALL remain visible

#### Scenario: Upload precedence survives a match-log failure

- **GIVEN** a missing or failed match-log banner
- **WHEN** a valid file is loaded
- **THEN** uploaded events SHALL become the active source and the banner SHALL be hidden
- **WHEN** the upload is cleared
- **THEN** the prior source and any unresolved failure banner SHALL be restored
- **AND** clearing SHALL NOT issue another match-log request

#### Scenario: Clearing an upload restores persisted events

- **GIVEN** persisted match-log events were loaded before a file upload
- **WHEN** the upload is cleared
- **THEN** the persisted events SHALL become active again without another read

#### Scenario: Previous response finishes parsing after navigation

- **GIVEN** the previous game's match-log response is still parsing JSON
- **WHEN** the page navigates to another game and that game's replay is missing
- **AND** the previous response finishes parsing
- **THEN** the missing-replay banner SHALL remain and the previous events SHALL NOT appear
