## ADDED Requirements

### Requirement: Campaign unit readiness has one derived owner

Campaign unit condition and deployment reasons SHALL be derived by one pure
selector from current combat, repair, refit, pilot, and authority facts.
The selector SHALL reuse existing repair-ticket and pilot classification rules.

#### Scenario: Completed repair refreshes displayed condition
- **GIVEN** a damaged roster cache and fully repaired combat state
- **WHEN** readiness is selected after repair
- **THEN** the displayed condition reflects the repaired state without a cache write

#### Scenario: Active work or unavailable pilot blocks deployment
- **GIVEN** a unit with blocking repair work, an in-progress refit, or no deployable assigned pilot
- **WHEN** campaign launch readiness is evaluated
- **THEN** launch is refused with a short sentence-case reason

#### Scenario: Terminal repair tickets do not block
- **WHEN** a unit has only completed, cancelled, or legacy done tickets
- **THEN** those tickets do not contribute readiness blockers or warnings

### Requirement: Authority is explicit and journal status is preserved

The launch-head reader SHALL accept optional read-only readiness authority data.
The server SHALL resolve authority through the existing per-campaign authority
logic. Journal status SHALL remain authoritative when that mode is journal.

#### Scenario: Shadowing retains snapshot authority
- **GIVEN** a shadowing campaign with a journal stream
- **WHEN** its launch head is read
- **THEN** its readiness authority is snapshot

#### Scenario: Older response remains compatible
- **WHEN** a launch-head response omits readiness authority data
- **THEN** the reader falls back to snapshot authority without inventing journal unit statuses

#### Scenario: Journal destruction overrides healthy combat state
- **GIVEN** journal authority and a journal-destroyed unit
- **WHEN** the local combat state appears healthy
- **THEN** the unit remains blocked

### Requirement: Old saves are reconciled conservatively

Missing combat state on a never-deployed unit SHALL NOT imply destruction.
A false combatReady flag MAY be reconciled only with complete full-health
evidence and cleared destruction data. A true flag SHALL NOT override destroyed
structure. Selection SHALL NOT mutate saved records.

#### Scenario: Complete recovery evidence supersedes a stale false flag
- **GIVEN** complete full-health current and maximum values and no destruction data
- **WHEN** combatReady remains false on an old save
- **THEN** derived readiness recognizes recovery without rewriting the save

#### Scenario: Partial recovery evidence is insufficient
- **GIVEN** a false combatReady flag and incomplete maximum or current values
- **WHEN** readiness is selected
- **THEN** deployment remains blocked

### Requirement: Launch boundaries use current readiness

Campaign UI and launch admission SHALL use the selector. Server co-op admission
SHALL use stored campaign and journal facts, never client readiness claims.
Readiness refusal SHALL precede artifact creation or pilot bootstrap.

#### Scenario: Direct co-op request cannot bypass readiness
- **GIVEN** a stored unit that cannot deploy and a client claiming a healthy unit
- **WHEN** co-op mission creation is requested directly
- **THEN** server admission refuses before creating a match

#### Scenario: HQ contribution does not deploy units
- **WHEN** a participant chooses command HQ
- **THEN** their units are excluded from deployment readiness checks
