## Context

CAMP-01F persists separate campaign roster-instance and saved-design identities. Mech Bay must preserve that distinction after reload and fail visibly when the referenced design no longer resolves.

This child implements the frozen CAMP-01G `campaign-bay-ui` delta. It follows CAMP-01F and precedes the three-session journey proof.

## Goals / Non-Goals

**Goals:**

- Resolve custom roster metadata by exact saved-design reference after cold reload.
- Preserve roster-instance id, cached name, and tonnage while reporting BV availability honestly.
- Keep missing saved sources visible, attributable, and launch-blocked.

**Non-Goals:**

- Custom-unit combat adaptation, campaign creation, persistence commit, or final journey audit.

## Decisions

### D1. Resolve through saved-design authority

For a roster entry with `unitSource=custom`, Mech Bay SHALL use the exact `unitRef` to query the saved-design authority. It SHALL NOT query the canonical stock catalog for a fallback or rewrite either the roster-instance id or source reference.

A successful resolution SHALL retain `unitSource=custom`, the roster-instance id, and the persisted cached display name and tonnage. The resolved saved design may supply supported live details, but a changed or unavailable computed BV SHALL be labeled available or unavailable rather than fabricated from a representative stock unit.

### D2. Missing sources remain visible and fail closed

If the referenced saved design is deleted, missing, malformed, or unavailable, Mech Bay SHALL keep the roster entry visible using only persisted safe cached name and tonnage. It SHALL show an explicit unresolved-source state and SHALL NOT borrow stock equipment, BV, readiness, or identity.

The unresolved entry remains in its force position but SHALL be excluded from mission readiness and combat launch admission. Recovery may retry the same `unitRef`; it SHALL NOT silently remove the roster entry or mint another identity.

### D3. Pin the CAMP-01G receipt seam

The sole authority row is resolved by `commandId=camp-01g` from `WAVE_CONTRACTS['camp-01g']`. That row is authoritative for the logical-token command sequence, canonical argv digest, run root, predecessor, reporter contract, artifacts, assertions, and 7-file/350-line cap; narrative command expansion is forbidden.

The trusted Playwright reporter SHALL write `reports/mech-bay-authority.json` only from the exact receipt-pinned browser test. The closed report proves the cold-reloaded route, resolved custom identity, cached/displayed metadata equality, honest BV status, and a second unresolved-source observation with no stock substitution. Generic wave booleans do not satisfy authority.

Before product editing, the controller SHALL register the row-resolved product target. Reviewed-head and exact-main proofs SHALL use the exact row and receipt identities, then cleanup SHALL consume the exact run id and receipt digest before CAMP-01H.

## Risks / Trade-offs

- **Stock fallback hides identity loss** -> Reject catalog substitution and preserve the custom source marker.
- **Deleted designs disappear from the force** -> Keep a cached, explicit unresolved row while blocking readiness.
- **BV is mistaken for authoritative** -> Present only a computed supported value or an explicit unavailable state.

## Migration Plan

1. Admit product work only after all ten child specs, CAMP-PROOF, PROOF-02 disposition, and CAMP-00 through CAMP-01F cleanup are complete.
2. Add source-aware resolution, unresolved presentation, readiness blocking, and the receipt-pinned browser proof.
3. SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01H.

Rollback before CAMP-01H may restore the prior Mech Bay projection; later rollback requires regenerating dependent evidence.
