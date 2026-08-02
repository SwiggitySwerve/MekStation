## Context

CAMP-01E produces a source-aware draft whose saved-design id, roster-instance id, source kind, and root-force membership are distinct. The current creation flow must not announce success until that complete identity reaches the existing server-backed campaign store.

This child implements the frozen CAMP-01F `campaign-persistence` delta. It follows CAMP-01E and precedes downstream Mech Bay resolution.

## Goals / Non-Goals

**Goals:**

- Make production server acceptance the creation commit point.
- Preserve the same campaign and roster identities in the accepted record.
- Keep retryable errors and conflicts honest, stable, and non-duplicating.

**Non-Goals:**

- Automatic conflict merging, alternative persistence transports, or Mech Bay metadata resolution.

## Decisions

### D1. One accepted production commit gates success

The production wizard SHALL assemble one campaign id, roster projection, and root force, commit them to the campaign store, and issue the existing server `PUT`. It SHALL await the store's accepted `saved` result before showing success or navigating to the dashboard. Browser-local state, a test-only save helper, a queued request, or an optimistic local mutation is not acceptance.

The accepted server record SHALL preserve the exact campaign id, saved roster-instance id, saved-design `unitRef`, `unitSource=custom`, and root-force membership produced by CAMP-01E. The submit path SHALL NOT replace the saved design with a stock unit or copy a construction payload into persistence.

### D2. Retry reuses the same pending identity

On a transport, validation, or server error, creation SHALL remain on an actionable recovery surface, suppress success/navigation, and retain the pending campaign identity and assembled roster. A player retry SHALL reattempt persistence for the same campaign id and the same roster/root-force identities; it SHALL NOT mint another campaign or duplicate roster/root-force entries.

Only one submit may be in flight for the pending id. Repeated activation while the request is pending is ignored or disabled, and the accepted result is applied once.

### D3. Conflict stays explicit and never auto-overwrites

A `409 Conflict` SHALL remain an explicit unresolved conflict. The creation path SHALL NOT adopt the server's current version and automatically re-submit the full local snapshot, report success, or navigate. Any player-initiated retry SHALL still target the same campaign id without claiming resolution; explicit merge/replace policy is outside this child.

### D4. Pin the CAMP-01F receipt seam

The sole authority row is resolved by `commandId=camp-01f` from `WAVE_CONTRACTS['camp-01f']`. That frozen source row is authoritative for the logical-token command sequence, canonical argv digest, run root, predecessor, artifacts, assertions, reporter contract, and 8-file/400-line cap; no narrative command expansion or alternate execution sequence is permitted. Its writer-validated `reports/campaign-persistence-authority.json` binds the exact passed production-browser test to digested accepted-response and server-read identities, root-force membership, construction-payload absence, and failure/retry/conflict facts; the generic wave booleans alone do not satisfy authority.

Before product editing, the controller SHALL run `register-pr-target --wave=camp-01f --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main proofs SHALL invoke `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and mode; only the controller may publish low-level results. After exact-main proof, `controller cleanup` consumes the exact run root, run id, and receipt digest before CAMP-01G. The browser proof SHALL exercise the real production submit path; the writer-bound request, accepted response, and server readback artifact proves persistence.

## Risks / Trade-offs

- **Optimistic UI claims durability** -> Gate success and navigation on the typed accepted store result.
- **Retry creates duplicates** -> Retain and reuse one pending campaign id and block concurrent submits.
- **Conflict clobbers intervening state** -> Keep `409` explicit and forbid automatic version adoption or resubmission.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF plus PROOF-02 disposition/repairs pass, and CAMP-00 through CAMP-01E exact-main cleanup receipts pass.
2. Wire accepted-result gating, same-id recovery, and conflict behavior; extend the production browser journey and run the immutable CAMP-01F receipt.
3. Merge with a SHA guard, regenerate exact-main proof, clean up, and unblock CAMP-01G.

Rollback is allowed only before CAMP-01G starts; otherwise rerun dependent evidence from restored exact main.
