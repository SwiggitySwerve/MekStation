## Context

The previous waves establish linear durable streams, deterministic replay, authoritative combat/campaign adoption, and idempotent cross-stream effects. Only then can correction and restore-and-continue preserve prior facts safely. Git contributes useful vocabulary—immutable commits, refs, parentage, hashes—but domain authority still requires total stream order and validated commands.

## Goals / Non-Goals

**Goals:**

- Immutable parent/base lineage and atomic effective-head activation.
- Deterministic rebuild with impact preview and stale-command rejection.
- Authorized inspection of prior heads and superseded branches.
- Command revalidation rather than generic merge.

**Non-Goals:**

- Content-addressed entity identity, automatic three-way merge, CRDT merge, history deletion, or ordinary-choice branching.

## Decisions

### D1 — Branch metadata is separate from domain events

```ts
interface IJournalBranch {
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

Branch heads are keyed by `(streamType, streamId, branchId)`. The root branch starts at revision 0 and its first event is revision 1. A child records `baseRevision` in the parent's revision space; its first suffix event is revision `baseRevision + 1`, so `(branchId, revision)` remains the unambiguous expected head even when sibling branches share revision numbers. Child reads verify and resolve the immutable parent prefix through `baseRevision`, then the child's contiguous suffix. Ordinary accepted commands append to the effective branch.

### D2 — Build, verify, then activate

An authorized rewind/correction command records impact scope, creates a `building` branch, replays from a trusted base, applies proposed commands, and verifies authoritative plus viewer projections and external artifact manifests. Outbox rows belonging to a non-effective branch are not dispatchable.

Activation then installs a source-local fence for the prior effective generation. Fence installation serializes against lease-to-admitted delivery promotion. The fence prevents new leases/admissions and supersedes unleased pending effects. If an old-generation lease or admitted delivery is unresolved, the candidate enters `waiting-effects` and the prior branch remains effective. A fence that wins prevents a leased row from becoming admitted, so it may expire safely; an admission that wins remains durable until its idempotent target receipt exists and routes activation through the higher-version correction saga. Only after no old-generation lease can become admitted and every admitted delivery is reconciled does one local authority transaction mark the candidate effective, supersede the prior branch, increment the effective generation, and make candidate outbox rows dispatchable. Failure or unverifiable receipt state leaves the prior head effective.

### D3 — “Merge” means revalidation

A proposed scenario branch may export semantic commands with provenance. Promotion re-executes those commands against the current target head and may reject them. Events and state snapshots are never mechanically interleaved.

### D4 — Post-receipt correction is a saga

Once a target campaign receipt exists, no cross-database transaction is claimed. The source authority atomically commits the higher-version correction, supersession facts, invalidation manifest, and replacement outbox locally. The target authority then idempotently commits the higher-version inbox receipt and replacement consequence batch. Durable `pending`, `retrying`, `blocked`, and `applied` reconciliation states survive restart. Scenario progression remains blocked until the target receipt and projections are current.

### D5 — Visibility and recovery are branch-aware

Clients name expected branch/revision. Commands during rebuild receive `PROJECTION_REBUILDING`; superseded-head commands receive `STALE_BRANCH`. Timeline/history applies the existing viewer projector before serialization. Mobile/narrow UI keeps current status, impact, confirmation, and recovery actions visible; keyboard focus and live-region feedback are required for activation failures.

## Risks / Trade-offs

- A leased old-branch effect cannot race activation because source-generation fencing serializes against delivery admission and the prior branch remains effective while the winning side resolves.

- [Rebuild is expensive] → Start from verified checkpoints, expose progress, and keep the old branch effective until success.
- [Cross-stream effects already escaped] → Require the effect-receipt boundary; post-receipt changes use a durable higher-version correction saga, not combat-only rewind or distributed atomicity.
- [Private history leaks through lineage] → Separate private audit references and produce gapless viewer projections.
- [Branch proliferation confuses users] → Create branches only for explicit rewind/correction/simulation and show effective/superseded status plainly.

## Migration Plan

1. Add branch tables and resolvers with only one genesis/effective branch per existing stream.
2. Add read-only prior-head inspection and branch-aware command rejection.
3. Add non-effective candidate rebuild and verification.
4. Add combat rewind activation.
5. Add impact-declared campaign correction and coordinated post-receipt correction.
6. Enable optional simulation branches only after canonical correction paths pass.

Rollback disables new branch creation and activation while retaining all branch/supersession rows. The last verified effective branch remains authoritative.

## Open Questions

- Optional player-authored simulation branches require a separate UX scope; the storage/authority contract can support them without making them canonical.
