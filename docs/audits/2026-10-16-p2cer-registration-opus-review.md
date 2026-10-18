# P2CER registration — independent exact-head review (Opus)

- **Subject:** PR #2137 <https://github.com/SwiggitySwerve/MekStation/pull/2137>
- **Head:** `83605e05626ff7194c86450e22f5786066c8de7f` (branch `codex/p2cer-registration-20261016`, one commit)
- **Base:** `8a62fe84d248af155f52b94ba9b035d499f9efba`. This is current `origin/main` and the merge-base of the PR.
- **Reviewer:** Claude Opus 5.5 (`claude-opus-5-5`), read-only review sub-agent. I wrote only this file.
- **Contract:** the reconciliation plan section "P2CER" (line 2944) and the "P2CER combined ownership correction, 2026-10-09" (line 2956); the decision `p2c-ownership-amendment-parent-decision-20261009.json` (`nodeDelta`/`unitDelta`); and owner decision D1 in `owner-unblock-decisions-20261016.md`.
- **CI:** not polled. This verdict judges the diff only.

## Verdict: **APPROVE-WITH-NOTES**

No blockers. The diff matches the three-file contract exactly. Six semantic deltas each map to a clause in the governing decision. Nothing else changes. The notes below are informational and none of them requires a change to this PR.

## Recomputed census

| #   | Path                                                                                        | Status                   | Base bytes / SHA-256           | Head bytes / SHA-256                                                         |
| --- | ------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------ | ---------------------------------------------------------------------------- |
| 1   | `openspec/planning/2026-09-12-roadmap-completion/roadmap.json`                              | M (+9/−4 text, 13 lines) | 1063051 / `898811b9…4054af4`   | 1063270 / `b2441e1618b0b2aae331dce21ffc1ab2a5ae97e7fc5ee30905f752f401f18494` |
| 2   | `openspec/planning/2026-09-12-roadmap-completion/units.json`                                | M (+3/−1)                | 1261287 / `d3aae0d9…bbe19a5ad` | 1261418 / `5baa72a627a1408fd242532cb946f39b075925fd54ef4e195ddcd3132d5a4f1b` |
| 3   | `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cer-registration-20261016.json` | A (+124)                 | absent                         | 6701 / `314b0d0ae5c3169293f06f8c64fff1c7ce38cd3f7ef05fe0ea751fca0de47390`    |

The totals are 3 files and 135 insertions / 6 deletions. There are 0 `src/` edits (`git diff --stat 8a62fe84 83605e05 -- src` is empty) and 0 product files. The base preimage hashes match `census.md`/`preimages.json` and the receipt's `preimages[]`.

The preserved Task 8 receipt is `evidence/p2c-chain-registration-20261009.json`. It is 5268 bytes with SHA-256 `21dc7143ef8d3cf18a939a1faa65d0f1e0e0c57e098a04f470ff8d85a3e95317` at both base and head, so the bytes are identical.

The new receipt is UTF-8 without a BOM (first byte `{`). It contains no CR bytes and ends with LF.

### Semantic JSON delta (deep comparison, base → head; this is the full list)

1. `roadmap.nodes[R2.authority-live].ownershipPathsAmended20261009P2C.evidence`: `evidence/p2c-chain-registration-20261009.json` → `evidence/p2cer-registration-20261016.json`
2. `….restrictions.P2CE`: APPEND `src/lib/multiplayer/server/__tests__/ServerMatchBroadcaster.test.ts`
3. `….restrictions.P2CG1`: APPEND `src/lib/campaign/coop/campaignSyncTransport.ts`, `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts`
4. `….knownSourceTestLifecycleSubtotals.P2CE`: 10 → 11
5. `….knownSourceTestLifecycleSubtotals.P2CG1`: 9 → 11
6. `units.units[P2CG1].ownershipExceptions`: APPEND the same two transport paths

There are no key-order changes and no other added or removed keys. No change touches any other node, any other unit, any state, ID, stage, cap, alias, `dependsOn`, or the Task 57 `registration20261016` blocks.

### Subtotal arithmetic

Every unit in the container follows the existing convention: subtotal = listed source/test leaves + 1 lifecycle file (`units.json`). P2CA is 6+1=7, P2CB 4+1=5, P2CD 6+1=7, P2CF 4+1=5, P2CG2 6+1=7 and P2CH 4+1=5.

- **P2CE:** 10 listed + 1 = **11**. That is at most 15 (`P2CE.caps.maxFiles` stays 15). `roadmap.json` is **not** added as a leaf.
- **P2CG1:** 10 listed + 1 = **11**. That is at most 15 (`P2CG1.caps.maxFiles` stays 15).

All three newly named paths exist at base `8a62fe84`: `ServerMatchBroadcaster.test.ts`, `campaignSyncTransport.ts` and `__tests__/campaignSyncTransport.test.ts`.

## Answers to the review questions

**Q1 — Exactly three files, no `src/`:** Yes, confirmed. See the census above.

**Q2 — Each delta checked against the plan or decision:**

| Delta                                                                                  | Authority                                                                                                                                           | Result     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P2CE append `ServerMatchBroadcaster.test.ts` (`roadmap.json:2754`)                     | Plan line 2946; decision `nodeDelta`                                                                                                                | ✔          |
| P2CG1 append transport and test (`roadmap.json:2765-2766`)                             | Plan line 2956; decision `nodeDelta`                                                                                                                | ✔          |
| P2CE subtotal 10→11 (`roadmap.json:2793`)                                              | Plan line 2946 "subtotal10 to11"                                                                                                                    | ✔          |
| P2CG1 subtotal 9→11 (`roadmap.json:2795`)                                              | Plan line 2956 "updates their known subtotals to11"; decision `nodeDelta` "subtotal9->11"                                                           | ✔ (see N1) |
| Bind the governing receipt (`roadmap.json:2713`)                                       | Plan line 2956 "binds the new governing receipt"; decision `nodeDelta` "point the existing restriction container evidence field to the new receipt" | ✔ (see N2) |
| P2CG1 `ownershipExceptions` gets only the two transport paths (`units.json:5706-5707`) | Plan line 2956 "directly adds only the two exact P2CG1 transport ownershipExceptions"; decision `unitDelta`                                         | ✔          |
| P2CE unit unchanged                                                                    | Decision `unitDelta` "P2CE unit needs no change"                                                                                                    | ✔          |

Nothing is extra and nothing is missing.

**Q3 — Preserved fields and boundary flags:** The deep comparison found no other change. The Task 8 receipt bytes are unchanged. The receipt sets `registrationOnly: true` (line 4) and `sourceAdmitted`, `P2Released` and `U38Released` to `false` (top level, lines 121-123, and again under `prospectiveDelta`/`preservation`). P2CE and P2CG1 stay in state `blocked`. The PR does not touch any NDC1 file or baseline.

**Q4 — Interaction with Task 57 and PR #2135:**

- **Task 57:** `validateResidualRegistration` (`validate-roadmap.mjs:157`) checks only the ten `U99…U105`/`U101a-d` units. The PR leaves those blocks and `residualRegistration20261016` untouched.
- **PR #2135** (P2CA, open, head `e921a69f`) touches `units.json` (P2CA unit plus evidence) and P2CA source. It does not touch `roadmap.json` or the new receipt. `git merge-tree --write-tree e921a69f 83605e05` merges cleanly (tree `d94ad2fc`). The merged `units.json` keeps all 10 Task 57 `registration20261016` blocks and the P2CER additions. P2CER adds nothing to P2CA's restrictions or unit.
- **Caveat:** PR #2135's merge-base is `ba8007f2d`, which predates current main. Its own diff against main would drop the Task 57 blocks unless it is rebased. That is #2135's problem, not this PR's.
- **`--next`:** still returns `P2CA` at head.

**Q5 — Re-runs at head, in the PR worktree:**

- `node …/validate-roadmap.mjs --next` → `P2CA`, exit 0.
- Full validator → `ROADMAP VALIDATION PASSED: 79 nodes, 13 packages, 381 tasks, 40 triage rows`, exit 0.
- `node --test …/validate-roadmap.test.mjs` → tests 86, pass 86, fail 0, skipped 0. That confirms the **86/86** claim.

**Negative probes (mine).** For each probe I mutated the live file in the worktree, ran the full validator, then copied the original bytes back:

| Probe                                                | Validator result                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `P2CG1.caps.maxFiles = 16`                           | **exit 1**, `P2CG1.caps.maxFiles must be an integer in 1..15`                |
| `P2CG1.state = main-verified`                        | **exit 1**, `P2CG1 is main-verified without a admission receipt` (15 issues) |
| Add `roadmap.json` as an 11th P2CE restriction leaf  | exit 0 (not guarded, see N3)                                                 |
| `knownSourceTestLifecycleSubtotals.P2CE = 16`        | exit 0 (not guarded, see N3)                                                 |
| Point the container `evidence` at a nonexistent file | exit 0 (not guarded, see N3)                                                 |
| Add the transport file to P2CE `ownershipExceptions` | exit 0 (not guarded, see N3)                                                 |

After the probes, `roadmap.json` hashed to `b2441e16…` and `units.json` to `5baa72a6…`, both equal to head. `git status --short` was empty. The Task 8 and P2CER receipt hashes were unchanged.

The external authority hashes also match what the receipt records: the decision is `82cd51d4…`, D1 is `5cd83a99…` and the census is `043370b7…`. The plan file was read only (`ddfca64e…`).

**Q6 — D1 honesty:**

- The receipt cites D1 only for the predicate swap: "After this decision replaces after genuine NDC1 Main".
- It does not claim NDC1 Main, owner approval, source admission or delivery. It states "This receipt is not an approval or a delivery claim".
- It names the implementer's identity (openai/gpt-6.1-sol/high) and defers parent identity to Root.
- No packet, ruling or plan file is in the diff.
- `qa.md` openly says the implementation followed D1 and did not treat NDC1 Main as a prerequisite.

## Findings

1. **N1 — Info — `roadmap.json:2795`.** P2CG1's subtotal goes 9→11, not 10→11. The review brief's "10->11" applies only to P2CE. The plan text ("updates their known subtotals to11") and the decision `nodeDelta` ("subtotal9->11") both authorize 9→11, and the arithmetic (10 leaves + 1 lifecycle) is consistent. Correct as written.

2. **N2 — Low — `roadmap.json:2712-2713`.** The evidence pointer for the container `ownershipPathsAmended20261009P2C` now names the P2CER receipt, while the container's `planTask` stays `8`. The decision requires exactly this: repoint `evidence`, preserve all other fields. The history chain survives because the new receipt's `previousRegistration` (receipt line 50) pins the Task 8 receipt by path, byte count and hash. One limit: a reader who follows only the container pointer no longer reaches the Task 8 receipt directly. No change requested.

3. **N3 — Low (process) — `validate-roadmap.mjs` has no rule for `ownershipPathsAmended20261009P2C`.** My probes showed the validator accepts four mutations of this layer:
   - an extra restriction leaf (including the forbidden `roadmap.json` "sixteenth leaf");
   - a subtotal of 16, which is over the 15-file cap;
   - a dangling `evidence` path;
   - an unauthorized P2CE `ownershipException`.

   As a result, P2CER's specific scope is enforced only by `verify-scope.cjs` in the evidence directory and by independent review, not by the repo validator. The implementer's refusal probe (`failure.log`) exercised the Task 57 U100 guard, not a P2CER surface. `qa.md` describes it accurately, but it does not show that the validator refuses P2CER-shaped errors. The three-file contract forbids validator edits here, so this is not a defect in the PR. It is a gap for Root to track if this restriction layer is meant to be machine-enforced at later P2CE/P2CG1 source admission.

4. **N4 — Info — overlapping prospective ownership of `src/lib/campaign/coop/campaignSyncTransport.ts` (+ test).** After this PR, the transport file and its test are named prospectively by:
   - P2CD (restriction; owns `src/lib/campaign`);
   - P2CG1 (restriction plus exception, new here);
   - Task 57 residual U105 and U101c (`registration20261016.files`).

   This is allowed by the plan and decision, and the ledger already overlaps the same way on `CampaignSyncSession.ts`. The validator checks ownership only on merged units, so nothing refuses the overlap. Later source admissions for these units must serialize on this file. No change requested.

5. **N5 — Info — receipt timestamp.** The receipt `at` is `2026-10-15T21:11:00.549Z` while the filename says `20261016`. This matches the date convention of the owner-decision file. Cosmetic only.

## Blockers

None.

## Remaining gates (unchanged, not claimed here)

These remain Root's responsibility: required hosted CI, guarded regular merge, actual Main proof, evidence custody and scoped cleanup. P2CE/P2CG1 source admission and source cap fit remain unclaimed.
