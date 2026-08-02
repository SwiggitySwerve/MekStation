## Context

`CampaignHostRegistry` now owns the CAMP-01B revision-bound roster and `forceId -> unitIds` projection. The next boundary must authorize one participant choice without allowing the browser to select its identity or replace the host snapshot.

This child implements the `multiplayer-sync` delta and frozen CAMP-01C contract. It follows CAMP-01B and precedes the launch-boundary child.

## Goals / Non-Goals

**Goals:**

- Bind player and role from the authenticated/verified connection and registry entry.
- Validate mission, force, and revision against the latest accepted snapshot.
- Accept only a minimal choice payload and reject authority-shaped client payloads before state mutation.

**Non-Goals:**

- Rebuilding or mutating the campaign snapshot, assigning arbitrary force membership, or launching combat.

## Decisions

### D1. Server derives participant identity

The wire payload SHALL contain exactly `{ missionId, forceId, choice }`. The binder SHALL derive `campaignId`, `matchId`, `playerId`, `role`, and current revision from the verified connection and `CampaignHostRegistry`; client-supplied identity, role, revision, roster, or full-force fields are rejected rather than ignored. A choice is accepted only for the bound mission and a force present in the registry projection.

At authenticated connection baseline/hydration, the server SHALL capture an acknowledged snapshot revision on the connection. Admission SHALL atomically compare that connection-owned revision with the registry's current revision; a mismatch SHALL reject the choice and require rebind/rehydration before another choice. The client cannot author or advance this revision.

### D2. Admission is revision and membership bound

The server SHALL compare the request against the latest accepted registry revision, reject stale or foreign campaign/match/mission references, and require the chosen force to contain only authoritative projected unit ids. Duplicate accepted choices are idempotent for the same participant and choice; conflicting repeats, full-force replacement, unknown force, and cross-player attempts fail without changing the session.

### D3. Pin the CAMP-01C receipt seam

The sole authority row is `WAVE_CONTRACTS['camp-01c']`: `commandId=camp-01c`, run root `.sisyphus/evidence/playtest/camp01c-participation-<sha>`, predecessor `camp-01b`, Windows command sequence `[npm test -- --watchAll=false --runTestsByPath src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts --runInBand, npm run verify:qc:coop-campaign-journey]`, canonical argv digest `4ebd9923861982f9f37151156a072e40c6f4bf58238d09a7d8fd96b0349885d1`, artifacts `command-result.json`, `receipt-manifest.json`, `wave-result.json`, assertions `serverPlayerDerived===true`, `serverRoleDerived===true`, `authorizedChoiceAccepted===true`, `fullForceRejected===true`, `forgedIdentityRejected===true`, `foreignForceRejected===true`, `staleRevisionRejected===true`, cap 12 files/450 lines.

Before product editing, the controller SHALL run `register-pr-target --wave=camp-01c --subject=product --worktree=<owned-worktree> --spec=<exact-spec-tuple>`. Reviewed-head and exact-main proofs SHALL invoke `qc:camp01-authority-receipt:controller proof` with the row-resolved run root, exact SHA/spec/product tuple, and mode; only the controller may publish low-level results. After exact-main proof, `controller cleanup` consumes the exact run root, run id, and receipt digest before CAMP-01D. A narrative or direct low-level invocation is non-authoritative.

## Risks / Trade-offs

- **Client attempts to over-authorize** -> Closed payload validation rejects unknown identity and full-force fields before dispatch.
- **Snapshot races** -> Read the registry revision and force membership atomically and reject stale replacement.

## Migration Plan

1. Admit product work only after all ten frozen child specs are merged and ledger-accounted, CAMP-PROOF and PROOF-02 disposition/repairs pass, CAMP-00 cleanup passes, and CAMP-01A/B exact-main cleanup passes.
2. Add strict binder and runtime-session tests, then run the immutable CAMP-01C receipt.
3. Merge with a SHA guard, regenerate exact-main proof, clean up, and unblock CAMP-01D.

Rollback is allowed only before CAMP-01D starts; otherwise rerun dependent evidence from restored exact main.
