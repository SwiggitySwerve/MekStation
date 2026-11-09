## ADDED Requirements

### Requirement: Dock Owns Pending GM Preview Cleanup

The tactical dock SHALL cancel its pending GM preview before requesting a replacement and when unmounting. Cancellation SHALL use the callback belonging to the service that created the preview and SHALL occur at most once for that pending preview.

#### Scenario: Replacement starts before a render
- **GIVEN** a pending preview
- **WHEN** another GM preview starts, including multiple starts within one React batch
- **THEN** the previous preview SHALL be cancelled before requesting the next preview
- **AND** the newest preview SHALL remain pending

#### Scenario: Dock unmounts with a pending preview
- **WHEN** the dock unmounts with an unresolved preview
- **THEN** it SHALL cancel that preview through its originating service

#### Scenario: Freshness blocks approval
- **GIVEN** a preview whose source state has changed
- **WHEN** approval returns a blocked freshness result
- **THEN** the dock SHALL keep the same preview visible with the refusal reason
- **AND** the preview SHALL remain pending until explicit cancellation, replacement, or unmount
- **AND** the dock SHALL NOT refresh or bypass the preview's freshness metadata

#### Scenario: Preview reaches a terminal action
- **WHEN** the GM explicitly cancels, successfully approves, or takes manual control of the preview
- **THEN** the dock SHALL release ownership
- **AND** later unmount SHALL NOT cancel that preview again
