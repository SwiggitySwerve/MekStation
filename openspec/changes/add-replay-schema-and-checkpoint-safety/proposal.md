## Why

An immutable log is not enough if historical payloads are interpreted by changing reducers or unknown events are silently skipped. Replay must fail closed, pin every schema and projector input, and prove that checkpoints are disposable caches rather than competing authority.

## What Changes

- Require explicit event schema versions that are distinct from reducer/projector versions.
- Register strict, concrete baseline payload schemas for every currently persisted combat and campaign event type through capped domain-family PRs; the generic journal envelope remains payload-agnostic until a domain reader selects a registry.
- Add named legacy-source adapters that map an explicitly identified versionless source format to baseline schema v1 without rewriting the stored source. Missing versions never receive a global implicit default.
- Add registered pure upcasters that leave stored payloads immutable.
- Capture resolved randomness, time, catalog, rules, and external inputs required for deterministic replay.
- Add immutable checkpoints keyed by stream, branch, revision, schema-pipeline fingerprint, projector version, source digest, and result digest.
- Quarantine only the affected session when replay encounters an unsupported event, broken lineage, or digest mismatch.
- Prove full replay and compatible checkpoint-plus-tail produce identical authoritative and viewer-safe digests.

## Non-goals

- Changing combat or campaign authority in this wave.
- Rewriting stored historical payloads during migration.
- Treating `unknown`, `any`, an unconstrained record, a structural type guard, or representative-only fixtures as a locked payload schema.
- Treating timestamps, checkpoints, or snapshots as authoritative ordering.
- Adding branches or a user-facing rewind workflow.

## Dependencies

- This change is a replay-safety implementation slice of `harden-gm-two-player-campaign-sessions`.
- It depends on the archived `establish-entity-event-journal-contract` foundation and `harden-sqlite-journal-coherent-verified-open`; it validates only the fixed root branch until the later branch wave exists.
- `add-authority-audit-and-privacy-proof`, combat adoption, and campaign adoption SHALL not cut over before this change's replay/quarantine contracts pass.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Add replay-safe schema evolution, deterministic input provenance, checkpoint compatibility, integrity verification, and per-session quarantine.
- `replay-library`: Require replay to surface unsupported history truthfully and use the same registered upcast/projector path as recovery.

## Impact

- Event schema registry, upcasters, projector registry, replay/recovery code, and checkpoint persistence.
- Explicit legacy format adapters for existing combat NDJSON/IndexedDB and campaign-sync event envelopes.
- Baseline schema packs following the existing campaign and combat payload-family boundaries, with exhaustive discriminant coverage before integration.
- A checked-in 87-discriminant ownership inventory that prevents overlapping or unowned schema-pack work and must be updated declaratively when the live unions change.
- Zod validation and existing hashing utilities, strengthened where necessary.
- Deterministic replay, checkpoint equivalence, and corruption-isolation tests.
- No new runtime dependency.
