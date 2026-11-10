## ADDED Requirements

### Requirement: Unsaved campaign edits are claimed by a pending-write marker

An unacknowledged campaign edit SHALL leave a pending-write marker on the
single-player, adopted copy, naming the campaign, the server row version the
edits were built on, and the local edit counter. The marker SHALL be written in the same task as the edit, persisted with the copy, and
cleared only when a save acknowledges the edits. It SHALL NOT exist for co-op,
guest or unadopted legacy copies.

#### Scenario: The marker is written with the edit

- **GIVEN** an adopted single-player campaign at server version N
- **WHEN** the campaign is edited
- **THEN** the persisted copy SHALL carry a marker with `baseVersion` N and the edit counter
- **AND** the marker SHALL exist before any timer or request completes

#### Scenario: Only an acknowledgement clears the marker

- **GIVEN** a marker for a campaign with a save in flight, or a refused or failed save
- **WHEN** no save has been acknowledged
- **THEN** the marker SHALL remain
- **AND** after an acknowledged save that contains every edit it SHALL be cleared

#### Scenario: A discard-time flush records its evidence

- **GIVEN** a marker and a pending discard-time flush
- **WHEN** the flush is issued
- **THEN** the marker SHALL record the flush's base version, edit counter and envelope digest before the request leaves

### Requirement: A reloaded document never presents newer local edits as saved

A loading document SHALL decide a copy's pending-write marker before any cache
verdict, comparing the server row `version` and instance with the marker and
never timestamps, and SHALL do exactly one of: keep the local copy dirty and push at the marker's token;
adopt the server record when it provably is the copy's own flush with no later
edits; or raise a conflict without pushing or replacing.

#### Scenario: The server is still at the marker's base

- **GIVEN** a marker at base version N and a server row at version N from the same instance
- **WHEN** the campaign loads
- **THEN** the local copy SHALL be kept and marked dirty
- **AND** the ordinary save SHALL carry token N and the local state
- **AND** the save status SHALL read as recovered unsaved changes until a save is acknowledged

#### Scenario: The server holds the copy's own flush

- **GIVEN** a marker whose flush evidence names base N and a digest
- **WHEN** the server row is at N+1 and its envelope digest equals the flush digest
- **THEN** the copy SHALL be adopted clean if no edit followed the flush
- **AND** otherwise the local copy SHALL be kept dirty at version N+1

#### Scenario: The server moved on

- **GIVEN** a marker at base version N
- **WHEN** the server row has any other version, a different instance, or an N+1 row whose digest does not match
- **THEN** a conflict SHALL be raised and no request SHALL be sent
- **AND** the local copy SHALL NOT be replaced and SHALL stay dirty
- **AND** the marker SHALL remain so a further reload decides the same way

#### Scenario: Nothing is owed

- **GIVEN** no marker, another campaign's marker, a co-op copy, or a missing server record
- **WHEN** the campaign loads
- **THEN** the existing load behaviour SHALL apply and no pending-write event SHALL occur

### Requirement: The save indicator never claims saved with unsaved edits

`saveState === 'saved'` SHALL imply that the campaign has no unsaved edits. An
edit, or a proven flush that leaves an acknowledgement owed, SHALL move `saved`
to `idle`. A failed or refused save SHALL be shown as failed, not as saved.

#### Scenario: Saved never coexists with dirty

- **GIVEN** any sequence of persistence events
- **WHEN** the resulting status is `saved`
- **THEN** dirty SHALL be false

#### Scenario: One badge

- **GIVEN** the save-status card
- **WHEN** it renders any persistence state
- **THEN** it SHALL show exactly one status badge, with unsaved edits outranking saved
- **AND** a recovered copy SHALL read "Recovered unsaved changes" and a failed save "Save failed"

### Requirement: A pending-write conflict preserves local state until the player chooses

A conflict raised because local edits predate the server SHALL keep the local
copy and SHALL NOT push or replace automatically. The card SHALL state the
campaign date and base version the browser holds and the date and version the
server holds, and SHALL offer only "Use Server Version".

#### Scenario: Local state survives until the explicit choice

- **GIVEN** a pending-write conflict
- **WHEN** the player does nothing, reloads, or keeps playing
- **THEN** no request SHALL be sent and the local copy SHALL remain
- **AND** choosing "Use Server Version" SHALL replace the copy with the server record and clear the marker

#### Scenario: No overwrite path

- **GIVEN** a pending-write conflict
- **WHEN** the card renders
- **THEN** it SHALL NOT offer a keep-mine or save action that sends the stale copy at the server's version

### Requirement: Campaign save status is visible on every campaign detail page

The shared campaign navigation SHALL show a compact save indicator for conflict,
unsaved, failed and saving states, derived from the same persistence snapshot
and presentation function as the dashboard card. It SHALL stay quiet when clean
and saved or idle, have an accessible name and polite live status region, and
link to the dashboard save card. The campaign refit customizer shell SHALL
also show this indicator, including its unavailable-unit state.

#### Scenario: Conflict is visible away from the dashboard

- **GIVEN** a pending-write conflict and the missions page, mission launch page or campaign refit customizer
- **WHEN** the campaign navigation renders
- **THEN** the indicator SHALL show conflict and say that changes remain local and unsent
- **AND** its link SHALL target the dashboard save card

#### Scenario: All persistence states share one derivation

- **GIVEN** an unsaved, recovered, saving, failed or conflict snapshot
- **WHEN** the card and navigation indicator render
- **THEN** their status labels SHALL agree
- **AND** a clean saved snapshot SHALL produce no navigation save link

### Requirement: Pending-write conflict edits cannot start a write

While a pending-write conflict is unresolved, further edits SHALL remain dirty
and local with conflict status. Automatic saves SHALL NOT be scheduled, and
manual, queued and discard-time saves SHALL NOT send a PUT. The card SHALL
explain that saving is paused until the player chooses "Use Server Version";
the Save now action SHALL be absent. A programmatic Save now SHALL return the
held conflict without changing state or adopting the server's version.

#### Scenario: Editing and attempting saves during conflict

- **GIVEN** an unresolved pending-write conflict
- **WHEN** the player edits, waits beyond the debounce, requests Save now or closes the page
- **THEN** no PUT SHALL be sent and no autosave timer SHALL be armed
- **AND** the state SHALL remain conflict and dirty, with no server token adopted
- **AND** the indicator and card SHALL say that the changes are local and unsent

#### Scenario: Explicit take-server restores normal saving

- **GIVEN** edits held by a pending-write conflict
- **WHEN** the player chooses "Use Server Version" and then makes a new edit
- **THEN** the held local changes SHALL be discarded and the conflict cleared
- **AND** normal autosaving SHALL resume at the adopted server version
