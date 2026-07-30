## Context

The previous waves establish linear durable streams, deterministic replay, authoritative combat/campaign adoption, and idempotent cross-stream effects. Only then can correction and restore-and-continue preserve prior facts safely. Git contributes useful vocabulary—immutable commits, refs, parentage, hashes—but domain authority still requires total stream order, server authorization, privacy-safe projections, and validated commands.

## Goals / Non-Goals

**Goals:**

- Immutable parent/base lineage and atomic effective-head activation.
- Deterministic rebuild with impact preview, explicit command gating, and stale-candidate rejection.
- Authorized inspection of prior heads and superseded branches.
- Command revalidation rather than generic merge.

**Non-Goals:**

- Content-addressed entity identity, automatic three-way merge, CRDT merge, history deletion, or ordinary-choice branching.
- A second event authority, global event order, or a new storage/service dependency.

## Decisions

### D1 — Branch metadata is separate from domain events

```ts
interface IJournalBranch {
  streamType: JournalStreamType;
  streamId: string;
  branchId: string;
  parentBranchId: string | null;
  baseRevision: number;
  baseEventId: string | null;
  baseDigest: string;
  status:
    | "building"
    | "waiting-effects"
    | "effective"
    | "blocked"
    | "superseded";
  createdBy: string;
  reason: string;
}
```

The authority generates opaque branch IDs. Branch heads are keyed by `(streamType, streamId, branchId)`. The root branch starts at revision 0 with a null base event and the algorithm-defined genesis digest. A child base must resolve to an event/digest on an existing branch in the same stream, cannot form a cycle, and cannot move after creation. Its first suffix event is revision `baseRevision + 1`; reads verify the parent prefix through `baseRevision`, then the child's contiguous suffix and digest chain. Ordinary accepted commands append only to the effective branch.

Branch status transitions are typed and monotonic. A storage constraint permits exactly one effective branch per stream. Superseded branches remain immutable and readable through authorization-filtered history.

### D2 — Build, verify, compare, then activate

An authorized rewind/correction command acquires a durable stream-scoped correction lease with an opaque lease ID, owner identity, expiry, and monotonically increasing fencing epoch, bound to the expected effective branch, revision, digest, and generation. Renewal preserves the epoch; expiry/takeover mints a higher epoch. While that lease is live, ordinary commands reject with `PROJECTION_REBUILDING`; they are not queued. Expiry or owner recovery is explicit and restart-safe.

The authority records impact scope, creates a `building` branch, replays from a trusted base, applies proposed commands, and verifies authoritative plus viewer projections and an immutable, server-derived external-artifact manifest. Outbox rows belonging to a non-effective branch are not dispatchable.

Activation installs a source-local fence for the expected prior generation. Fence installation serializes against lease-to-admitted delivery promotion. The fence prevents new leases/admissions and supersedes unleased pending effects. If an old-generation lease or admitted delivery is unresolved, the candidate enters `waiting-effects` and the prior branch remains effective. A fence that wins prevents a leased row from becoming admitted, so it may expire safely; an admission that wins remains durable until its target result is known.

If no target mutation occurred, activation can proceed normally. If the prior effect has an accepted target receipt, the source activation transaction also commits the higher-version correction fact, immutable replacement outbox, and `pending` saga state. In either case, that transaction locks and verifies the current unexpired lease ID, owner, and fencing epoch while comparing the expected effective branch/revision/digest/generation. Only then may it activate the candidate, supersede the prior branch, increment the generation, publish the artifact invalidation manifest, and make the new generation's outbox rows dispatchable. The replacement effect therefore cannot deadlock behind a non-effective candidate, and no pre-activation target mutation is introduced. A stale comparison, expired/taken-over lease, failed validation, or unknown target result leaves the prior head effective.

### D3 — “Merge” means revalidation

A proposed scenario branch may export versioned semantic command bytes with provenance. Promotion re-executes those commands through the current domain decider against the current target head. It may reject them. Events and state snapshots are never mechanically interleaved.

### D4 — Post-receipt correction is a saga

Once a target campaign receipt exists, no cross-database transaction is claimed. The source activation transaction atomically commits the new effective branch, higher-version correction, supersession facts, invalidation manifest, replacement outbox, and `pending` saga state locally. Only after that commit may the replacement outbox dispatch. It persists the canonical command bytes, digest, command schema version, and canonicalizer version required by the effect-receipt contract; a worker never regenerates them from a mutable projection.

The target authority then idempotently commits the higher-version inbox receipt and replacement consequence batch. Durable `pending`, `retrying`, `blocked`, and `applied` reconciliation states survive restart. Unsupported stored versions block without target mutation. While source and target temporarily differ, scenario progression and further correction remain blocked until the active target receipt and projections are current.

### D5 — Visibility and recovery are branch-aware

Clients name the expected effective branch/revision. Superseded-head commands receive `STALE_BRANCH`. Timeline/history applies the existing viewer projector before serialization. Player responses omit inaccessible branch identifiers and use gapless viewer-local delivery identities so private lineage cannot be inferred.

Mobile/narrow UI keeps current status, impact, confirmation, and recovery actions visible. Keyboard focus and live-region feedback are required for activation failures. Prior-head inspection is read-only: it cannot acquire effect leases, move authoritative cursors, or dispatch effects.

## Risks / Trade-offs

- [Rebuild is expensive] → Start from verified checkpoints, expose progress, use a renewable correction lease, and keep the old branch effective until success.
- [Effective head changes during rebuild] → Bind lease and activation to expected branch/revision/digest/generation; a mismatch blocks rather than rebases silently.
- [Cross-stream effects already escaped] → Require the effect-receipt boundary; post-receipt changes use a durable higher-version correction saga, not distributed atomicity.
- [Private history leaks through lineage] → Separate private audit references and produce gapless viewer projections without inaccessible IDs.
- [Branch proliferation confuses users] → Create branches only for explicit authorized rewind/correction; player simulation remains disabled.

## Migration Plan

1. Add branch tables and resolvers with only one genesis/effective branch per existing stream.
2. Add read-only prior-head inspection and branch-aware expected-head rejection.
3. Add durable correction leases plus non-effective candidate rebuild and verification.
4. Add combat rewind activation.
5. Add impact-declared campaign correction and coordinated post-receipt correction.
6. Consider simulation branches only through a separate approved UX change.

Rollback disables new branch creation and activation while retaining all branch/supersession rows. The last verified effective branch remains authoritative.

## Open Questions

- Optional player-authored simulation branches require a separate UX scope; this change deliberately leaves them disabled.
