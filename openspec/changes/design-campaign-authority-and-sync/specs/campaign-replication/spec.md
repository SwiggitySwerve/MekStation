# Campaign Replication

## ADDED Requirements

### Requirement: Sharing issues grants; grants create replicas that know their provenance
The source instance SHALL expose a share function that issues grants. A grant SHALL name the campaign, the participant identity it is issued to, and the access scope it carries (per campaign-access-projection). Redeeming a grant SHALL instantiate a replica instance on the consuming device that permanently records: the source instance identity, the grant id, its scope, and the fact that it is a replica. A replica SHALL present itself as a replica in every surface that shows campaign identity.

#### Scenario: One source, many shared instances
- **WHEN** the source issues grants to three participants and each redeems on their own device
- **THEN** three replica instances SHALL exist, each bound to the same source campaign id, each knowing it is not the source, and the source SHALL list all three active grants

#### Scenario: Grant revocation stops replication
- **WHEN** the source revokes a grant
- **THEN** the corresponding replica SHALL stop receiving events at the revocation point, SHALL retain its already-received history, and SHALL surface its revoked status

### Requirement: Replicas receive their stream continuously with cursor-resumable catch-up
A connected replica SHALL receive its scope-filtered event stream over a persistent connection as events are appended at the source. Each replica SHALL track a per-scope cursor (last applied per-scope sequence). On reconnect, the replica SHALL resume from its cursor and receive every missed in-scope event exactly once (idempotent apply by per-scope sequence). A newly redeemed grant SHALL backfill the campaign's in-scope history from the beginning, so a late-joining participant sees everything their perspective allows across the whole campaign, not merely from join time.

#### Scenario: Late joiner sees scoped history from day one
- **WHEN** a participant redeems a grant on day 40 of a campaign whose scope-visible history begins on day 1
- **THEN** their replica SHALL backfill all in-scope events from per-scope sequence 1 and render the same scoped history any day-1 participant with the same scope would have

#### Scenario: Reconnect resumes without loss or duplication
- **WHEN** a replica disconnects at per-scope sequence N and reconnects while the source has advanced
- **THEN** the replica SHALL receive exactly the in-scope events with sequence > N, in order, and applying them SHALL be idempotent

### Requirement: Each consuming device persists its replica durably on its own local server
A replica SHALL be persisted by the consuming device's own server process (the packaged app's local server / the dev server), in that device's durable store — not solely in browser storage — so the replica survives restarts and supports offline reading of already-received history. Replica reads MUST work offline; replica mutations MUST NOT execute offline (they are source-bound).

#### Scenario: Replica survives restart and reads offline
- **WHEN** a replica device restarts with no network access to the source
- **THEN** the replica SHALL load its stored scoped history and render it read-only, clearly indicating disconnection from the source

### Requirement: Mutation intents route to the source; the source never loses state to a downstream failure
All campaign mutations initiated from a replica SHALL be transmitted to the source as command intents and executed (or rejected) there. Broadcast to downstream consumers SHALL occur only after the source's durable append; failure, disconnection, or corruption of any downstream device SHALL NOT alter or lose source state.

#### Scenario: Downstream crash cannot corrupt the source
- **WHEN** a replica device crashes mid-broadcast or applies its stream incorrectly
- **THEN** the source stream SHALL be unaffected and the replica SHALL recover by resuming (or re-backfilling) from the source

#### Scenario: Replica-originated command round-trip
- **WHEN** a participant with a scope that permits an action (for example, moving their own lance) submits that command from their replica
- **THEN** the command SHALL execute at the source, the resulting events SHALL broadcast to every grant whose scope includes them, and the submitting replica SHALL see the outcome through the same stream as everyone else
