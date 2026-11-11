## Decisions
ReplayFidelityVersion.ts owns supported versions and append-only rule/release facts. A number never gains a rule after shipped code wrote it. Version 2 is stamp-only and carries no exactness guarantee. C-1c 2b writes 3 and gates its counter rule at >=3; no separate 2a exists.

Retained GameCreated payloads may omit the stamp. The accessor returns 1 in memory without mutation; explicit invalid/future values fail. Both new producers always write the shared writer. The baseline payload remains schema version 1 with a declared revised schemaId; there is no upcast.

SessionJoin advertises reader maximum; absence means 1. Authorization precedes compatibility preflight. A host refuses an incompatible reader before replay with Error PROTOCOL_VIOLATION and reason `reload-required: Reload this tab to join this match.` Existing old error rendering understands this. Updated clients terminate, show a Reload action and do not acknowledge or retry rejected seeds. Unsupported local strict-reader failures remain distinct from malformed history.

Strict runtime paths are hosted mirror join/catch-up, cold match-log recovery, and Replay Library NDJSON. Live P2P is shallow envelope validation; server MatchSessionProjector uses a separate whole-envelope registry.

## Movement evidence
Every re-pinned log-derived lock must reproduce old bytes and the old hash by removing only GameCreated.payload.replayFidelityVersion at identified copies using the original encoder. Parser fingerprints change independently through only the declared schemaId. Any other movement stops this lane. The historical encounter recording and provenance remain untouched.
