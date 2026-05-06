# Quick Session (delta — retrofit)

## ADDED Requirements

### Requirement: BV Prewarm Required Before Force Generation

The swarm CLI runner at `scripts/run-simulation.ts` SHALL prewarm Battle Value across the catalog before invoking `generateRandomForce`. The prewarmer at `src/services/encounter/bvCatalogPrewarmer.ts` enriches each `IUnitIndexEntry` with a `bv` field. Without prewarming, the catalog index has no `bv` data (the on-disk index does not store BV) and `generateRandomForce` throws `BudgetUnsatisfiableError` because every entry appears as 0 BV.

#### Scenario: Cold run on pristine cache prewarms catalog

- **GIVEN** a fresh run of `scripts/run-simulation.ts --config=<config> --runs=10`
- **AND** no `.cache/swarm-bv-cache.json` exists
- **WHEN** the runner starts
- **THEN** the prewarmer MUST run before any `generateRandomForce` invocation
- **AND** the prewarmer MUST log progress and final populated/skipped counts
- **AND** `BudgetUnsatisfiableError` MUST NOT be thrown on subsequent force generation

#### Scenario: Warm run with valid cache skips full rebuild

- **GIVEN** a previous run wrote `.cache/swarm-bv-cache.json` for the current catalog version
- **WHEN** a new run of the same config executes
- **THEN** the prewarmer MUST hit the cache and complete in milliseconds
- **AND** the cached BV map MUST be applied to the in-memory catalog without disk re-reads of unit JSONs

### Requirement: Two-Tier BV Resolution

The prewarmer SHALL resolve per-unit BV in two tiers: Tier 1 reads `validation-output/bv-validation-report.json` and stamps `calculatedBV` per `unitId`; Tier 2 falls back to `calculateUnitBV()` from `src/utils/construction/bvAdapter.ts` for any catalog entry the report does not cover. Entries that resolve to 0 in BOTH tiers MUST be returned with `bv: 0` and MUST be filtered out as ineligible by `generateRandomForce`'s budget sanity check.

#### Scenario: Atlas resolves from Tier 1 report

- **GIVEN** the validation report covers `atlas-as7-d`
- **WHEN** the prewarmer resolves Atlas
- **THEN** the entry's `bv` MUST equal the report's `calculatedBV` for that unitId
- **AND** Tier 2 fallback MUST NOT be invoked

#### Scenario: Tripod chassis falls back to Tier 2

- **GIVEN** a Tripod unit absent from the validation report
- **WHEN** the prewarmer resolves it
- **THEN** Tier 2 (`calculateUnitBV`) MUST be invoked
- **AND** the resulting BV MAY be 0 (Tripods are unsupported by the construction-side calculator); 0-BV entries MUST be filtered as ineligible

### Requirement: Disk Cache Keyed on Catalog Version + Total Units

The prewarmer SHALL persist results to `.cache/swarm-bv-cache.json` after a cold rebuild. The cache file MUST contain `catalogVersion`, `catalogTotalUnits`, `bvByUnitId`, and `generatedAt`. Cache reads MUST validate BOTH `catalogVersion` AND `catalogTotalUnits` match current catalog state; mismatch on either field MUST treat the cache as a miss and trigger rebuild.

#### Scenario: Catalog version regen invalidates cache

- **GIVEN** an existing cache with `catalogVersion: '1.0.0'`
- **AND** the catalog index regenerates with `version: '1.1.0'`
- **WHEN** the prewarmer reads the cache
- **THEN** the cache MUST be treated as a miss
- **AND** rebuild MUST proceed

#### Scenario: Stale catalog total invalidates cache

- **GIVEN** an existing cache with `catalogTotalUnits: 4225`
- **AND** the catalog has been pruned to `totalUnits: 4100`
- **WHEN** the prewarmer reads the cache
- **THEN** the cache MUST be treated as a miss

### Requirement: Cache Path Is Gitignored and Test-Overridable

The cache file at `.cache/swarm-bv-cache.json` MUST be gitignored. The prewarmer's `cacheFilePath` option MUST be overridable for tests; default is `process.cwd()/.cache/swarm-bv-cache.json`. The `bvReportPath` option MUST also be overridable for tests with default `process.cwd()/validation-output/bv-validation-report.json`.

#### Scenario: Test passes fixture report path

- **GIVEN** a unit test with a fixture BV report at a non-default path
- **WHEN** the test calls `prewarmCatalogBV(catalog, service, version, { bvReportPath: <fixture> })`
- **THEN** the prewarmer MUST load BV from the fixture, NOT from the production validation-output path
