## ADDED Requirements

### Requirement: Roster unit source parsing is fail-closed

Persisted campaign roster units SHALL use the closed source values `canonical` or `custom`. Only an absent legacy source SHALL normalize to `canonical`; every present unknown value SHALL remain invalid, non-launchable, and unchanged in persistence.

#### Scenario: Absent legacy source resolves canonical

- **WHEN** a legacy roster unit has a valid canonical `unitRef` and no persisted source field
- **THEN** source parsing SHALL return the legacy canonical resolution
- **AND** readiness MAY resolve the exact canonical reference

#### Scenario: Explicit source remains authoritative

- **WHEN** a roster unit persists `canonical` or `custom`
- **THEN** parsing SHALL preserve that exact source
- **AND** the system MUST NOT infer a different source from its `unitRef`

#### Scenario: Unknown source cannot downgrade

- **WHEN** a roster unit has a present unknown, malformed, forged, or stale source value
- **THEN** it SHALL remain invalid and non-launchable
- **AND** validation MUST NOT rewrite, omit, or normalize it to `canonical`

### Requirement: Canonical combat catalog readiness is explicit

Campaign launch SHALL consume one runtime-only canonical catalog snapshot in state `loading`, `ready`, or `unavailable`. Browser loading SHALL validate `/api/units?includeBV=true`; Node fast-forward loading SHALL use `NodeCanonicalUnitService`; failure MUST NOT become an empty successful catalog.

#### Scenario: Ready catalog resolves an exact reference

- **WHEN** a canonical roster unit's exact `unitRef` exists in a ready catalog
- **THEN** readiness SHALL mark that source reference launch-eligible

#### Scenario: Loading or unavailable catalog blocks visibly

- **WHEN** the catalog is loading, malformed, failed, or unavailable
- **THEN** readiness SHALL preserve the roster unit with a stable retryable blocker
- **AND** encounter materialization SHALL NOT begin

## MODIFIED Requirements

### Requirement: Mission readiness projection

Mission launch SHALL use an explicit readiness projection that includes mission constraints, eligible units, ineligible units, pilot readiness, selected roster, unresolved blockers, launch consequences, parsed unit source, and canonical catalog readiness. The shared source/reference guard SHALL run before encounter diagnostics, lookup, reuse, routing, or mutation.

#### Scenario: Launch gate blocks invalid roster

- **WHEN** the selected roster violates mission constraints, unit readiness, source identity, or exact-reference rules
- **THEN** mission launch SHALL be blocked and SHALL show each blocking reason before encounter materialization can run
- **AND** no encounter lookup, persisted `scenarioIds` reuse result, route call, or state mutation SHALL occur

#### Scenario: Encounter receives selected roster

- **WHEN** the player confirms a roster whose canonical sources resolve exactly in a ready catalog
- **THEN** encounter materialization SHALL receive the selected campaign roster units and SHALL NOT silently replace missing or invalid campaign units with stock fallback units
