## ADDED Requirements

### Requirement: Single In-Flight Pre-Battle Launch

Force-based interactive, spectator, auto-resolve, and unit-picker skirmish launches SHALL accept at most one launch per mounted hook while session preparation or navigation is pending. Successful launches SHALL preserve explicit restart linkage and existing publication order. A failed or cancelled navigation SHALL release busy state and show an error through the existing launch error surface, allowing retry. Existing recovery, link, and completion refusal messages SHALL remain unchanged.

#### Scenario: Repeated clicks during preparation and navigation

- **GIVEN** a pre-battle launch is preparing a session or awaiting navigation
- **WHEN** the launch handler is called again
- **THEN** no second preparation, encounter linkage, session publication, or navigation SHALL occur

#### Scenario: Navigation failure allows retry

- **GIVEN** a prepared launch whose navigation rejects or returns false
- **WHEN** navigation settles
- **THEN** the existing error toast SHALL report failure and busy state SHALL clear
- **AND** a subsequent explicit launch attempt SHALL be accepted

### Requirement: Session-Scoped Completion Persistence

The mounted game-session page SHALL track match-log and encounter-replay persistence independently by session ID. Each eligible session SHALL receive one attempt per persistence channel during that page mount. Failure SHALL be recorded separately from success and SHALL show an error toast without blocking victory navigation or automatically retrying on rerender. Completion persistence SHALL remain disabled for non-completed or demo sessions.

#### Scenario: Two games on one mounted page

- **GIVEN** completed session A has persisted on the mounted game page
- **WHEN** completed session B is loaded without unmounting the page
- **THEN** B's match log and encounter replay SHALL each receive their own attempt
- **AND** revisiting A SHALL not submit A again during the same mount

#### Scenario: Previous session completes asynchronously

- **GIVEN** session A's persistence remains pending when the page switches to B
- **WHEN** A's request settles
- **THEN** it SHALL update only A's persistence status and SHALL not suppress B's attempt

#### Scenario: Failed persistence remains visible

- **GIVEN** a match-log or encounter-replay attempt fails, including module-loading or transport failure
- **WHEN** the failure settles, even after navigation to victory
- **THEN** an error toast SHALL identify the failed save
- **AND** rerendering SHALL not silently mark it successful or create an automatic retry loop
