## ADDED Requirements

### Requirement: Packaged Production Listener Uses the Configured Loopback

The package-owned config SHALL select packaged mode only with a `.next` directory;
absent config is nonpackaged regardless of `.next`, while config without it
fails before Next. Ambient `NODE_ENV` cannot select/downgrade mode. Packaged
accepts only omitted/`127.0.0.1`; nonpackaged only omitted/`localhost`/loopback;
every other host rejects before Next and the resolved literal reaches listener.

#### Scenario: Explicit IPv4 loopback binds the actual listener

- **GIVEN** the production server starts with `HOSTNAME=127.0.0.1`
- **WHEN** the HTTP/WebSocket listener begins accepting connections
- **THEN** the listener MUST receive `127.0.0.1` as its host
- **AND** its actual bound address MUST equal `127.0.0.1`
- **AND** it MUST NOT bind `0.0.0.0` or `::`

#### Scenario: Omitted production hostname fails safe to loopback

- **GIVEN** the production server starts without `HOSTNAME`
- **WHEN** its listener configuration is resolved
- **THEN** the configured and actual listener address MUST be `127.0.0.1`

#### Scenario: Unsafe production hostname is rejected before listening

- **GIVEN** a fixed standalone layout receives `""`, `" "`, `localhost`,
  `127.0.0.2`, `192.168.1.10`, `0.0.0.0`, `::`, `::1`, or `not-an-ip`
- **WHEN** startup validates with ambient `NODE_ENV` unset or `development`
- **THEN** startup MUST fail before the first Next import, `prepare()`,
  `listen()`, or listener-ready evidence
- **AND** every rejected process MUST produce its bounded configuration error
  before a test-only `Module._load` guard observes request `next`
- **AND** no campaign, custom-unit, force, encounter, HTTP, or WebSocket route
  MUST accept traffic

#### Scenario: Marker truth table preserves development and fails partial package

- **WHEN** config is absent with `.next` absent or present
- **THEN** mode MUST be nonpackaged and omitted host MUST remain `localhost`
- **WHEN** config exists without a `.next` directory
- **THEN** startup MUST fail before the first Next import

### Requirement: Packaged Listener Authority Is Process-Proven

The packaged-socket validator SHALL prove the operating system socket identity
through a closed machine record derived from `server.address()` for both the
initial packaged start and the restart. A configured environment variable,
Next.js option, human-readable log, static source assertion, or successful
loopback request MUST NOT satisfy this requirement by itself.

#### Scenario: Initial start and restart prove matching listener identities

- **WHEN** `validate:multiplayer:packaged-socket` starts the production server,
  exercises the existing HTTP/WebSocket flow, restarts it, and reconnects
- **THEN** initial MUST omit `HOSTNAME`/`NODE_ENV`; restart MUST set loopback
  plus ambient `NODE_ENV=development`, yet both MUST select packaged mode
- **AND** each owned process MUST publish exactly one closed listener record
- **AND** each record's actual address, family, and port MUST match that
  invocation's configured address and requested port
- **AND** the initial and restarted processes MUST prove the same loopback
  identity
- **AND** the existing match creation, replay, persistence, and same-match
  reconnect assertions MUST still pass

#### Scenario: Invalid listener evidence fails the gate

- **WHEN** a listener record is missing, duplicate, malformed, has unknown
  fields, reports a pipe address, reports the wrong port or family, reports an
  unspecified or non-loopback address, or differs from its configured address
- **THEN** the validator MUST fail before publishing a successful result
- **AND** any line containing the listener prefix outside the exact
  `MEKSTATION_LISTENER_READY <compact-json>\n` framing MUST fail
- **AND** it MUST reject a ready line over 1024 bytes or a non-integer/out-of-range
  port, accept exact framing split across chunks, and reject coalesced duplicates

#### Scenario: Runtime probes reject both unspecified address families

- **WHEN** the validator runs bounded production probes with
  `HOSTNAME=0.0.0.0` and `HOSTNAME=::`
- **THEN** each process MUST exit non-zero before publishing listener-ready
  evidence or accepting a connection
- **AND** each process plus owned cleanup MUST finish within 5 seconds
- **AND** cleanup MUST await close and rebind/close the port without fixed delay
- **AND** the authority result MUST record
  `unspecifiedAddressRejected=true` only after both rejections are proven

#### Scenario: Positive IPv6 loopback is unsupported in CAMP-00

- **WHEN** the validator runs a bounded production probe with `HOSTNAME=::1`
- **THEN** the process MUST exit non-zero before publishing listener-ready
  evidence or accepting a connection
- **AND** the validator MUST NOT format or exercise an IPv6 HTTP/WebSocket URL

### Requirement: CAMP-00 Listener Result Is Closed and Durable

The CAMP-00 authority controller SHALL adapt successful process proof into the
closed `camp01-listener-result/v1` artifact defined by
`add-camp01-authority-receipts`. It MUST retain only the wave/run identity,
common loopback address, exact-address-match result, and unspecified-address
rejection result; it MUST NOT retain raw logs, environment values, arbitrary
errors, ports, process identifiers, or local paths.

#### Scenario: Fresh proof worktree prepares isolated standalone output

- **WHEN** CAMP-00 runs after only the authority controller's dependency
  bootstrap
- **THEN** the validator MUST build and hydrate below the writer-owned
  `CAMP01_NEXT_DIST_DIR` with sequential shell-free Node commands
- **AND** default `.next` MUST remain absent and the writer MUST remove runtime
  output before the pre-command ignored/untracked manifest is compared
- **AND** preparation/cleanup MUST finish within 10 minutes and each successful
  listener-ready record MUST arrive within 60 seconds

#### Scenario: Writer converts one closed ephemeral observation

- **GIVEN** the writer exclusively created `CAMP01_ARTIFACT_DIR` and issued the
  parent run identity
- **WHEN** the packaged-socket command completes successfully
- **THEN** the validator MUST no-replace hard-link the closed observation at
  `CAMP01_ARTIFACT_DIR/listener-observation.json`, then unlink the temp
- **AND** no copy/rename fallback is permitted
- **AND** the observation MUST bind both successful listener records, both
  wildcard rejections, the unsupported IPv6-loopback rejection, the existing
  journey, matrix, ordering, isolated preparation, environment-independent
  packaged mode, no-replace finalization, run identity, host modes, and reuse
- **AND** the writer MUST ignore stdout/stderr as authority input, validate and
  normalize stable bytes in memory, close, delete and verify observation/runtime
  absent, and only then construct/finalize both results and set cleanup true
- **AND** final allowlist/manifest validation MUST follow result finalization

#### Scenario: Invalid ephemeral handoff fails closed

- **WHEN** the observation/temp is pre-created, missing, extra, cross-run,
  malformed, changed between held-handle reads, nonregular, reparse-backed,
  path/handle identity-drifted, noncanonical, or survives conversion
- **THEN** the writer MUST publish no successful CAMP-00 receipt
- **AND** an observation over 4096 bytes MUST be rejected
- **AND** deterministic adapter tests MUST inject between-read mutation and
  cover every path fault without races; a real Windows test MUST preserve
  pre-created final bytes on hard-link `EEXIST` with no weaker fallback

#### Scenario: Reviewed-head proof publishes the closed listener result

- **GIVEN** all CAMP-00 predecessors and the approved child-spec/product
  provenance validate
- **WHEN** the immutable `camp-00` command passes at the exact reviewed product
  head
- **THEN** `listener-result.json` MUST identify `127.0.0.1` as the common
  address proven by both successful starts
- **AND** `expectedAddressMatched` and `unspecifiedAddressRejected` MUST both be
  `true`
- **AND** the authority validator MUST derive
  `boundAddressIsLoopback===true`
- **AND** `wave-result.json` MUST contain every exact CAMP-00 assertion,
  including packaged-mode independence, host modes/matrix, ordering, build,
  journey, no-replace/stable reads, cleanup, and port reuse, all `true`
- **AND** durable reopen MUST revalidate both result bytes and manifest digests

#### Scenario: Failed or incomplete proof publishes no successful receipt

- **WHEN** either successful start, either wildcard rejection probe, the
  existing HTTP/WebSocket/restart journey, product provenance, artifact schema,
  or durable digest validation fails
- **THEN** the controller MUST NOT publish a successful CAMP-00 receipt

#### Scenario: Exact-main proof gates the next wave

- **WHEN** the focused product PR merges with its reviewed head and all
  applicable GitHub checks passing
- **THEN** the controller MUST rerun the immutable CAMP-00 command against
  freshly fetched exact main under a new run identity
- **AND** CAMP-01A MUST remain blocked until that durable result and its
  creation-bound cleanup receipt revalidate
