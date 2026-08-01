## ADDED Requirements

### Requirement: Campaign co-op snapshot preserves roster and force authority

The authoritative server SHALL publish one JSON-safe campaign snapshot containing its campaign id, match id, non-negative integer revision, source-bearing roster units, and complete `forceId -> unitIds` membership. Every membership id SHALL resolve to exactly one projected roster unit, and all consumers SHALL preserve the same revision-bound facts.

#### Scenario: Host builds the snapshot from real campaign state

- **WHEN** a host opens campaign co-op from a persisted campaign roster and force tree
- **THEN** every projected unit SHALL preserve its stable `unitId`, exact `unitRef`, and parsed `unitSource`
- **AND** every projected force SHALL contain exactly its authoritative unit ids
- **AND** registration SHALL fail before advertising a room if any source, reference, campaign id, or membership is invalid

#### Scenario: Registry preserves the registered snapshot

- **WHEN** match creation registers a valid campaign snapshot
- **THEN** `CampaignHostRegistry` SHALL bind the exact campaign id, match id, revision, roster projection, force membership, and host identity
- **AND** revision SHALL equal the inclusive high-water sequence of the latest committed campaign event represented by the atomic state
- **AND** the registry SHALL replace that atomic state only with a strictly greater authoritative revision
- **AND** later bootstrap MUST NOT reconstruct or replace those facts from local defaults

#### Scenario: Guest mirror hydrates the same projection

- **WHEN** an authenticated guest receives the initial campaign snapshot
- **THEN** its revision SHALL equal the registry's current atomic snapshot revision
- **AND** the guest mirror SHALL contain the same campaign id, match id, roster unit sources/references, and force membership as the host
- **AND** event replay SHALL apply only contiguous events strictly after that validated baseline and advance the guest cursor once per accepted event

#### Scenario: Event commits across baseline capture

- **WHEN** a campaign event commits while a guest baseline is being established
- **THEN** live buffering SHALL begin before the atomic revision/state pair is read
- **AND** buffered and logged overlap SHALL be deduplicated while every event after the baseline is delivered exactly once in contiguous sequence
- **AND** no event at or below the baseline revision SHALL be reapplied

#### Scenario: Invalid or stale projection is rejected

- **WHEN** a snapshot is malformed, stale, for a foreign campaign or match, contains an unknown source, references an absent unit, duplicates unit membership, or mixes revisions
- **THEN** registration or guest hydration SHALL reject it before mirror creation
- **AND** a revision below the hydrated guest revision SHALL be stale
- **AND** the same revision SHALL be accepted only for a byte-equivalent idempotent projection
- **AND** a replay gap, regression, event at or below the guest cursor, or non-contiguous revision SHALL be rejected before mutation
- **AND** the client MUST NOT infer missing membership or source identity
