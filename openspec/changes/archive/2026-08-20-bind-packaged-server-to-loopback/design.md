## Context

Electron launches the packaged Next.js server with `HOSTNAME=127.0.0.1`, and
`server.js` passes that value to `next({ hostname })`. The actual Node
HTTP/WebSocket listener still starts with `server.listen(port)`. The configured
hostname and the human-readable `Ready on http://127.0.0.1:<port>` log can
therefore disagree with the operating system socket, which is free to bind an
unspecified address.

The existing `validate:multiplayer:packaged-socket` process already proves
match creation, WebSocket replay, restart, and same-match reconnect against the
packaged server. It does not inspect `server.address()` and consequently cannot
prove the listener boundary. This wave closes that single seam before any
CAMP-01 campaign or multiplayer product wave runs.

This child change depends on the frozen `camp-00` row and
`IListenerResultV1` contract in `add-camp01-authority-receipts`. Its product PR
is limited to 4 files and 180 changed lines. This specification PR changes no
runtime code.

## Goals / Non-Goals

**Goals:**

- Bind the production Node listener to Electron's exact configured
  `127.0.0.1` literal.
- Fail closed before listening when production configuration is wildcard,
  unspecified, malformed, or non-loopback.
- Prove the actual `server.address()` value independently for the initial
  packaged start and the restart used by the existing reconnect journey.
- Preserve the existing HTTP, WebSocket replay, restart, and reconnect proof.
- Produce the closed CAMP-00 listener facts required by the authority-receipt
  writer without retaining free-form logs, environment values, or local paths.

**Non-Goals:**

- Authentication, authorization, tenant ownership, TLS, firewall policy,
  remote hosting, or LAN discovery.
- Supporting caller-selected hostnames or positive `::1` operation in this
  wave. The parent receipt schema retains its wider loopback union for future
  platform work, but CAMP-00 emits `127.0.0.1`.
- Changing routes, WebSocket messages, persistence, ports, Electron process
  ownership, or the omitted-host development default of `localhost`.
- Treating a log line or successful loopback request as listener-authority
  evidence.
- Adding a dependency or implementing this design in the specification PR.

## Decisions

### D1. Select packaged mode and host at the listener boundary

The package-owned `server.next-config.json` marker SHALL select packaged mode
before the first Next import. When absent, mode is nonpackaged whether `.next`
is absent or present; when the marker exists, `.next` must be a directory in
that root or startup fails before Next, and the complete pair is packaged.
Ambient `NODE_ENV` cannot select/downgrade mode. Packaged mode forces production
internally and accepts only omitted `HOSTNAME` or exact `127.0.0.1`.

The HTTP server SHALL start with an explicit host, for example:

```js
server.listen({ port, host: hostname }, onListening)
```

Nonpackaged development keeps its omitted `localhost` default, accepts only
`localhost` or `127.0.0.1`, and rejects every wildcard, unspecified, malformed,
other-DNS, IPv6, or other address before Next import/listen. The same validated
value is passed to Next.js and the actual listener in every mode.

Fixed runtime markers and literal hosts are preferred to ambient mode flags,
DNS resolution, or a new abstraction; those inputs could downgrade packaging
or return an address family different from the configured identity.

### D2. Publish one strict ready record derived from `server.address()`

The successful listener callback SHALL read `server.address()` and emit exactly
one UTF-8, newline-terminated machine record per process. Its complete framing
is the literal ASCII prefix `MEKSTATION_LISTENER_READY ` at column zero,
immediately followed by one compact `JSON.stringify` object and `\n`:

```ts
interface IPackagedListenerReadyV1 {
  schema: "mekstation-packaged-listener-ready/v1";
  configuredHostname: "127.0.0.1";
  boundAddress: "127.0.0.1";
  family: "IPv4";
  port: number;
}
```

The complete line SHALL be at most 1024 bytes, and `port` SHALL be an integer
from 1 through 65535. The parser SHALL handle the line split across arbitrary
stdout chunks and SHALL reject two records coalesced into one chunk.

The record is valid only when the actual bound address equals the configured
literal, its family matches that literal, and its port equals the requested
port. `null`, pipe/string addresses, duplicate records, wildcard addresses,
unknown fields, malformed JSON, or a configured/bound mismatch terminate the
process with a non-zero result. Any output line containing the prefix token but
not matching that exact one-line framing is malformed and fails. Nonmatching
human-readable logs may remain for operators but are never parsed as authority.

A strict `server.address()` record is preferred to OS-specific commands such
as `Get-NetTCPConnection` or `lsof`; it is cross-platform Node socket state and
does not require another dependency or privileged process inspection.

### D3. Extend the packaged-socket validator as the process authority

Under the authority controller, the validator SHALL require the parent-defined
`CAMP01_NEXT_DIST_DIR`, spawn `[process.execPath,
"scripts/next/run-next.mjs","build","--webpack"]` and then
`[process.execPath,"scripts/hydrate-next-standalone-multiplayer-server.mjs"]`
sequentially with `shell:false`, and resolve standalone only below that
writer-owned runtime path. CAMP-PROOF SHALL make Next config and hydration honor
the path. The writer removes runtime before manifest comparison; default
`.next` remains absent and the pre-command ignored/untracked manifest must
match. Outside CAMP authority, current prebuilt-standalone behavior remains.
Preparation plus cleanup SHALL finish within 10 minutes; each successful server
start SHALL publish its ready record within the existing 60-second limit.

`scripts/validate-multiplayer-packaged-socket.mjs` SHALL parse each owned ready
record. Initial start removes `HOSTNAME` and ambient `NODE_ENV`; restart sets
`HOSTNAME=127.0.0.1` and ambient `NODE_ENV=development`. The config marker and
required `.next` companion select packaged mode, after which the server forces
production internally. Each record must match host, address, family, and port.
The validator SHALL continue through its current HTTP, WebSocket replay, process
restart, and same-match reconnect assertions only after the first record
validates; it SHALL repeat listener validation before the reconnect assertion.

In the fixed standalone layout, omitted and `127.0.0.1` normalize to loopback;
`""`, `" "`, `localhost`, `127.0.0.2`, `192.168.1.10`, `0.0.0.0`, `::`, `::1`,
and `not-an-ip` reject before Next import, `prepare()`, or `listen()`. A
source-controlled test-only preload patches `Module._load` and throws a sentinel
on request `next`; `[process.execPath,"--require",fixture,standaloneServer]`
must return the bounded host error without that sentinel or a production test
switch. `0.0.0.0`, `::`, and the LAN address repeat with ambient `NODE_ENV`
unset and `development`. All starts/probes use the same production resolver.

Every child process SHALL use an OS-assigned port obtained by binding a
validator-owned `net.Server` to port zero on `127.0.0.1` and closing it before
spawn. Success, rejection, timeout, and forced termination paths SHALL await
`close`, fail if termination does not complete, then bind and close a new
validator-owned server on the same port before continuing; no fixed restart
delay is permitted. Each negative lifecycle and cleanup finishes within 5
seconds. Parser tests also reject missing, duplicate, malformed, unknown-field,
wrong-port, wrong-family, wildcard, non-loopback, IPv6, and mismatch records.

An HTTP request to `127.0.0.1` is retained as functional proof but is not used
to infer the socket's bind scope.

### D4. Use one closed, ephemeral validator-to-writer observation

All ten child specs merge before CAMP-PROOF implementation. The CAMP-PROOF
writer SHALL therefore implement this child-defined adapter before CAMP-00 can
run. For the immutable `camp-00` invocation it exclusively creates
`CAMP01_ARTIFACT_DIR`, exports the parent-defined writer-owned
`CAMP01_RUN_ID`, and verifies that neither `listener-observation.json` nor
`.listener-observation.json.tmp` exists before spawn. No additional environment
name or caller-supplied identity is introduced: the exclusive directory and
single immutable CAMP-00 command invocation scope the handoff.

After the journey, the validator SHALL exclusive-create the temp, write compact
UTF-8 JSON, flush/sync/close, then create a same-directory hard link at the
final path with no-replace semantics and unlink the temp. `EEXIST`, unsupported
hard links, unlink failure, or any copy/rename fallback fails without receipt:

```ts
interface ICamp00ListenerProcessV1 {
  configuredHostname: "127.0.0.1";
  boundAddress: "127.0.0.1";
  family: "IPv4";
  requestedPort: number;
  boundPort: number;
  readyRecordCount: 1;
}

interface ICamp00ListenerObservationV1 {
  schema: "camp01-listener-observation/v1";
  wave: "camp-00";
  parentRunId: RunId;
  initialHostnameInput: "omitted";
  restartHostnameInput: "127.0.0.1";
  packagedModeEnvironmentIndependent: true;
  initial: ICamp00ListenerProcessV1;
  restart: ICamp00ListenerProcessV1;
  ipv4UnspecifiedRejected: true;
  ipv6UnspecifiedRejected: true;
  ipv6LoopbackRejected: true;
  hostnameMatrixPassed: true;
  rejectedBeforeNextPrepare: true;
  standalonePreparedInArtifactDir: true;
  packagedSocketJourneyPassed: true;
  observationNoReplaceFinalized: true;
  portReusableAfterEachChild: true;
}
```

The writer ignores stdout/stderr. After exit zero it opens the final once from
the validated directory, holds that handle, and requires one regular,
non-reparse file at most 4096 bytes with no temp or undeclared sibling. It
rejects unknown/noncanonical/cross-run values, unequal ports, or path/handle
identity drift; reads/hashes through the handle, validates schema/run id, seeks
and rereads that same handle, and rechecks path identity/digest before
normalizing closed facts in memory. Every predicate must be true. The writer
closes the handle, deletes observation/runtime, and verifies both absent before
constructing/finalizing either result; only then may it set stable-read and
runtime-removal assertions and proceed to allowlist/manifest validation.
Missing, changed, malformed, duplicated, undeletable, or extra bytes fail.

Before CAMP-00, injected-adapter tests mutate bytes between held-handle reads
and separately reject pre-created temp/final, nonregular/reparse, no-replace
collision, identity drift, and extra siblings without timing races. A real
Windows filesystem integration test SHALL pre-create distinct final bytes,
require hard-link `EEXIST`, preserve those bytes, and publish no receipt; no
weaker fallback is allowed. Durable validation reopens both results and requires
exact row assertions, run identity, artifact digests, and manifest entries.

The closed `IListenerResultV1` permits either loopback family, but this child
publishes `boundAddress="127.0.0.1"`. `expectedAddressMatched` requires both
strict records to match that address and their own ports;
`unspecifiedAddressRejected` requires both wildcard probes and parser tests.
The writer derives `boundAddressIsLoopback===true` from the closed result.

Raw stdout/stderr, arbitrary errors, environment values, ports, PIDs, and local
paths SHALL NOT enter `listener-result.json` or any finalized artifact. The
ephemeral observation is never exported. Failure publishes no successful
CAMP-00 receipt.

### D5. Keep implementation and authority sequencing narrow

After every child spec, CAMP-PROOF, fresh PROOF-02 triage/repair, and predecessor
cleanup validates, branch from the merged spec SHA. The product PR touches only
the runtime listener, validator, focused tests, and necessary package wiring,
within 4 files/180 lines. Retain the bounded red proof; require reviewed-head
proof, gates, independent review, checks, and SHA-guarded merge; require
exact-main CAMP-00 proof and cleanup before CAMP-01A.

## Risks / Trade-offs

- **Process-emitted record** -> Derive it only from callback `server.address()` and bind it to the functional journey at the reviewed SHA.
- **Parent schema permits `::1`** -> Keep CAMP-00 IPv4-only; defer positive IPv6 and bracketed URL coverage.
- **Strict validation exposes remote-host usage** -> Reject unsupported remote/LAN configuration before import or listening.
- **Probes add time** -> Run only the exact matrix with awaited cleanup/rebind.
- **Loopback is not authentication** -> Prohibit shared/remote/multi-user use until a separate authenticated ownership boundary exists.

## Migration Plan

1. Merge this spec-only change.
2. After authority/PROOF predecessors, retain the red validator proof.
3. Bind the listener, add focused coverage, and rerun the complete journey.
4. Publish reviewed-head/exact-main receipts, SHA-guard merge, durably
   revalidate, then remove only recorded wave resources.

Rollback only before a follower starts; otherwise invalidate and rerun follower
authority from the restored exact main.
