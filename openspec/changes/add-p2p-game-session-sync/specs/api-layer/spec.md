# api-layer Specification Delta

## ADDED Requirements

### Requirement: P2P Peer Channel Contracts

The api-layer SHALL document the peer-to-peer channel contracts used by
networked game sessions, since these contracts replace traditional HTTP
endpoints for the 1v1 P2P multiplayer flow.

#### Scenario: Event broadcast envelope

- **GIVEN** a host peer appends an `IGameEvent`
- **WHEN** the event is broadcast on the peer channel
- **THEN** the wire shape SHALL be
  `{ kind: 'game-event', event: IGameEvent, authorPeerId: string }`
- **AND** the envelope SHALL be serialized as JSON inside the existing
  Yjs `gameEvents` Y.Array

#### Scenario: Intent envelope

- **GIVEN** a guest peer submits an action
- **WHEN** the intent is broadcast on the peer channel
- **THEN** the wire shape SHALL be
  `{ kind: 'game-intent', intent: IGameIntent, authorPeerId: string }`
- **AND** the host SHALL acknowledge by appending the resolved event,
  which naturally replicates back to the guest

#### Scenario: Rejection envelope

- **GIVEN** a host rejects a guest intent
- **WHEN** the rejection is sent on the peer channel
- **THEN** the wire shape SHALL be
  `{ kind: 'peer-rejected', intentId: string, reason: string }`
- **AND** the guest SHALL surface the reason as a toast

### Requirement: No New HTTP Routes in 4a

The system SHALL NOT introduce any server-side HTTP routes for the 1v1
P2P sync flow, keeping the entire protocol peer-to-peer through the
existing `p2p-sync-system` transport.

#### Scenario: Zero HTTP surface added

- **GIVEN** the api-layer is inspected after this change ships
- **WHEN** the route manifest is listed
- **THEN** the count of HTTP routes SHALL be unchanged from before the
  change
- **AND** all documented multiplayer flows SHALL go through the peer
  channel envelopes defined above
