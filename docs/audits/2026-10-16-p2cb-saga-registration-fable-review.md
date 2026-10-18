# P2CB saga-leaf registration - independent exact-head review (Fable)

- **Subject:** PR #2142 <https://github.com/SwiggitySwerve/MekStation/pull/2142>
- **Head:** `89fe58f77b84b1fcbba042d580a9c90096bc9990` (branch `codex/p2cb-saga-registration-20261016`, one commit)
- **Base:** `b72883f797f732dba8a144aed70dacc1b92fdb45`. This is current `origin/main` and the merge-base of the PR.
- **Reviewer:** Claude Fable 5.1 (`claude-fable-5-1`), read-only review sub-agent, a different model from the author (Claude Opus 5.5). I wrote only this file. No OWNER-RULING, label or packet decision was touched. Only the named `.omo` files were read (plan, parent decision, independent review, sibling `report.md` and `census.md`).
- **Contract:** plan section "Task10 corrected public-view preparation, 2026-10-09" (plan line 2949); `task10-preparation-parent-decision-20261009.json` `limits` ("name/register any genuine extra owner/test/roadmap leaves, no foreign SQL or invented availability"); the Task 10 independent review line 89 ("Do not copy foreign saga SQL into the public-view owner or assert an error/absence distinction that the current interface does not expose"); P2CER (PR #2137, commit `83605e05`) as shape precedent only.
- **CI:** snapshot only (all listed checks green at head, `MERGEABLE`). This verdict judges the diff.

## Verdict: **APPROVE-WITH-NOTES**

No blockers. The diff is exactly the two claimed files, the roadmap deep-diff is exactly the four claimed semantic deltas, the saga-reader scope is genuinely necessary and minimal, and every preserved byte and boundary flag checks out. The notes are informational; none requires a change to this PR.

## Recomputed census

| #   | Path                                                                                            | Status                  | Base bytes / SHA-256                                                         | Head bytes / SHA-256                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | `openspec/planning/2026-09-12-roadmap-completion/roadmap.json`                                  | M (+5/-3 text, 8 lines) | 1063270 / `b2441e1618b0b2aae331dce21ffc1ab2a5ae97e7fc5ee30905f752f401f18494` | 1063461 / `1d150eb13b3a864e3bd5e495e2d9ca4e3b220f6967c40b0b2868a0151ef8fb0c` |
| 2   | `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cb-saga-registration-20261016.json` | A (+128)                | absent                                                                       | 2-space JSON, UTF-8, first byte `{`, 0 CR bytes, ends LF, parses             |

Totals: 2 files, 133 insertions / 3 deletions. `git diff --stat b72883f7...89fe58f7 -- src` is empty. `units.json` is not in the diff. `gh pr view --json files` lists the same two paths.

Preserved byte-for-byte (identical SHA-256 at base and head):

| Path                                            | Bytes   | SHA-256                                                            |
| ----------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `units.json`                                    | 1270686 | `b694f1d1a52b0f987f892f4d57431eec5c1a43f69b057a38e434f400709895d0` |
| `evidence/p2cer-registration-20261016.json`     | 6701    | `314b0d0ae5c3169293f06f8c64fff1c7ce38cd3f7ef05fe0ea751fca0de47390` |
| `evidence/p2c-chain-registration-20261009.json` | 5268    | `21dc7143ef8d3cf18a939a1faa65d0f1e0e0c57e098a04f470ff8d85a3e95317` |

These match the receipt's `preimages[]`, `previousRegistration` and `chainNote`. The receipt's external hashes also reconcile: plan `ddfca64e...`, parent decision `16844dbd...`, sibling `report.md` 3216 B `1fafae91...`, sibling `census.md` 12813 B `18228d3b...`, and both saga preimages (14308 B `7804d4af...`, 18881 B `d8b2211c...`) equal `git show b72883f7:<path>`.

### Semantic JSON delta (deep comparison, base -> head; full list, 3 structural entries = 4 claimed deltas)

1. `nodes[R2.authority-live].ownershipPathsAmended20261009P2C.restrictions.P2CB`: APPEND `src/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga.ts` and `src/lib/multiplayer/server/history/__tests__/CoordinatedOutcomeCorrectionSaga.test.ts` (4 -> 6 leaves; existing 4 unchanged and in order).
2. `....knownSourceTestLifecycleSubtotals.P2CB`: 5 -> 7.
3. `....evidence`: `evidence/p2cer-registration-20261016.json` -> `evidence/p2cb-saga-registration-20261016.json`.

No other key is added, removed or changed anywhere in `roadmap.json`. No state, ID, stage, cap, alias, `dependsOn`, other unit restriction or subtotal moves. `planTask` stays 8, as it did after P2CER.

**Subtotal arithmetic:** 6 listed leaves + 1 lifecycle file (`units.json`) = 7, the same convention every other unit in the container follows (P2CA 6+1, P2CD 6+1, P2CE 10+1, P2CF 4+1, P2CG1 10+1, P2CG2 6+1, P2CH 4+1). 7 is at most `P2CB.caps.maxFiles` = 15. Both new paths exist at base.

**units.json unchanged is correct:** P2CB `ownershipPaths` = `["src/lib/campaign", "src/lib/multiplayer/server"]`; both leaves are under `src/lib/multiplayer/server`, so no `ownershipExceptions` entry is needed. P2CER needed exceptions only because its transport leaves fell outside P2CG1's paths.

## Answers to the check items

**(1) Exactly 2 files, no `src/` or `units.json`:** confirmed (census above).

**(2) Deep-diff exactly the 4 claimed changes:** confirmed (delta list above). Both paths exist at base with the receipt's hashes.

**(3) Evidence-pointer repoint - keep it, do not revert.** Authority: the Task 10 parent decision authorizes registering "genuine extra owner/test/roadmap leaves"; the receipt cites P2CER as "shape precedent only", which is honest, since P2CER's decision contained a literal "point the existing restriction container evidence field to the new receipt" clause and the Task 10 decision does not. The repoint is nonetheless the only consistent option: the container has a single `evidence` field, and if it still cited the P2CER receipt, the container's governing evidence would not name the two P2CB leaves it now contains (the new receipt states "neither granted these new leaves"). Adding a second evidence field or an array would be an unauthorized schema change. The chain is intact: P2CB receipt -> `previousRegistration` pins the P2CER receipt by path, bytes and hash -> P2CER receipt pins the Task 8 receipt the same way. Recommendation: Root accepts the repoint as the established container-chain shape. See N1.

**(4) Saga-reader scope is genuinely necessary and minimal.**

- Null-for-every-error confirmed at `src/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga.ts:391-393` (`} catch { return null; }`), while the no-row case also returns null at line 390 and an absent table throws inside the `try` and lands in the same `catch`. Three cases, one value.
- The only other public reader, `readCoordinatedCorrectionSaga(matchDb, key)` at lines 361-367, requires `matchId`/`outcomeVersion` (the inbox row carries only `outcome_id`, see `campaignProgressionReaders.durable.ts:110-135`) and calls `migrateCoordinatedCorrectionSaga` at line 365, a schema side effect on a launch read.
- Sole caller of the by-outcome reader: `campaignProgressionReaders.durable.ts:123` (a P2CB-named leaf). No test anywhere currently exercises `readCoordinatedCorrectionSagaByOutcomeId`.
- Could the 4 named P2CB files do it honestly? No. The table-name constant is exported (line 38), so `durable.ts` could probe `sqlite_master` itself, but that still cannot separate "no row" from "read failed" without re-issuing the owner's SELECT. Re-issuing it is the foreign saga SQL the independent review (line 89) forbids; refusing on every null would block launch for every campaign with no correction, the common case.
- Minimal: one product leaf plus its own test. Draft size +25/-9 and +49/-0 is proportionate.

**Draft diff design sanity (never run, not in this PR; for the later source stage):** sound against P2CB's review classes (`authority`, `privacy`, `replay`, `idempotency`, `concurrency`). It is a pure read, exposes nothing the legacy reader did not, does not migrate, keeps the gate decision in P2CB's owner, and preserves legacy behaviour for the sole caller by wrapping strict in `try/catch null`. Points to carry forward, none blocking: see N4.

**(5) Fit claim ~11/15 files, ~300-385/500 lines:** arithmetic checks. Product 190-250 + 45-70 + 25 = 260-345, plus ~40 lifecycle = 300-385. Files 4 named + `units.json` + 4 dated evidence + 2 saga = 11. The 4-evidence-file count is an assumption (P2CA needed several census rounds) and tests are reported separately per the P2CA counting rule. The receipt correctly says "Not a cap-fit claim".

**(6) Preserved bytes and boundary flags:** all three preserved files identical at base and head (table above). Receipt: `registrationOnly: true` (line 5); `sourceAdmitted`, `P2Released`, `U38Released` all `false` (lines 126-128); `ndc1AndApproval` says no NDC1 Main, owner approval or ruling is claimed, and no packet or ruling file is in the diff. P2CB stays `planned`. Actor identity `claude-opus-5-5` matches the brief.

**(7) Validator re-runs at head, in the PR worktree:**

- `node validate-roadmap.mjs` -> `ROADMAP VALIDATION PASSED: 79 nodes, 13 packages, 381 tasks, 40 triage rows`, exit 0.
- `node validate-roadmap.mjs --next` -> `P2CB`, exit 0.
- `node --test validate-roadmap.test.mjs` -> tests 86, pass 86, fail 0.

**Negative probes (mine; live file mutated, validator run, original bytes copied back, hashes re-checked equal to head, `git status --short` empty):**

| Probe                                                | Result                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Append `roadmap.json` as a 7th P2CB restriction leaf | exit 0 (not guarded)                                       |
| `knownSourceTestLifecycleSubtotals.P2CB = 16`        | exit 0 (not guarded)                                       |
| Container `evidence` -> nonexistent file             | exit 0 (not guarded)                                       |
| Drop one leaf, subtotal still 7                      | exit 0 (not guarded)                                       |
| Control: `P2CB.caps.maxFiles = 16`                   | **exit 1**, `P2CB.caps.maxFiles exceeds R2.authority-live` |

A grep of `validate-roadmap.mjs` for `ownershipPathsAmended`, `knownSourceTestLifecycle` or `restrictions` returns nothing. The restriction layer is not machine-checked, exactly as P2CER review note N3 found. See N2 for what review must therefore enforce.

## Findings

1. **N1 - Low - `roadmap.json:2713` evidence repoint.** Authorized by the Task 10 decision's "register ... roadmap leaves" plus the P2CER container-chain shape; there is no literal "repoint evidence" clause for Task 10. Keep it: a container whose evidence does not name its own leaves would be worse, and the receipt chain pins every predecessor by hash. One limit carried from P2CER N2: a reader following only the container pointer reaches Task 8 only through two hops. No change requested.

2. **N2 - Low (process) - restriction layer is review-enforced only.** The validator accepts an extra leaf, an over-cap subtotal, a dangling evidence path and a leaf/subtotal mismatch. Independent review must therefore enforce, and this review did: the P2CB leaf set is exactly the 6 paths above with no directory-wide grant; every leaf exists at base; subtotal = leaves + 1; the container `evidence` resolves to a file in the diff whose `prospectiveDelta` matches the deep-diff; no other unit's restriction or subtotal moved; `units.json` needed no exception. Later P2CB source admission must freeze its census against exactly these 6 leaves. A validator rule for this container remains a gap for Root to track, outside this PR's contract.

3. **N3 - Info - necessity confirmed at file:line.** `CoordinatedOutcomeCorrectionSaga.ts:390` (no row -> null), `:391-393` (every error -> null), `:361-367` (keyed reader needs `matchId`, migrates at `:365`), `campaignProgressionReaders.durable.ts:123` (sole caller). The strict distinction cannot be built honestly from P2CB's four named files.

4. **N4 - Info - draft saga diff, points for the source stage (not run, not in this PR).**
   - The "absent table = known absence" branch relies on the saga table being created lazily only by saga operations. Verified true today: `DurableMatchStore` construction runs `migrateMatchStoreSupersession` (`DurableMatchStore.ts:675`, `DurableMatchStore.supersede.ts:104`), which does not create the saga table; only the saga functions and `CoordinatedOutcomeCorrectionTarget.steps.ts:143` call `migrateCoordinatedCorrectionSaga`. The strict reader's docblock should state that invariant so a future constructor-time migration does not silently make the branch dead.
   - The `sqlite_master` probe and the SELECT are two statements outside a transaction. Benign: there is no drop path, and a table created between the two only makes the SELECT succeed.
   - Strict throws on `SQLITE_BUSY`, a closed handle or corruption; that is the intended fail-closed semantics. The P2CB launch gate in `durable.ts` must map that throw to a typed unavailable/refused result rather than let it escape as an unhandled error. That mapping is P2CB's work, inside its named leaves.
   - Draft test 1 (fresh `:memory:` store, table absent, not created) is consistent with the constructor behaviour above. Draft test 2 records without `seedMatchTail`; that works because an empty slot classifies as `write` (`CoordinatedOutcomeCorrectionOutbox.ts:51`), but confirm the empty-tail supersede path at RED. Draft test 3 (`store.close()` then strict throws, legacy null) matches better-sqlite3 behaviour; `getDatabase` is public (`DurableMatchStore.ts:1738`) and the `.open` guard in `afterEach` is correct.

5. **N5 - Info - fit estimate.** Arithmetic is right (see item 5). It is an estimate with an assumed evidence-file count; the receipt disclaims cap fit, which is the honest framing.

6. **N6 - Info - overlap.** No other unit's `restrictions` in `roadmap.json` names either saga leaf. `units.json` mentions `CoordinatedOutcomeCorrectionSaga` only in U19b/U24/U24a behaviour prose about historic test pins, not as ownership. Later P2CB source admission must still check for live PRs touching these two files.

7. **N7 - Info - receipt timestamp.** `at` is `2026-10-16T00:00:04.212Z`; filename date `20261016` follows the P2CER convention. Cosmetic.

8. **N8 - Info - CI snapshot.** All listed hosted checks pass at head and GitHub reports `MERGEABLE`. This is a snapshot, not a merge or Main claim.

## Blockers

None.

## Remaining gates (unchanged, not claimed here)

Required hosted CI confirmation, guarded regular merge, actual Main proof, evidence custody and scoped cleanup remain Root's responsibility. P2CB source admission, the 11-leaf census, RED and cap fit are unclaimed; `--next` returning `P2CB` supplies no permission.
