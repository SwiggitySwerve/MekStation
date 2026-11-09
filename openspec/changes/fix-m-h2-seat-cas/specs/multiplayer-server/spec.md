## ADDED Requirements

### Requirement: Match metadata writes are compare-and-swap on a revision

The server SHALL stamp every metadata write made through `updateMatchMeta`,
`updateMatchMetaIf` and `closeMatch` with the next value of an optional revision
held only in `meta_json`, where a row without one reads as 0, and SHALL leave the
revision alone on an event append. `updateMatchMetaIf` SHALL apply its patch only
when the stored revision equals the expected revision, and SHALL otherwise answer
a conflict carrying the current metadata and write nothing. The durable store
SHALL also refuse to overwrite a row that changed after it was read, even when the
revision is unchanged. An illegal status edge SHALL still be refused.

#### Scenario: A stale writer is told it lost

- **GIVEN** a writer read the metadata at revision 0 and another write has since landed
- **WHEN** the first writer applies its patch at revision 0
- **THEN** the store SHALL answer a conflict with the current metadata and change nothing

#### Scenario: A row from before the revision existed

- **GIVEN** a stored row whose `meta_json` has no revision
- **WHEN** a writer applies a patch at revision 0
- **THEN** the patch SHALL be stored with revision 1 and the seats and status SHALL be unchanged

### Requirement: Seat writers merge concurrent changes instead of overwriting them

The server SHALL write seats, rosters and spectator removal only through one guarded
writer that derives the patch from the metadata it read, stores it at the revision it
read, and on a conflict derives again from the winning metadata, a bounded number of
times, before answering busy. Derivations SHALL be free of side effects. A lobby
intent SHALL be admitted by status against the metadata at write time, and the
`LobbyUpdated` it broadcasts SHALL carry the stored metadata. MarkSeatAi SHALL drop
its pending entry only after its seat write is applied.

#### Scenario: Two registrations overlap

- **GIVEN** two viewers register as spectators while the first is still bootstrapping its profile
- **WHEN** both requests finish
- **THEN** both spectator seats SHALL exist with distinct slot ids

#### Scenario: A seat is taken while another intent is being stored

- **GIVEN** a lobby intent has read the seats and another writer seats a player before it writes
- **WHEN** the intent is stored
- **THEN** the stored seats and the broadcast SHALL contain both changes

#### Scenario: The match completes during a spectator registration

- **GIVEN** a spectator registration is awaiting its profile bootstrap
- **WHEN** the match completes before the seat is written
- **THEN** the registration SHALL be refused with 409 and no spectator seat SHALL be added

#### Scenario: A retry still finds the pending seat

- **GIVEN** a pending disconnected human seat and a concurrent metadata write that forces MarkSeatAi to derive again
- **WHEN** the host submits MarkSeatAi
- **THEN** the seat SHALL become AI and its pending entry SHALL be cleared once
