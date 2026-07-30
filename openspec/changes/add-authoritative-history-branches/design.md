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
  status: "building" | "effective" | "blocked" | "superseded";
  createdBy: string;
  reason: string;
}
```

Child reads resolve the immutable parent prefix through `baseRevision` and the child suffix. Ordinary accepted commands append to the effective branch.

### D2 — Build, verify, then activate

An authorized rewind/correction command records impact scope, creates a `building` branch, replays from a trusted base, applies proposed commands, and verifies authoritative plus viewer projections and external artifact manifests. One transaction marks the candidate effective and prior branch superseded. Failure leaves the prior head effective.

### D3 — “Merge” means revalidation

A proposed scenario branch may export semantic commands with provenance. Promotion re-executes those commands against the current target head and may reject them. Events and state snapshots are never mechanically interleaved.

### D4 — Visibility and recovery are branch-aware

Clients name expected branch/revision. Commands during rebuild receive `PROJECTION_REBUILDING`; superseded-head commands receive `STALE_BRANCH`. Timeline/history applies the existing viewer projector before serialization. Mobile/narrow UI keeps current status, impact, confirmation, and recovery actions visible; keyboard focus and live-region feedback are required for activation failures.

## Risks / Trade-offs

- [Rebuild is expensive] → Start from verified checkpoints, expose progress, and keep the old branch effective until success.
- [Cross-stream effects already escaped] → Require the effect-receipt boundary; post-receipt changes use coordinated correction, not combat-only rewind.
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
