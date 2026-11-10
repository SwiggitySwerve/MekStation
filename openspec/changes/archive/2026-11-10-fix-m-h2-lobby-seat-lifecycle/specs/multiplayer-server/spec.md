## ADDED Requirements

### Requirement: Lobby seat mutations respect match lifecycle

The server SHALL accept OccupySeat, LeaveSeat, ReassignSeat, SetAiSlot,
SetHumanSlot, SetReady and LaunchMatch only in lobby status. MarkSeatAi SHALL
require active status and exactly a pending, occupied human seat. ForfeitMatch
SHALL retain lobby/active availability and SHALL reject completed status.
Rejections SHALL preserve seats, status and engine events and correlate the
originating intentId. SetAiSlot SHALL reject spectator seats. Lobby routing and
engine exclusion SHALL derive from one exhaustive typed intent classification.

#### Scenario: Host attempts to change running seats

- **GIVEN** an active or completed match
- **WHEN** the host submits a lobby seat setup or launch intent
- **THEN** the server SHALL reject it without changing metadata or events

#### Scenario: Host replaces a disconnected human

- **GIVEN** an active match with an occupied human seat on the pending tracker
- **WHEN** the host submits MarkSeatAi for that seat
- **THEN** the server SHALL convert the seat to AI and clear its pending entry
- **AND** connected humans, empty seats, AI seats and spectators SHALL be rejected

### Requirement: Detached spectators release durable capacity

The server SHALL remove a spectator seat after that viewer's final socket
detaches. Removal SHALL run through the serialized host command queue and SHALL
recheck for reattachment before writing metadata. Playing seats and campaign
membership SHALL remain unchanged. Viewer delivery cursors and acknowledgements
SHALL remain keyed to authenticated identity across detachment and restart.
New spectators SHALL receive an unoccupied slot id even after a middle seat leaves.

#### Scenario: Final socket leaves

- **GIVEN** a registered spectator with one socket
- **WHEN** the socket detaches and the queued removal completes
- **THEN** the durable spectator seat SHALL be removed and capacity released
- **AND** restart SHALL preserve the removal and retained delivery receipts

#### Scenario: Viewer reconnects during removal

- **GIVEN** the final socket detached and removal is waiting in the queue or reading metadata
- **WHEN** another socket for that viewer attaches before the metadata write
- **THEN** the spectator seat SHALL survive

#### Scenario: Another spectator fills a vacant middle slot

- **GIVEN** the spectator cap was reached and a middle spectator departed
- **WHEN** another viewer registers through REST
- **THEN** registration SHALL succeed with a unique slot id
