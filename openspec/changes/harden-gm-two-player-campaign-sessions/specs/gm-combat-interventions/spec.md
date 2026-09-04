## ADDED Requirements

<!--
SPLIT NOTICE (2026-09-04, owner ruling on the 2026-09-03 inventory-and-sync council):
GM combat rewind does not ship inside this change. The combat journal cutover this
capability depends on is not funded here, so the requirements whose SHALLs the
shipped code cannot discharge were moved VERBATIM to the successor change
`adopt-combat-journal-cutover-and-gm-rewind` (blocker name: `journal-cutover`).

Moved to the successor's delta:
- `Combat Intervention Has Distinct Preview and Commit Phases` (whole requirement; box 14.1)
- the replacement-branch clause of `Combat Rewind Is GM-Only and Append-Only`
  and its scenario `GM commits rewind` (box 14.4)
- the activation clause of `Combat Rebuild Gates Commands and Activation` and its
  scenarios `Valid rebuild activates` / `Invalid rebuild remains blocked` (box 14.4)
- `Superseded Combat Commands Are Rejected` (whole requirement; box 14.2)
- `Combat Rewind Preserves Viewer-Specific Hidden State` (whole requirement; box 14.4)

Kept here because the shipped code discharges them:
- the GM-only / player-request clauses of `Combat Rewind Is GM-Only and Append-Only`
- the `PROJECTION_REBUILDING` clause of `Combat Rebuild Gates Commands and Activation`
  (box 14.3 closed 2026-09-02; the refusal is live at both admission sites) - this is a
  deliberate deviation from the council text, which moved requirement 3 whole
- `Applied Campaign Outcome Requires Coordinated Correction` (17.x work)

The successor carries the moved clauses of the two split requirements as MODIFIED
requirements holding the full final text, so its archive replaces the reduced
headers this change installs. Do not re-add moved text here.
-->

### Requirement: Combat Rewind Is GM-Only and Append-Only
Only the authenticated non-playing GM SHALL commit combat rewind. A player MAY submit a non-mutating rewind request.

#### Scenario: Player requests rewind
- **WHEN** a player asks to return to a prior combat point
- **THEN** the request SHALL enter GM review and SHALL not change the effective branch

#### Scenario: Player commits rewind
- **WHEN** a player attempts a rewind-commit command
- **THEN** the authority SHALL reject it before append

### Requirement: Combat Rebuild Gates Commands and Activation
While a replacement combat branch is rebuilding, client commands SHALL reject with retryable `PROJECTION_REBUILDING`.

#### Scenario: Command during rebuild rejects
- **WHEN** any participant submits a combat command while the candidate branch is rebuilding
- **THEN** the authority SHALL return `PROJECTION_REBUILDING` with current branch and revision and SHALL not queue or append the command

### Requirement: Applied Campaign Outcome Requires Coordinated Correction
Combat-only rewind SHALL not cross an accepted campaign outcome receipt.

#### Scenario: GM attempts post-receipt rewind
- **WHEN** the affected outcome version already has a campaign receipt
- **THEN** combat rewind SHALL reject with a typed closed-boundary response and offer the coordinated retroactive-outcome correction flow
