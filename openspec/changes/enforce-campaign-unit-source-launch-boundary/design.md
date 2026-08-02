## Context

The CAMP-01A parser and catalog snapshot define valid source identity and explicit `loading`/`ready`/`unavailable` states. CAMP-01C authorizes participant choices, but launch call sites still need one fail-closed guard before any encounter work.

This child implements the `mission-contracts` launch delta and frozen CAMP-01D contract. It follows CAMP-01C and changes no custom-unit adaptation.

## Goals / Non-Goals

**Goals:**

- Require `unitSource === canonical` and exact membership in an authoritative ready catalog snapshot.
- Run the guard before diagnostics, lookup/reuse/create, network access, session launch, or mutation.
- Keep blocked custom, invalid, stale, loading, and unavailable rows visible with stable recovery reasons.

**Non-Goals:**

- Making custom sources combat-playable or changing the CAMP-01C protocol.

## Decisions

### D1. One explicit launch guard

Fast-forward, dashboard readiness, and `launchCoopMission` SHALL receive the runtime-only snapshot explicitly. The guard SHALL reject custom, invalid, missing, forged, stale, loading, unavailable, or non-member references and SHALL perform no catalog I/O. The accepted host snapshot remains bound to campaign, match, and monotonic revision.

One shared admission guard SHALL cover mission launch, Mech Bay readiness, fast-forward, campaign dashboard readiness, `launchCoopMission`, and every materializer or launch caller. Each caller SHALL invoke it before diagnostics or I/O; no caller may provide a fallback or bypass path.

### D2. Fail closed before side effects

Snapshot/source validation is the first operation in every materializer or launch path. For a blocked selection, encounter lookup/reuse/create counts, route calls, session creation, force mutation, and launch calls SHALL all remain zero. A canonical-only selection in a mixed roster may proceed exactly once when every selected reference resolves.

The focused matrix SHALL exercise each caller above against custom, invalid, stale, missing, loading, unavailable, and foreign/revision-mismatched snapshots, asserting the same condition-specific stable blocker across callers and zero observable side effects for every rejection. Custom and invalid selections retain their per-unit canonical-combat-unavailable reasons; loading and unavailable catalogs retain honest retryable surface status.

### D3. Pin the CAMP-01D receipt seam

The sole authority row is `WAVE_CONTRACTS['camp-01d']`: `commandId=camp-01d`, run root `.sisyphus/evidence/playtest/camp01d-launch-<sha>`, predecessor `camp-01c`, Windows command sequence `[npm test -- --watchAll=false --runTestsByPath src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx src/lib/campaign/coop/__tests__/launchCoopMission.test.ts --runInBand, npm run qc:command:readiness-stable:quick, npm run verify:qc:coop-campaign-journey]`, canonical argv digest `cb3ee9a647e27ee3436be604511a3d529fc4f8bdfdb132716381f159d98a54f5`, artifacts `command-result.json`, `receipt-manifest.json`, `wave-result.json`, assertions `catalogReady===true`, `canonicalSelection.launchSucceeded===true`, `canonicalSelection.launchEncounterCount===1`, `blockedSelection.encounterLookupCount===0`, `blockedSelection.reuseResultCount===0`, `blockedSelection.createEncounterCount===0`, `blockedSelection.launchEncounterCount===0`, cap 12 files/450 lines.

Before product editing, the controller SHALL run `register-pr-target --wave=camp-01d --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main proofs SHALL invoke `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and mode; only the controller may publish low-level results. After exact-main proof, `controller cleanup` consumes the exact run root, run id, and receipt digest before CAMP-01E. Direct low-level publication cannot satisfy authority.

## Risks / Trade-offs

- **A custom ref can masquerade as canonical** -> Require both the closed source value and exact ready-catalog membership.
- **Guard drift across callers** -> Share one guard and assert zero side effects on every blocked path.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF and PROOF-02 disposition/repairs pass, CAMP-00 cleanup passes, and CAMP-01A/B/C exact-main cleanup passes.
2. Add the explicit guard to all three launch boundaries and run the immutable CAMP-01D receipt.
3. Merge with a SHA guard, regenerate exact-main proof, clean up, and unblock CAMP-01E.

Rollback is allowed only before CAMP-01E starts; otherwise rerun dependent evidence from restored exact main.
