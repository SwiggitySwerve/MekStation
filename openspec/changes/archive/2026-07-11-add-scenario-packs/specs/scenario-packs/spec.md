# scenario-packs Specification (Delta)

## Purpose

Defines the scenario pack layer: a generator-minted registry of named, reusable start states — campaign packs (serialized campaign envelopes) and encounter packs (captured match-log event streams) — that Playwright tests load **through the front door** (PUT + `goto` riding the production campaign load path; IndexedDB seed + cold `goto` riding the production recovery factory) to jump to mid-campaign and mid-battle states without click-through setup. Packs are caches; their genesis journeys are the source of truth: every pack is minted from a real journey or a sanctioned generator run, validated fail-loud at load, stamped with parallel-safe id templates, version-pinned, and re-captured-and-diffed in CI so drift is loud. Packs gate nothing until parity-proven, and they never displace the seam trust anchor journeys. (This Purpose is authored in the delta so the archive-time capability spec does not ship a TBD placeholder.)

## ADDED Requirements

### Requirement: Scenario Pack Registry and Manifest

The system SHALL maintain a scenario pack registry at `e2e/scenario-packs/` consisting of a typed manifest module and generator-minted payload files: campaign packs as `campaign/<id>.campaign.json` (a serialized campaign envelope as specified by `campaign-persistence`) and encounter packs as `encounter/<id>.matchlog.json` (a captured match-log event stream with its matches-row fields). Every payload file SHALL have exactly one manifest entry and every manifest entry exactly one payload file. Each manifest entry SHALL declare: a unique kebab-case `id`; a `kind` of `campaign` or `encounter`; `subsystems` drawn from the closed six-tag vocabulary (`navigation`, `combat`, `economy`, `maintenance`, `personnel`, `experience` — the same literal set as the flow-audit registry's subsystem vocabulary); `viewports`; a `targetRoute` template the loader substitutes the stamped id into; a `parityAnchorJourney` binding; the payload path; provenance (genesis source, minted-at date, base commit); version pins (the envelope schema version the pack was minted at for campaign packs; the match-log database version for encounter packs); and any post-load actions from the closed post-load vocabulary. The manifest module SHALL carry its own `manifestVersion` field, distinct from and never conflated with the campaign envelope's schema version, and registry validation SHALL fail loud when the manifest module's declared `manifestVersion` does not equal the pack library's exported manifest-version constant — a pin nobody compares is a pin that cannot fail.

#### Scenario: Registry and manifest are one-to-one

- **WHEN** the scenario pack registry is validated
- **THEN** every payload file under `e2e/scenario-packs/` SHALL have exactly one manifest entry and every manifest entry SHALL resolve to exactly one existing payload file
- **AND** a payload without an entry, or an entry without a payload, SHALL fail the pack library's registry tests

#### Scenario: Subsystem vocabulary stays closed and aligned

- **WHEN** a manifest entry declares its subsystems
- **THEN** each tag SHALL be one of the six closed vocabulary literals
- **AND** a guard test SHALL assert the pack vocabulary and the flow-audit registry's subsystem vocabulary are the same literal set

#### Scenario: Manifest versioning is independent of envelope versioning

- **WHEN** the pack manifest format changes shape
- **THEN** the change SHALL be expressed by bumping `manifestVersion`
- **AND** the campaign envelope's schema version and migration ladder SHALL be unaffected by manifest format evolution

#### Scenario: A stale manifest version fails registry validation

- **GIVEN** a manifest module whose declared `manifestVersion` does not equal the pack library's exported manifest-version constant
- **WHEN** the registry tests run
- **THEN** they SHALL fail identifying the manifest-version mismatch

### Requirement: Packs Are Generator-Minted, Never Hand-Authored

Every pack payload SHALL be produced by a registered minter — mint-from-flow-checkpoint (driving a registered flow-audit flow to a named server-persisted checkpoint and capturing the campaign envelope through the live API), mint-from-fast-forward (dumping a `campaign-fast-forward-api` run via the production envelope builder), or capture-matchlog (capturing a genesis journey's real IndexedDB match-log event stream) — and SHALL record its provenance (genesis source, minted-at date, base commit) in the manifest. Hand-authoring or hand-editing a pack payload SHALL NOT occur, including as a bootstrap for a pack whose upstream gate has not landed: a pack that cannot yet be generator-minted does not yet exist. Campaign-pack genesis capture points SHALL be server-persisted states reached through real journeys or sanctioned generator runs; states seeded by store injection SHALL NOT be pack genesis sources.

#### Scenario: Every pack carries provenance

- **WHEN** a pack is added to or re-minted in the registry
- **THEN** its manifest entry SHALL record the genesis source, the minted-at date, and the base commit of the mint

#### Scenario: Store-injected states are ineligible genesis sources

- **GIVEN** a journey state reached by writing application stores directly (for example a flow-audit checkpoint marked not server-persisted, seeded via store injection)
- **WHEN** pack genesis sources are chosen
- **THEN** that state SHALL NOT be captured as a pack payload
- **AND** the pack for that subsystem SHALL instead be minted from a server-persisted state reached through the front door

#### Scenario: A gated pack is never hand-faked

- **GIVEN** a pack whose genesis source depends on an unmerged upstream implementation
- **WHEN** the upstream gate check fails
- **THEN** the pack SHALL NOT be created from a hand-authored or substitute payload
- **AND** the registry SHALL simply not contain that pack until its genesis source exists

### Requirement: Front-Door Loading Contract

The system SHALL provide two pack loaders that enter the application exclusively through real route mounts. `loadCampaignPack` SHALL validate the payload, stamp ids, PUT the envelope with a base version to the production campaigns API route, navigate to the pack's target route via `page.goto`, and wait for the production route-mount load (the campaign shell's automatic GET → migrate → deserialize → store-write chain) to complete — it SHALL NOT write application stores directly and SHALL NOT bypass the campaign shell's load path. `loadEncounterPack` SHALL validate the payload, stamp ids, seed the browser IndexedDB match log through the shared match-log seeding helper, and cold-navigate to the gameplay route so the production recovery factory chain performs the hydration — it SHALL NOT pre-populate any in-memory session state. Post-load actions, where a pack's manifest declares them, SHALL be real front-door UI interactions on the mounted page, drawn from a closed vocabulary (initially exactly `advance-day`); adding a post-load action verb SHALL require a delta to this requirement.

#### Scenario: Campaign packs ride the production load path

- **WHEN** `loadCampaignPack` loads a campaign pack
- **THEN** the envelope SHALL reach the server through the production campaigns PUT route
- **AND** the browser SHALL reach the pack's target route through `page.goto`, with the campaign state entering the client exclusively through the shell's own mount-time load chain

#### Scenario: Encounter packs ride the production recovery factory

- **WHEN** `loadEncounterPack` loads an encounter pack
- **THEN** the match-log records SHALL be seeded into the browser IndexedDB stores through the shared match-log seeding helper
- **AND** the session SHALL be reconstructed exclusively by the production recovery chain triggered by a cold route navigation

#### Scenario: Store injection past a mount seam is banned

- **WHEN** any pack loader or pack-consuming spec establishes a pack's start state
- **THEN** it SHALL NOT write application stores directly for any state with a mount seam
- **AND** a maintenance-class projection that production populates only through day advancement SHALL be populated by driving the production control as a declared post-load action, never by writing the projection

### Requirement: Fail-Loud Validation at Load

Both loaders SHALL validate the pack payload with the pack library's zod schemas **before** any PUT or IndexedDB write, and SHALL throw naming the offending path on failure — never soft-skip, never rely on the production route's shallow envelope guard as the validation layer. Campaign-pack validation SHALL cover the full envelope skeleton, every body field the production deserializer hard-depends on — including the campaign's identity, name, faction, forces, root force, missions, faction standings, options, campaign type, and created/updated fields, the finances transactions array and balance, and parseable date-time strings for the campaign current date and other date-valued fields (an unparseable date deserializes to an invalid date silently) — and every load-bearing id field the load path and the id stamper depend on, including the roster projection's nested linkage ids, while tolerating unknown additive keys. Encounter-pack validation SHALL require an ordered event stream whose first event by sequence is the game-created event, and a finite persisted engine seed on that event's config, rejecting unseeded match logs. The loaders SHALL assert the payload's version pins at their consultation sites: a campaign pack SHALL match its manifest's envelope schema version pin and SHALL NOT claim a version newer than the current campaign schema version — older migratable packs load through the production migration ladder unchanged, and the pack layer SHALL NOT duplicate or shadow the migration ladder; an encounter pack's manifest match-log database version pin SHALL strictly equal the live match-log database version constant, failing loud on any mismatch in either direction before any IndexedDB write, because the match-log store has no migration ladder and the only remedy for a stale capture is a re-capture. After navigation, `loadCampaignPack` SHALL determine the mount-time load outcome from the persistence store's own state: a load the production path reports as failed SHALL surface as a thrown error naming the store's reported error message, never as a generic mount-signal timeout.

#### Scenario: A malformed pack fails before it touches the server

- **GIVEN** a campaign pack payload whose body shape has drifted from the schema
- **WHEN** `loadCampaignPack` runs
- **THEN** it SHALL throw naming the failing path before any PUT is issued
- **AND** no campaign row SHALL be created for that load

#### Scenario: A future-versioned pack fails loud

- **GIVEN** a campaign pack claiming a schema version newer than the current campaign schema version
- **WHEN** the loader validates it
- **THEN** it SHALL throw identifying the version mismatch, since no sanctioned minter can have produced it

#### Scenario: An older migratable pack rides the production ladder

- **GIVEN** a campaign pack minted at an older schema version that the production migration ladder can migrate
- **WHEN** it is loaded and the shell's mount-time GET runs
- **THEN** the production migration SHALL apply exactly as it does for real saves
- **AND** the pack layer SHALL perform no migration of its own

#### Scenario: An unseeded or misordered match log is rejected

- **GIVEN** an encounter pack whose first-by-sequence event is not the game-created event, or whose game-created config carries no finite seed
- **WHEN** `loadEncounterPack` validates it
- **THEN** it SHALL throw before any IndexedDB write, naming the violated rule

#### Scenario: A stale encounter pack pin fails loud

- **GIVEN** an encounter pack whose manifest match-log database version pin differs from the live match-log database version constant
- **WHEN** `loadEncounterPack` validates it
- **THEN** it SHALL throw identifying the pin mismatch before any IndexedDB write
- **AND** the remedy SHALL be a re-capture of the pack, never a loader-side tolerance

#### Scenario: A client-side load failure surfaces loud and named

- **GIVEN** a campaign pack that passes pre-PUT validation but whose mount-time load fails client-side (during migration, deserialization, or roster restoration, or because the row is missing)
- **WHEN** `loadCampaignPack` awaits the load outcome after navigation
- **THEN** it SHALL throw naming the persistence store's reported error message
- **AND** it SHALL NOT report the failure as a generic mount-signal timeout

### Requirement: Parallel-Safe Graph-Aware Id Templating

Pack payloads are id-templates **by construction**: the minter SHALL canonicalize the captured id graph to deterministic, role-ordinal, pack-scoped template ids before writing the payload — applying the same graph-aware remap semantics and zero-residue scan as the load-time stamper, so no wall-clock-minted production id survives in a payload's remapped id families and two mints of the same deterministic state carry identical id graphs. The minter SHALL also strip cross-store references that do not travel with a campaign pack — at minimum the roster-projection mission records' encounter and game-session references — so no pack payload carries a reference that would dangle in the loading browser. At load, before any PUT or seed, the loader SHALL stamp fresh identifiers using the `${packId}-w${workerIndex}-${uuid}` template, so parallel test workers never share a persisted row. Stamping SHALL be graph-aware: a remap table (canonical template id → stamped id) SHALL be built once per load and applied at every occurrence of each remapped id — for campaign packs at minimum the envelope campaign id, the body id, the roster projection's own campaign id, and every roster-projection mission record's campaign id; for encounter packs the match id across the matches row, every match-event record, and every event-payload field carrying it. Session-scoped deployed unit ids SHALL NOT be remapped. After stamping, the serialized payload SHALL contain zero occurrences of any id the remap table maps from; a residue occurrence SHALL fail the load naming its path.

#### Scenario: Parallel loads never share a row

- **WHEN** two test workers load the same pack concurrently
- **THEN** each load SHALL produce a distinct stamped primary id
- **AND** the two loads SHALL touch disjoint persisted rows

#### Scenario: The stamped graph is internally consistent

- **WHEN** a campaign pack load completes
- **THEN** the route id, the envelope campaign id, the body id, and the roster projection's campaign id SHALL all equal the same stamped value
- **AND** no internal cross-reference SHALL still point at a pre-stamp template id

#### Scenario: Zero-residue is enforced mechanically

- **GIVEN** a pack payload carrying a remapped id in a field the schema does not enumerate
- **WHEN** the stamper serializes the stamped payload
- **THEN** the residue scan SHALL detect the un-stamped occurrence and fail the load naming its path

#### Scenario: Minted payloads carry canonical template ids

- **WHEN** a minter writes a pack payload
- **THEN** the payload's remapped id families SHALL consist of deterministic pack-scoped template ids that are identical across re-mints of the same state
- **AND** a wall-clock-minted production id surviving canonicalization SHALL fail the mint naming its path

#### Scenario: Cross-store references never dangle

- **GIVEN** a captured campaign state whose roster mission records reference an encounter or a game session
- **WHEN** the pack is minted
- **THEN** the canonicalizer SHALL strip those references from the payload, since the referenced rows do not travel with the pack
- **AND** no pack parity spec SHALL assert encounter-link or replay affordances on pack-loaded mission history

### Requirement: Version Pinning and CI Drift Recapture

The nightly validation workflow SHALL include a scenario-pack recapture job that, for every manifest entry: re-validates the committed payload against the current pack schemas and version pins; re-mints the pack from its recorded genesis source and validates the fresh mint identically; and compares the fresh mint against the committed pack **at the invariant level** — the pack's genesis-class invariant set: a flow-checkpoint pack's checkpoint invariant predicates asserted on both payloads, a fast-forward pack's enumerated invariant-level field set per the `campaign-fast-forward-api` determinism contract, and a matchlog pack's seed-agnostic anchor invariant set. Structural payload equality SHALL NOT be asserted: production mints wall-clock identifiers, a random per-campaign RNG seed, and wall-clock engine seeds, so byte-identical re-mints are unachievable by construction; the structural checks SHALL be bounded to schema and pin validation plus the canonical id graph. A violation SHALL fail the job naming the pack and the violated invariant or path, and the failure SHALL surface through the workflow's existing failure-notification job. The recapture job is drift triage only: it SHALL NOT be a pull-request gate; each pack's comparison set SHALL be its genesis journey's declared invariant set, and relaxing an invariant or narrowing a comparison SHALL require a delta to this requirement — never an inline comparator edit. Screenshot comparison SHALL NOT be the recapture transport.

#### Scenario: Drift fails the recapture loudly

- **GIVEN** a committed pack whose payload no longer passes the current schemas or pins, or whose genesis source now reaches a state violating the pack's declared invariant set
- **WHEN** the nightly recapture job runs
- **THEN** the job SHALL fail naming the pack and the violated invariant or path
- **AND** the existing failure-notification job SHALL be triggered by it

#### Scenario: A quiet night is achievable by construction

- **GIVEN** a committed pack whose genesis source still reaches an invariant-equal state
- **WHEN** the recapture job re-mints it and the two payloads differ only in run-varying production content (calendar anchor, RNG-derived market content, per-capture engine rolls)
- **THEN** the job SHALL pass
- **AND** no comparison exclusion SHALL need widening to keep it green

#### Scenario: Comparison stays invariant-level and bounded

- **WHEN** a recapture divergence is triaged
- **THEN** the comparison SHALL be against the pack's declared genesis invariant set
- **AND** relaxing an invariant or excluding a new field class SHALL require a delta to this requirement, never an inline comparator edit

#### Scenario: Recapture is not a gate

- **WHEN** the recapture job fails
- **THEN** no pull-request check SHALL be blocked by it
- **AND** the failure SHALL be triaged as pack drift — re-mint if the genesis change is intended, fix the regression if not

### Requirement: Parity Binding and the Pack Gate Rule

Every pack SHALL declare a `parityAnchorJourney` binding naming the genesis journey whose live-reached state is the truth the pack caches — a flow-audit flow checkpoint, a seam trust anchor journey, or a fast-forward fixture — and SHALL ship with a parity spec that loads the pack through its front-door loader and hard-asserts, at the pack's target route, the same invariants its genesis journey asserts at that state. Packs SHALL gate nothing until parity-proven: no pack or pack-consuming spec SHALL be wired into pull-request gating, and promoting any pack into a gate SHALL require an explicit delta to this requirement plus a green `campaign-fast-forward-api` live-parity acceptance — never a quiet CI edit. Fast-forward-minted packs additionally inherit that acceptance's recorded consequence: while it is failing or unproven, they remain triage-only. The seam trust anchor journeys retain permanent authority over their seams regardless of pack parity results; no pack SHALL replace, soften, or descope an anchor, per the journey-qc seam trust anchor requirement.

#### Scenario: Every pack is parity-bound

- **WHEN** a pack is registered in the manifest
- **THEN** it SHALL declare a parity anchor journey binding
- **AND** a parity spec SHALL exist that loads the pack and asserts its genesis journey's invariants on the loaded state

#### Scenario: Unproven packs gate nothing

- **GIVEN** a pack whose parity spec has not been proven stable, or a fast-forward-minted pack while the live-parity acceptance is failing or unproven
- **WHEN** CI configuration is reviewed
- **THEN** no pull-request gate SHALL depend on that pack

#### Scenario: Anchors retain authority over packs

- **WHEN** a pack covers surface overlapping a seam trust anchor journey
- **THEN** the anchor SHALL remain in the suite with its hard assertions intact
- **AND** any proposal to substitute pack coverage for an anchor SHALL be expressed as a delta to the anchors' owning requirement, never as a pack-side change

#### Scenario: Gate promotion is explicit or not at all

- **WHEN** a future change proposes using a pack or pack-consuming spec as a pull-request gate
- **THEN** the proposal SHALL include a delta to this requirement naming the pack and the evidence
- **AND** absent such a delta, pack-consuming specs SHALL remain excluded from required checks

### Requirement: Pilot Pack Coverage Across Subsystems

The registry SHALL grow to at least one pilot pack per subsystem tag, each minted from the genesis source recorded in its manifest: navigation, personnel, and experience packs minted from server-persisted flow-audit checkpoints; the combat encounter pack captured from the fresh-construction seam anchor's session (gated on the W2 implementation); the economy and maintenance packs dumped from fast-forward runs (gated on the W3 implementation). The maintenance pack SHALL declare the advance-day post-load action so the repair projection is populated by the production day pipeline, and its documented target state SHALL account for the one production day the action advances. Gated packs SHALL land only after their gate checks pass; subsystem coverage SHALL NOT be reached early by hand-faking a gated pack.

#### Scenario: Ungated packs mint from merged surface

- **WHEN** the navigation, personnel, and experience pilot packs are minted
- **THEN** each SHALL be captured from a server-persisted checkpoint of a merged flow-audit flow through the live API
- **AND** each SHALL ship with its parity spec in the same task group

#### Scenario: Gated packs wait for their gates

- **GIVEN** the combat, economy, or maintenance pilot pack
- **WHEN** its upstream gate check has not passed on the current tree
- **THEN** the pack SHALL NOT exist in the registry
- **AND** the gate check SHALL be re-run before the pack's minting task begins

#### Scenario: The maintenance pack populates its projection through the front door

- **WHEN** the maintenance pack is loaded
- **THEN** the loader SHALL drive the production advance-day control as its declared post-load action
- **AND** the repair projection SHALL be populated by the production day pipeline, never written directly

### Requirement: Pack Spec Registration and Scoping

Pack parity specs and any pack-consuming spec under `e2e/scenario-packs/` SHALL be scheduled under the desktop chromium project only: the responsive viewport projects SHALL exclude the scenario-packs directory via `testIgnore`, and pack specs SHALL NOT carry the smoke tag. A dedicated `verify:qc:scenario-packs` package script SHALL run the pack library's unit suites and the pack parity specs at a single worker under the chromium project, providing the local runnability lane (and the future W6 wiring hook — wiring it into pull-request checks is out of this capability's scope). Pack specs SHALL NOT be added to the required seven-journey catalog.

#### Scenario: Pack specs are excluded from viewport multiplication

- **WHEN** an operator lists the scheduled tests for a pack spec
- **THEN** the spec SHALL be scheduled only under the desktop chromium project
- **AND** the responsive projects SHALL NOT schedule any spec under the scenario-packs directory

#### Scenario: Packs are locally runnable through one lane

- **WHEN** an operator runs the scenario-pack verify lane
- **THEN** it SHALL execute the pack library unit suites and the pack parity specs under the chromium project at a single worker

## Notes

- Codifies the pack half of the 2026-07-09 council decision (`openspec/council-decisions/2026-07-09-ui-audit-testability-architecture.md`, Seam-First Ladder W4, Phase 3 updates 2–3): packs are caches, genesis journeys are truth; id-templates with loader stamping; four-layer drift defense. Dissent recorded there and honored here: packs gate nothing until parity-proven (Prometheus's packs-as-gate future requires an explicit delta; Hephaestus/Oracle's unpackable-seams position keeps the anchors authoritative forever).
- This capability owns the pack layer only. The campaign envelope, schema-version migration ladder, server persistence contract, and stale-write conflict detection are owned by `campaign-persistence`; the fast-forward driver, run report, and live-parity acceptance by `campaign-fast-forward-api`; the seam trust anchor journeys by `journey-qc` (landing via `add-seam-trust-anchor-journeys`); the flow registry and checkpoint semantics by `flow-audit-routines`. This spec references those contracts and never restates them.
- The production campaigns PUT route's shallow envelope guard is a documented pre-existing gap this capability defends against loader-side; fixing the route is a separate future change (see the change's design Open Questions).
