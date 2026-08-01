## Context

`ICampaignAuthoritativeState` currently projects ledger data, but `ICampaignRosterUnit` lacks `unitRef` and source identity and there is no authoritative force-membership map. `CampaignCoopEntryPanel` creates or joins a match, `CampaignHostRegistry` retains the active host, and `CampaignSyncSession` publishes a baseline to the guest mirror. CAMP-01C cannot authorize a force choice unless that entire path preserves one revision-bound projection.

This child implements the `multiplayer-sync` delta and frozen CAMP-01B contract. It follows CAMP-01A and changes no participation or launch authorization.

## Goals / Non-Goals

**Goals:**

- Project real roster source identity and `forceId -> unitIds` membership from the host campaign.
- Bind each baseline to a non-negative host-owned revision.
- Preserve identical campaign, match, revision, roster, source, and membership facts through registry and guest hydration.
- Reject malformed or inconsistent snapshots before guest mirror creation.

**Non-Goals:**

- Assigning players to forces or accepting participation choices.
- Launching missions, adapting custom units for combat, or changing transport ownership.
- Adding dependencies or replacing campaign event replay.

## Decisions

### D1. Extend the JSON-safe campaign sync projection

`ICampaignRosterUnit` SHALL add exact `unitRef` and `unitSource: 'canonical' | 'custom'`. `ICampaignAuthoritativeState` SHALL add a closed `forceUnits: Readonly<Record<string, readonly string[]>>`. The snapshot payload SHALL carry a non-negative integer `revision` owned by the host.

Every membership id must name a projected roster unit, a unit may appear in at most one projected force, and keys/arrays are deterministically ordered. The projection carries references and membership only; full construction payloads remain in their existing vaults.

### D2. Build once from real campaign stores at co-op entry

`CampaignCoopEntryPanel` SHALL gather the persisted campaign roster and force tree, then pass that input into `buildCampaignAuthoritativeState`. It MUST NOT derive designation, source, or membership from placeholder ids. A missing roster reference, duplicate membership, unknown source, or campaign mismatch aborts registration before a room is advertised.

This source-owned build is preferred to reconstructing membership later inside the registry, where campaign store context is absent.

### D3. Preserve one immutable snapshot through server ownership

The create/register boundary SHALL bind `campaignId`, `matchId`, `revision`, state, and host identity. `CampaignHostRegistry` validates and retains that snapshot without dropping source/membership fields. `CampaignSyncSession` publishes it, and the guest mirror validates campaign/match/revision plus internal membership before hydrating.

`revision` is the inclusive high-water `ICampaignEvent.sequence` of the latest committed event whose effects are fully represented in `state`. Shared registration is forbidden until the initial sequence-0 `CampaignSnapshotPublished` event exists, so every advertised revision is non-negative. The host commit serialization boundary owns one atomic `{ revision, state }` read and replaces it only after applying a contiguous committed event with a strictly greater sequence.

`CampaignSyncSession` SHALL begin buffering live events before reading that pair, publish the pair once as the baseline, and replay only contiguous events whose sequence is strictly greater than the baseline revision, deduplicating any buffered/log overlap. The guest adopts the baseline with `lastSequence=revision`, advances that cursor once per accepted next event, and rejects a gap, regression, mixed-revision payload, or event at/below the cursor. A later baseline below the guest cursor is stale; the same revision is accepted only when the complete projection is byte-equivalent/idempotent; a different same-revision projection or a revision not equal to the registry pair is rejected. The guest MUST NOT synthesize missing roster or force data from local state.

### D4. Pin the CAMP-01B evidence seam

`WAVE_CONTRACTS['camp-01b']` in `add-camp01-authority-receipts` is the sole immutable row. It binds the command id, run-root template, canonical argv digest, two separate ordered command arrays, complete artifacts including `receipt-manifest.json`, assertions, predecessor, and 14-file/480-line product cap. This child SHALL resolve the row only by `commandId=camp-01b`; a narrative copy, caller command text, omitted field, or substituted low-level invocation is not authoritative and any row change requires a parent plus authority-receipt contract delta.

Before product editing, the controller SHALL execute `register-pr-target --wave=camp-01b --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main evidence SHALL each use `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and respectively `--mode=reviewed-head` or `--mode=exact-main`; only the controller may invoke low-level write/validate inside its exact-SHA proof worktree. After exact-main proof, `controller cleanup` SHALL consume the exact run root, run id, and receipt digest before CAMP-01C. Direct low-level publication cannot satisfy authority.

## Risks / Trade-offs

- **Projection duplicates campaign data** -> Retain only stable references, sources, and membership needed for authority.
- **Snapshot races with host mutations** -> Bind all fields to one host-owned revision and reject mixed-revision input.
- **Old fixtures omit new fields** -> Update focused builders explicitly; do not add permissive runtime defaults.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF and PROOF-02 disposition/repairs are complete, CAMP-00 exact-main cleanup passes, and CAMP-01A merges with exact-main cleanup.
2. Add strict projection types/parsers and focused failures.
3. Build the snapshot at co-op entry and preserve it through registry/session.
4. Hydrate and verify the guest mirror, then run the immutable CAMP-01B row and reviewed-head receipt.
5. After SHA-guarded merge, regenerate exact-main evidence and prune before CAMP-01C implementation.

Rollback is allowed only before CAMP-01C starts; otherwise invalidate and rerun dependent evidence from restored exact main.
