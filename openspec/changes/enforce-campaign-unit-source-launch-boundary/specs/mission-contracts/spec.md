## ADDED Requirements

### Requirement: Campaign launch requires an authoritative canonical source

Every launch boundary SHALL receive an explicit runtime catalog snapshot and SHALL admit only selected units whose source is `canonical` and whose exact `unitRef` is present in the ready snapshot.

Mission launch, Mech Bay readiness, fast-forward, campaign dashboard readiness, `launchCoopMission`, and every materializer caller SHALL use one shared admission guard before diagnostics, lookup, routing, or mutation.

#### Scenario: Canonical mixed-roster selection launches

- **WHEN** a mixed roster contains custom rows plus a selected canonical row with an exact ready-catalog match
- **THEN** the canonical selection SHALL launch once with the selected roster identity
- **AND** the custom row SHALL remain visible but unselected and non-launchable

#### Scenario: Custom selection is blocked without side effects

- **WHEN** a selected roster contains a custom source, invalid source, forged ref, stale ref, or missing catalog membership
- **THEN** readiness and launch SHALL return a stable blocker before encounter diagnostics or materialization
- **AND** encounter lookup, reuse, creation, route calls, session launch, and mutation counts SHALL remain zero

#### Scenario: Catalog state is explicit

- **WHEN** the catalog is loading, malformed, failed, empty, or unavailable
- **THEN** the launch surface SHALL show a retryable unavailable/loading state
- **AND** it MUST NOT treat failure as an empty successful catalog or launch a canonical unit

#### Scenario: Co-op launch revalidates authority

- **WHEN** a co-op launch receives a missing, foreign, stale, or revision-mismatched campaign snapshot
- **THEN** launch SHALL reject before composition or `launchCampaignEncounter`
- **AND** the client MUST NOT synthesize source identity, force membership, or a stock fallback

#### Scenario: Every caller fails closed consistently

- **WHEN** any named caller receives a custom, invalid, stale, missing, loading, unavailable, foreign, or revision-mismatched source/snapshot
- **THEN** the shared guard SHALL return the same condition-specific stable blocker across callers before caller-specific work
- **AND** custom or invalid selections SHALL retain per-unit canonical-combat-unavailable reasons, while loading or unavailable catalogs SHALL retain retryable surface status
- **AND** lookup, reuse, creation, route, session, launch, and mutation observations SHALL all remain zero
