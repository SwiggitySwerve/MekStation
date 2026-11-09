## ADDED Requirements

### Requirement: Match status changes follow one transition table

The server SHALL define match status as exactly `lobby`, `active` and `completed`
in one list that the store type and the `LobbyUpdated` wire enum derive from.
A status write SHALL be legal only as `lobby -> active`, `lobby -> completed`,
`active -> completed`, or a same-status write. `completed` SHALL be terminal.
Both match stores SHALL enforce this in the single metadata patch writer used by
`updateMatchMeta` and `closeMatch`, and SHALL reject an illegal edge with a typed
error before any field is merged or persisted. `createMatch` and the prepared
create SHALL accept only `lobby` and `active`, and SHALL store nothing when they
refuse. The SQLite `status` column SHALL always equal `meta_json.status`.

#### Scenario: A completed match is not reopened

- **GIVEN** a match that has completed
- **WHEN** any writer patches its status to `active` or `lobby`
- **THEN** the store SHALL reject the write and the stored metadata SHALL be unchanged

#### Scenario: A match cannot be created finished

- **WHEN** a caller creates a match with status `completed`
- **THEN** the store SHALL reject it, store no row, and release any create hold

### Requirement: A lobby intent that loses a status race is refused visibly

The host SHALL answer a lobby intent whose metadata write is rejected because the
match status changed after the handler read it with an `INVALID_INTENT` error
frame carrying the originating intentId, and SHALL log the refused edge. It SHALL
NOT broadcast `LobbyUpdated` or change the stored status.

#### Scenario: LaunchMatch races completion

- **GIVEN** the host reads a launchable lobby and the match completes before the write
- **WHEN** the LaunchMatch metadata write runs
- **THEN** the host SHALL return `INVALID_INTENT` for that intent and the match SHALL stay `completed`
