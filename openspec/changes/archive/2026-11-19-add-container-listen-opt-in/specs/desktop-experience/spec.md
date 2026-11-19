## MODIFIED Requirements

### Requirement: Packaged Production Listener Uses the Configured Loopback

The package-owned config SHALL select packaged mode only with a `.next` directory;
absent config is nonpackaged regardless of `.next`, while config without it
fails before Next. Ambient `NODE_ENV` cannot select/downgrade mode. Packaged
accepts only omitted/`127.0.0.1`; nonpackaged only omitted/`localhost`/loopback;
every other host rejects before Next and the resolved literal reaches listener.
The single exception is the container deployment: packaged mode SHALL bind
`0.0.0.0` only when `HOSTNAME` is exactly `0.0.0.0` and
`MEKSTATION_CONTAINER_LISTEN` is exactly `all-interfaces`, SHALL log that at
boot, and only the production Dockerfile SHALL set that variable. Any other
value of the variable, or the variable with any other host, SHALL be ignored
with a logged line and SHALL leave the loopback rule unchanged. The same-host
request guard SHALL apply unchanged in container mode. Because that guard
trusts a loopback `Host` header, the repository's compose file and run script
SHALL publish the container port on the host's `127.0.0.1` only and SHALL NOT
add reverse-proxy routing; remote or LAN access is unsupported.

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
- **AND** the exact container opt-in is not present together with `0.0.0.0`
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

#### Scenario: Container opt-in binds all interfaces

- **GIVEN** a packaged standalone layout with `HOSTNAME=0.0.0.0` and
  `MEKSTATION_CONTAINER_LISTEN=all-interfaces`
- **WHEN** startup resolves the listener
- **THEN** the listener MUST receive `0.0.0.0` as its host
- **AND** startup MUST log `CONTAINER_LISTEN_ALL_INTERFACES` before the first
  Next import
- **AND** API and WebSocket requests MUST still pass the same-host guard, so
  a request whose `Host` is not a literal loopback authority is refused

#### Scenario: The container opt-in cannot be enabled by accident

- **GIVEN** a packaged standalone layout with `MEKSTATION_CONTAINER_LISTEN` set
  to any value other than exactly `all-interfaces` (including an empty, padded
  or differently cased value) and `HOSTNAME=0.0.0.0`
- **WHEN** startup validates
- **THEN** it MUST log that the variable was ignored and MUST fail before the
  first Next import
- **AND** with `HOSTNAME=127.0.0.1`, as the desktop app always passes, an
  inherited `MEKSTATION_CONTAINER_LISTEN=all-interfaces` MUST be ignored with a
  logged line and the listener MUST stay `127.0.0.1`
- **AND** in nonpackaged (development) mode the variable MUST NOT admit
  `0.0.0.0`

#### Scenario: The container port is published on loopback only

- **GIVEN** the repository's compose files and `package.json` scripts
- **WHEN** they publish the container port
- **THEN** every published port MUST carry the `127.0.0.1:` host prefix
- **AND** no compose service MUST carry reverse-proxy routing labels

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
  `HOSTNAME=0.0.0.0` and `HOSTNAME=::`, with `MEKSTATION_CONTAINER_LISTEN`
  removed from each probe's environment so an exported container opt-in
  cannot satisfy or bypass the probe
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
