## ADDED Requirements

### Requirement: Saved Custom Unit Readiness Boundary

Mission readiness and materializer preflight SHALL use one shared combat-adaptability guard that requires both persisted `unitSource === canonical` and exact-`unitRef` membership in a trusted `CanonicalCombatCatalogSnapshot`. The runtime-only snapshot SHALL distinguish `loading`, `ready`, and recoverable `unavailable`; browser surfaces SHALL validate `/api/units?includeBV=true`, Node fast-forward SHALL use `NodeCanonicalUnitService`, and failures SHALL NOT become a successful empty catalog. Production call sites SHALL supply the snapshot before synchronous readiness/materializer execution, while materializer itself performs no catalog I/O. Co-op SHALL additionally use an accepted revision-bound host snapshot containing source-bearing roster records and authoritative force membership; participation SHALL carry only minimal force choice while the server derives connection identity. The system SHALL preserve saved custom identity while treating custom, invalid, and unresolvable refs as unavailable for canonical-only combat, and SHALL NOT trust labels or client-authored forces/identity, infer provenance, substitute stock units, or create an encounter, force, or session for a blocked selection.

#### Scenario: Canonical catalog failure blocks honestly

- **GIVEN** the trusted canonical catalog is still loading or cannot be validated
- **WHEN** mission readiness or materializer preflight is requested
- **THEN** launch SHALL remain blocked with an honest loading or retryable unavailable reason
- **AND** the system SHALL NOT classify every canonical roster ref as missing
- **AND** materializer SHALL reject before its first side-effecting fetch

#### Scenario: Saved custom roster unit remains visible but cannot launch

- **GIVEN** a selected campaign roster instance whose `unitRef` identifies a saved custom BattleMech
- **WHEN** mission readiness projects the selected roster
- **THEN** the roster instance SHALL remain visible with its exact roster-instance id and custom `unitRef`
- **AND** its persisted `unitSource` SHALL remain `custom`
- **AND** readiness SHALL mark that instance non-launchable with a canonical-combat-unavailable reason that names the unit
- **AND** the overall launch projection SHALL remain blocked

#### Scenario: Mixed roster can recover to a canonical-only selection

- **GIVEN** a mission roster containing canonical and saved custom units
- **WHEN** readiness creates its default selection
- **THEN** saved custom units SHALL remain visible but unselected and unavailable for selection
- **AND** canonical launch-capable units SHALL remain selectable
- **AND** a stale or restored selected custom row SHALL remain operable only so the player can deselect it
- **AND** launch MAY become ready after all selected units are canonical and other blockers are cleared

#### Scenario: Blocked custom source does not cross materialization

- **GIVEN** mission readiness is blocked by a saved custom roster instance
- **WHEN** materializer preflight receives that selected roster directly or through the launch page
- **THEN** the shared combat-adaptability guard SHALL reject it before the first side-effecting fetch
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
- **AND** force membership SHALL resolve to source-bearing roster records before the trusted catalog guard runs
- **AND** blocked input SHALL make no composition, encounter lookup/create, or launch call

#### Scenario: Existing encounter reuse or downgrade cannot bypass validation

- **GIVEN** a persisted scenario or downgraded runtime sees a selected custom, invalid, forged, stale, loading, or unavailable source
- **WHEN** materializer is invoked directly or compatibility startup evaluates the campaign
- **THEN** compatibility startup SHALL refuse the downgrade before old readiness/materialization, and direct materializer SHALL reject before diagnostics, lookup, reuse success, routing, or mutation
