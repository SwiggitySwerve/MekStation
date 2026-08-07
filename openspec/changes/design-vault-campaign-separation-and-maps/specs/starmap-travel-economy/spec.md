# starmap-travel-economy Delta

## ADDED Requirements

### Requirement: Travel consumes in-fiction time
Committing travel to another system SHALL advance the campaign date by the route's computed transit time (jumps plus in-system transit) through the campaign's day-progression pipeline, so every per-day system (finances, repairs, recovery, contract deadlines) observes the elapsed days. Arrival SHALL be an explicit campaign event: the campaign's current system changes only when the travel completes.

#### Scenario: Multi-day travel advances the campaign date
- **WHEN** a player commits travel on a route whose computed duration is N days
- **THEN** the campaign date SHALL advance N days through day progression
- **AND** `currentSystemId` SHALL change to the destination upon arrival
- **AND** an activity-log entry of category 'travel' SHALL record departure, route, duration, and costs

### Requirement: Travel posts real costs to campaign finances
Route commitment SHALL post the route's jump/transit fees and the per-day operating cost for the transit duration to campaign finances as itemized transactions. When the campaign balance cannot cover the computed total, the commit SHALL be blocked with an explicit insufficient-funds outcome; a blocked commit SHALL change no campaign state.

#### Scenario: Fees and daily costs are itemized
- **WHEN** travel completes on a route with fee F and daily cost D over N days
- **THEN** campaign finances SHALL record the fee transaction F and operating-cost transactions totaling D×N
- **AND** the campaign balance SHALL reflect the deductions

#### Scenario: Insufficient funds blocks commitment
- **WHEN** a player attempts to commit travel whose total cost exceeds the campaign balance
- **THEN** the commit SHALL be rejected with an insufficient-funds reason
- **AND** the campaign date, location, and finances SHALL be unchanged

### Requirement: Preview before commit
The starmap SHALL present a route preview — duration in days, itemized costs, and arrival date — before any commitment, and the committed travel SHALL match the previewed values exactly for the same campaign state. Preview SHALL be side-effect free.

#### Scenario: Preview matches commitment
- **WHEN** a player previews a route and then commits it without other campaign changes
- **THEN** the days advanced and costs posted SHALL equal the previewed values

### Requirement: Dynamic opportunities appear on the map
The system SHALL surface time-bound opportunities anchored to systems on the starmap: GM-authored opportunities in GM-hosted campaigns, and randomly generated opportunities from a seeded generator otherwise (or in addition, at GM discretion). An opportunity SHALL carry an anchor system, an availability window in campaign days, a payload that resolves into a contract/mission offer when accepted at its anchor system, and a provenance marker (`gm` or `generated`). Expired opportunities SHALL be removed and recorded in the activity log.

#### Scenario: Generated opportunity is deterministic per seed
- **WHEN** two identical campaign states with the same generation seed advance the same number of days
- **THEN** they SHALL surface identical generated opportunities

#### Scenario: GM-authored opportunity appears where and when placed
- **WHEN** a GM authors an opportunity anchored to system S with window [d1, d2]
- **THEN** players in that campaign SHALL see the opportunity marker on S while the campaign date is within [d1, d2]
- **AND** its provenance SHALL display as GM-set only where the campaign's redaction rules permit

#### Scenario: Accepting an opportunity resolves into a contract
- **WHEN** a player at the anchor system accepts an opportunity within its window
- **THEN** a contract/mission offer SHALL be created from the opportunity payload through the existing mission-contracts flow
- **AND** the opportunity SHALL be consumed

#### Scenario: Expiry is honest
- **WHEN** the campaign date passes an opportunity's window without acceptance
- **THEN** the opportunity SHALL be removed from the map
- **AND** an activity-log entry SHALL record the expiry

### Requirement: Travel and opportunity events are replay-faithful
Travel commitment, arrival, opportunity generation, acceptance, and expiry SHALL be recorded as campaign events sufficient to reproduce the same sequence deterministically (including the generator seed), consistent with the campaign event-log and replay infrastructure.

#### Scenario: Replaying a travel span reproduces outcomes
- **WHEN** a recorded campaign span containing travel and opportunity events is replayed
- **THEN** the same dates, costs, opportunities, and resolutions SHALL result
