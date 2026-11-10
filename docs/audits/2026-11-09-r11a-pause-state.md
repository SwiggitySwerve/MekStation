# R11a pause state

**PARKED under PARITY-PLAN section 50.** No implementation may resume until the owner/C4 releases the lane. The owner directed one checkpoint push as a draft PR; this is incomplete work with known failing tests, not merge-ready work.

## Branch and evidence

- Branch: `fix/d8-r11a-replay-fidelity-version`.
- Implementation checkpoint: `bb29e1427ad2419968da0e08b835a9048454bd5f`; verification-limit documentation: `82c79f7051baa632b9acc315a7bc2b4dfb00ff53`. The parking update changes documentation only.
- Base: `943f5354db0a8f88bd567e91ec4565ed83d3c5a7`. origin/main has since moved; merge current main on resume under the lane rules, never reset/rebase this checkpoint.
- Canonical report: [R11a-COMPAT-BLOCKER.md](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-COMPAT-BLOCKER.md), now including section 5. Frozen source/runner/results are in [R11a-frozen-client](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/).
- Repository copies: `docs/audits/2026-11-09-r11a-compat-blocker.md` and `docs/audits/2026-11-09-r11a-pause-state.md`.

## Done and proven

- Partial version owner, writer 2, both producer stamps, absent-to-1 accessor without mutation, validation, release-rule contract and fixture, optional strict schema field with a changed parser schemaId, and change-local OpenSpec package.
- Optional SessionJoin capability and forwarding are partially implemented. Partial host preflight rejects an unsupported reader after membership resolution. Current host refusal is still Error-only; the approved final ordering is not implemented.
- Partial updated client/hook/pages implement named reload-required and a shared Reload action. No new projector, combat rule, dice arithmetic, semantic recovery fix or certification was introduced.
- Baseline focused suites: 91 tests passed. Partial owner/factory/runner/schema/server suites: 73 passed. Partial updated hook/lobby/spectator suites: 45 passed, with a Jest worker teardown warning.
- Both TypeScript configs passed on the then-current tree. Final-tree typechecking/format/lint remains outstanding. The worktree's configured Husky generated entrypoint is absent, so ordinary checkpoint commits did not run hooks; no skip flags or config changes were used.
- Budget check passed with 57 unkeyable tests, no increase.
- Frozen old-client witness: four characterization tests passed; Error-only visibility acceptance deliberately failed because no alert exists.
- The already-running launch-time witness completed after the park directive: **1 passed, 5 skipped, exit 0; 22 assertions**. The actual old lobby shows the terminal panel and exact reload reason after the real pinned LaunchMatch handler broadcasts active, followed by Error + Close, with no seed/replay frames. See `R11a-frozen-client/launch-result.json`.
- Code reading disproves the no-seed-before-launch premise: ordinary lobby socket bootstrap creates and persists GameCreated/GameStarted, and SessionJoin streams them before its lobby baseline. Normal fresh spectator REST registration is active-only. Thus the passing display witness alone does not close pre-launch compatibility.
- Historical recording remains 58,703 bytes, SHA-256 `4366ce6cb897f79ea9f75e9b88a48f21db16864e56c58cbe790d7fa72c6833a9`. No re-mint or provenance change.

## Remaining

1. **Wire field:** retain the approved optional `SessionJoin.replayFidelityReaderMaxVersion`, absent reader 1. Finish real socket forwarding/validation tests and any internal replay-call capability handling; the partial passing helper tests do not prove all runtime paths.
2. **Host order:** implement and test the approved authenticated/member-authorized active baseline -> Error -> Close -> detach before any GameCreated/Event/replay frame. Current Error-only preflight remains unchanged in the parked checkpoint.
3. **Launch-time path:** narrow frozen display assertion is complete and passing. Full path remains incomplete because pre-launch seed delivery exists. Account for this before claiming cold-lobby compatibility; do not fabricate active metadata. Keep the approved preparation split/accepted old pre-prep lobby limitation available for the end-to-end decision.
4. **Per-lock proofs:** do not re-pin either engine lock. Capture new encoder inputs and remove only GameCreated.payload.replayFidelityVersion, preserving original framing/order/codec, to prove old bytes and hashes exactly. Old captures exist as `R11a-old-engine-42.{json,jcs}` and `R11a-old-engine-12345.{json,jcs}` in this directory. No complete proof yet; parser-ID-only fingerprints need separate attribution.
5. **Unfinished tests:** three new InteractiveSession.seedRoundTrip assertions compare pre-storage JSON order against existing canonicalized storage order; correct the test boundary without normalizing away a claimed raw-byte proof. ReplaySurfaceGate's added future test mistakenly starts with HISTORY[0], which is GameStarted; make a real GameCreated witness. The two GameEngine event locks are intentionally unchanged and fail under the new stamp. The earlier `oldJoiningAlert` helper is inadequate as old-client visibility proof and needs replacement with real frozen-client coverage.
6. **Known last-batch result:** 47 passed / 6 failed (two unchanged engine locks, three unfinished persistence assertions, one malformed future-gate witness). No final green claim.
7. **Mutants:** required runner omission, absent fallback to 2, imported missing stamp overwritten, schema support removed, rule keyed on 2, RNG/order drift, server preflight bypass and silent mirror pending mutants remain to execute and restore. Complete append-only rule/consumer guard enforcement and C-1c 2b release-3 witness.
8. **Strict OpenSpec:** change tasks remain unchecked. `openspec validate --all --strict` and final focused/schema-pack/C4 digest/replay-source/replay-scope checks, both TypeScript configs, units lint, formatting and budget must be completed before a later implementation push. The present draft checkpoint push is the explicit section-50 parking action; it does not certify those gates.

## Lock values preserved

| Lock | Existing literal (not re-pinned) | Observed stamped value (unproved movement) |
| --- | --- | --- |
| Engine seed 42 events | `2e6518e7722bb8fedc5212f0a83b0b67f4568ab56326e54266cc2d94608c0de1` | `729e77594b25d0407b914a7149bdd421375fbe38c01ff0be0f94e44139076a99` |
| Engine seed 12345 events | `b0d824117f9c7cdff7f78ff4a1d9aa54d1a6139a5557a85b7bb31f55c3f9399a` | `a58194599adbf83c95b0f75a8295152e251a755a55a9353670e9649c51ceec0b` |

## Root rulings (verbatim)

1. `SessionJoin.replayFidelityReaderMaxVersion` (optional; absent = reader 1): **APPROVED**.
2. The host order for an incompatible reader in an active match (authenticate, membership, compare versions, the viewer-authorized real `LobbyUpdated(active)` baseline, `Error(PROTOCOL_VIOLATION, "reload-required: …")`, `Close`, detach; no GameCreated, Event or replay frames first): **APPROVED**.
3. Verify the launch-time path with the frozen witness. If it fails, the fallback split (a reader-preparation PR first; old pre-prep lobby tabs an accepted, written limitation) is **APPROVED**.
4. The in-app named reload-required error with a Reload action stays in R11a.

## Next step and dependencies

Remain parked. The first resume step is to merge current main into this lane and revisit section 5's pre-launch seed trace against that base, then complete compatibility using the approved reader field and active host ordering while accounting for lobby joins. The narrow launch witness need not be rerun absent relevant source changes.

Dependencies: owner/C4 release from section 50; current main reconciliation; compatibility integration and complete bounded proof. R11a remains the predecessor of C-1c 2b (next writer 3, counter rule >=3); version 2 has no exactness guarantee. No separate C-1c 2a is reserved. R10 correction schema/privacy and SP dice-position storage remain separate work and are not implemented by this stamp.

No new tests or fixes start during parking. No subagents, installs, full/directory Jest, re-mints, merges or automatic PR monitoring were used. Root owns any eventual merge.
