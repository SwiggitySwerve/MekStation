## Context

CAMP-01A through CAMP-01D establish fail-closed source parsing, authoritative co-op identity, and the canonical-only combat boundary. Campaign creation can now introduce saved custom identity without implying combat adaptability.

This child implements the frozen CAMP-01E `campaign-ui` delta. It follows CAMP-01D and precedes the durable creation-commit child.

## Goals / Non-Goals

**Goals:**

- Validate raw saved-unit index rows before rendering or selection.
- Keep saved-design identity, roster-instance identity, and source kind distinct through the draft and root force.
- Provide honest, accessible picker states at desktop and 390x844.

**Non-Goals:**

- Server persistence acceptance, downstream metadata resolution, or custom-unit combat launch.

## Decisions

### D1. Validate the saved BattleMech index at the boundary

The campaign adapter SHALL accept raw custom-unit index data and expose a selectable option only when the row has a non-empty server-issued id, a BattleMech entity type, a non-empty display name, and finite positive tonnage. It SHALL map the exact id, display name, and tonnage without deriving identity from the name, tonnage, ordering, or an id prefix.

Invalid rows SHALL be excluded before rendering and selection. The adapter SHALL return an explicit invalid/unavailable observation for rejected rows; it SHALL NOT coerce metadata, fetch a construction document to repair the index, or silently present a partially trusted option.

### D2. Selection preserves separate identities

The roster step SHALL render `Stock Templates` and `Saved Designs` as separate named groups. Selecting a saved design SHALL mint a fresh campaign roster-instance `unitId`, retain the exact saved-design id as `unitRef`, set `unitSource=custom`, and add the roster-instance id to the root force. Selecting the same design twice SHALL produce two distinct roster-instance ids that share only the same source ref and source kind.

No serialized custom-unit construction payload may enter the campaign draft, roster projection, or root force. Stock selections remain canonical and usable while saved data is loading, empty, invalid, or unavailable.

The Saved Designs group SHALL show distinct loading, empty, and error-with-retry states. Retry re-runs the same index load without duplicating an already selected roster instance. Group names, option names, add/remove controls, status feedback, and retry SHALL be programmatically named and keyboard operable. Focus order and feedback SHALL remain visible and non-overlapping at desktop width and 390x844.

### D3. Pin the CAMP-01E receipt seam

The sole authority row is resolved by `commandId=camp-01e` from `WAVE_CONTRACTS['camp-01e']`. That frozen source row is authoritative for the logical-token command sequence, canonical argv digest, run root, predecessor, artifacts, assertions, and 10-file/450-line cap; no narrative command expansion or alternate execution sequence is permitted.

Before product editing, the controller SHALL run `register-pr-target --wave=camp-01e --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main proofs SHALL invoke `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and mode; only the controller may publish low-level results. After exact-main proof, `controller cleanup` consumes the exact run root, run id, and receipt digest before CAMP-01F. Screenshots prove presentation only; the roster projection and root-force observations prove identity.

## Risks / Trade-offs

- **Malformed metadata becomes selectable** -> Validate the raw index before option construction and surface rejected rows honestly.
- **Design id is reused as instance id** -> Mint the roster-instance id at every add action and assert both identities independently.
- **Async state hides stock recovery** -> Keep Stock Templates usable and give Saved Designs its own explicit status and retry surface.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF plus PROOF-02 disposition/repairs pass, and CAMP-00 through CAMP-01D exact-main cleanup receipts pass.
2. Add the adapter, picker states, identity propagation, and the production browser scenario; run the immutable CAMP-01E receipt.
3. Merge with a SHA guard, regenerate exact-main proof, clean up, and unblock CAMP-01F.

Rollback is allowed only before CAMP-01F starts; otherwise rerun dependent evidence from restored exact main.
