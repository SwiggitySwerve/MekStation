## ADDED Requirements

### Requirement: Saved Custom Unit Readiness Boundary

Mission readiness and materializer preflight SHALL use one shared source-aware combat-admission guard. The guard SHALL admit a canonical roster instance only when `unitSource === canonical` and its exact `unitRef` is present in the trusted canonical catalog. It SHALL admit a custom roster instance only when `unitSource === custom`, the server library contains the exact persisted reference for a supported server-saved biped BattleMech, and the exact reference is present in the ready snapshot's `customCombatRefs`. A client label, name, tonnage, id prefix, or construction payload SHALL NOT establish eligibility.

The runtime-only catalog snapshot SHALL distinguish `loading`, `ready`, and recoverable `unavailable`. Browser surfaces SHALL validate `/api/units?includeBV=true` and the optional `/api/units/custom/combat-catalog` response before synchronous readiness/materializer execution. Node fast-forward SHALL use `NodeCanonicalUnitService` and a canonical-only snapshot, so fast-forward remains canonical-only even when browser launch supports an eligible custom reference. Catalog transport, parse, empty, or authority failure SHALL NOT become a successful empty catalog. Production call sites SHALL supply the snapshot explicitly, while the materializer SHALL perform no catalog I/O and SHALL validate source/catalog membership before diagnostics, lookup, reuse, routing, or mutation.

Co-op SHALL additionally use an accepted revision-bound host snapshot containing source-bearing roster records and authoritative `forceId -> unitIds` membership. Participation SHALL carry only the minimal force choice; the server SHALL derive match, player, and role from verified connection/registry state and SHALL revalidate source membership and catalog authority at launch. The system SHALL preserve campaign, roster-instance, source-reference, and revision identity, reject forged or stale authority, and never infer provenance or substitute a stock unit.

#### Scenario: Canonical catalog failure blocks honestly

- **GIVEN** the trusted canonical catalog is still loading or cannot be validated
- **WHEN** mission readiness or materializer preflight is requested
- **THEN** launch SHALL remain blocked with an honest loading or retryable unavailable reason
- **AND** the system SHALL NOT classify every canonical roster ref as missing
- **AND** materializer SHALL reject before its first side-effecting fetch

#### Scenario: Supported saved custom roster unit is admitted by exact custom catalog membership

- **GIVEN** a server-saved biped BattleMech accepted by the strict construction projection
- **AND** a selected roster instance has persisted `unitSource === custom`
- **AND** its exact custom `unitRef` is present in the ready snapshot's `customCombatRefs`
- **WHEN** mission readiness and materializer preflight evaluate the selected roster
- **THEN** the roster instance SHALL remain visible with its exact roster-instance id and custom `unitRef`
- **AND** readiness SHALL admit that custom source without canonical or stock substitution
- **AND** launch SHALL resolve the server-persisted construction and preserve the separate game-unit identity
- **AND** the resulting `GameCreated` event SHALL retain the validated construction snapshot defined by `custom-unit-combat`

#### Scenario: Invalid or unavailable saved custom roster unit remains visible but cannot launch

- **GIVEN** a selected custom roster instance is local-only, unsupported, malformed, deleted, stale, absent from `customCombatRefs`, or otherwise unavailable
- **WHEN** mission readiness projects the selected roster
- **THEN** the roster instance SHALL remain visible with its exact roster-instance id, custom `unitRef`, and persisted `unitSource === custom`
- **AND** readiness SHALL mark that instance non-launchable with a stable per-unit custom-source blocker and an honest recovery condition
- **AND** the overall launch projection SHALL remain blocked while that row is selected
- **AND** an unavailable custom catalog SHALL expose retryable state rather than infer eligibility

#### Scenario: Mixed roster can recover to canonical or supported custom selection

- **GIVEN** a mission roster containing canonical units and both supported and unavailable saved custom units
- **WHEN** readiness creates its default selection
- **THEN** unavailable custom units SHALL remain visible but unselected and unavailable for selection
- **AND** exact canonical and supported custom units SHALL remain selectable through their matching catalogs
- **AND** a stale or restored selected unavailable custom row SHALL remain operable so the player can deselect it
- **AND** launch MAY become ready after all selected units have authoritative source membership and other blockers are cleared

#### Scenario: Blocked custom source does not cross materialization

- **GIVEN** mission readiness is blocked by a local-only, unsupported, malformed, deleted, stale, or unavailable custom roster instance
- **WHEN** materializer preflight receives that selected roster directly or through the launch page
- **THEN** the shared source-aware guard SHALL reject it before the first side-effecting fetch
- **AND** no encounter, launch force, or game session SHALL be created or mutated
- **AND** no canonical or stock fallback `unitRef` SHALL replace the saved custom `unitRef`

#### Scenario: Forged canonical label does not bypass preflight

- **GIVEN** a roster projection whose `unitSource` says `canonical` but whose exact `unitRef` does not resolve in the canonical catalog
- **WHEN** readiness or materializer preflight evaluates that unit
- **THEN** the shared guard SHALL mark it non-launchable and name the unresolved canonical record
- **AND** materializer preflight SHALL reject it before the first side-effecting fetch
- **AND** no force, encounter, or game session SHALL be created or mutated

#### Scenario: Co-op contribution cannot forge authority or source validation

- **GIVEN** a client submits `{ missionId, forceId, choice }` or attempts a full force, player, role, foreign force, or stale revision
- **WHEN** the binder validates participation and `launchCoopMission` resolves the accepted force through the revision-bound host snapshot
- **THEN** match, player, and role SHALL come from verified connection/registry state and client-authored authority fields SHALL be rejected
- **AND** force membership SHALL resolve to source-bearing roster records before the trusted canonical or custom catalog guard runs
- **AND** a supported custom source SHALL be admitted only when its exact ref remains present in the accepted custom catalog and its revision matches
- **AND** blocked input SHALL make no composition, encounter lookup/create, or launch call

#### Scenario: Existing encounter reuse or downgrade cannot bypass validation

- **GIVEN** a persisted scenario or downgraded runtime sees an unsupported, invalid, forged, stale, loading, or unavailable custom source
- **WHEN** materializer is invoked directly or compatibility startup evaluates the campaign
- **THEN** compatibility startup SHALL refuse the downgrade before old readiness/materialization, and direct materializer SHALL reject before diagnostics, lookup, reuse success, routing, or mutation

#### Scenario: Canonical-only fast-forward does not infer custom admission

- **GIVEN** fast-forward receives a selected custom source without a custom-capable browser catalog snapshot
- **WHEN** fast-forward evaluates the selected roster
- **THEN** it SHALL reject that selection through the shared guard
- **AND** canonical exact-reference behavior SHALL remain unchanged
