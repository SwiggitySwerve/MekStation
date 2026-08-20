## Context

`missionReadinessProjection` can surface roster blockers, but persistence has no closed parser for a roster unit's source and encounter materialization can receive a reference before one shared exact-reference check. Browser campaign surfaces load canonical metadata through `/api/units?includeBV=true`; Node fast-forward paths use `NodeCanonicalUnitService`. These loaders must expose the same runtime readiness states without treating failure as an empty catalog.

This child implements the `mission-contracts` delta and the frozen CAMP-01A contract. It precedes every co-op, launch, picker, persistence, and Mech Bay child.

## Goals / Non-Goals

**Goals:**

- Parse absent legacy source as canonical while retaining explicit `canonical` and `custom` values and rejecting every other present value.
- Represent canonical combat catalog state as `loading`, `ready`, or `unavailable` in browser and Node paths.
- Validate source and exact canonical reference before any encounter diagnostic, lookup, reuse return, route call, or mutation.
- Keep blockers visible and retryable in readiness projections.

**Non-Goals:**

- Materializing custom units for combat.
- Selecting, persisting, or resolving saved custom designs on campaign UI surfaces.
- Changing canonical data, encounter behavior after admission, or dependencies.

## Decisions

### D1. Use one closed persistence parser

The campaign type layer SHALL own these semantics:

```ts
type RosterUnitSource = 'canonical' | 'custom';

type ParsedRosterUnitSource =
  | { readonly kind: 'legacy'; readonly source: 'canonical' }
  | { readonly kind: 'valid'; readonly source: RosterUnitSource }
  | { readonly kind: 'invalid' };
```

Only an absent field produces `legacy`. A present string is accepted only when it exactly matches the closed union. Unknown values are neither inferred from `unitRef` nor rewritten. This preserves old canonical campaigns without permitting downgrade-by-omission after an explicit source was persisted.

### D2. Share one runtime catalog snapshot contract

```ts
type CanonicalCombatCatalogSnapshot =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly unitRefs: ReadonlySet<string> }
  | { readonly status: 'unavailable'; readonly retryable: true };
```

The browser adapter validates `/api/units?includeBV=true`; the Node adapter reads `NodeCanonicalUnitService`. A malformed response, thrown load, or unavailable data becomes `unavailable`, never `ready` with an empty set. Catalog contents remain runtime-only and are not copied into campaign persistence.

### D3. Put the exact-reference guard before materialization work

One pure guard consumes the parsed source, `unitRef`, and catalog snapshot. It admits only `canonical` plus an exact ready-catalog match. `custom`, invalid, missing, forged, loading, unavailable, and stale references return stable blockers. `materializeCampaignMissionEncounter` calls the guard before diagnostics, `scenarioIds` lookup/reuse, router access, or mutation; readiness uses the same result without hiding the roster entry.

This is preferred to scattered checks because every later caller inherits the same fail-closed ordering and no-side-effect contract.

### D4. Pin the CAMP-01A evidence seam

`WAVE_CONTRACTS['camp-01a']` in `add-camp01-authority-receipts` is the sole immutable row. It binds the command id, run-root template, canonical argv digest, exact ordered command sequence, complete artifacts including `receipt-manifest.json`, assertions, predecessor, and 10-file/400-line product cap. This child SHALL resolve the row only by `commandId=camp-01a`; a narrative copy, caller command text, omitted field, or substituted low-level invocation is not authoritative and any row change requires a parent plus authority-receipt contract delta.

Before product editing, the controller SHALL execute `register-pr-target --wave=camp-01a --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main evidence SHALL each use `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and respectively `--mode=reviewed-head` or `--mode=exact-main`; only the controller may invoke low-level write/validate inside its exact-SHA proof worktree. After exact-main proof, `controller cleanup` SHALL consume the exact run root, run id, and receipt digest before CAMP-01B. Direct low-level publication cannot satisfy authority.

## Risks / Trade-offs

- **Legacy omission could mask corrupted data** -> Normalize only actual absence; reject all present unknown values.
- **Catalog failures can block canonical launch** -> Surface a retryable unavailable blocker instead of guessing or silently succeeding.
- **Guard ordering can regress** -> Assert zero observable calls and mutations for every rejected class.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF and PROOF-02 disposition/repairs are complete, and CAMP-00 exact-main proof and cleanup pass.
2. Add the parser and catalog snapshot adapters with focused red tests.
3. Reuse the exact-reference guard in readiness and as the first materializer operation.
4. Run the immutable CAMP-01A row, reviewed-head receipt, and gates within cap.
5. After SHA-guarded merge, regenerate exact-main evidence and prune before CAMP-01B implementation.

Rollback is allowed only before a follower wave starts; otherwise invalidate and rerun follower authority from the restored exact main.
