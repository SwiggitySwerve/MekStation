# Nightly diagnosis: multiplayer privacy and authority packs

**Bucket:** `e2e/gm-two-player-privacy.pack.spec.ts` E2E-19, E2E-25, E2E-20 (with E2E-23 and E2E-24), and E2E-21; `e2e/gm-two-player-authority.pack1.spec.ts` E2E-08
**Date:** 2026-10-18. **Author:** research sub-agent. This is a diagnosis only: no commits, no PRs, and the root checkout was not edited.
**Code read at:** `origin/main` ebbea9a4e, in a fresh worktree at `E:/Projects/Personal/MekStation-wt/nightly-diag-pa`. Main has since moved to 631484c8f; none of these causes depend on that difference.
**Raw evidence:** `E:/Projects/Personal/MekStation-wt/nightly-diag-20261018/pa/`. It holds `failed-<run>.log` for the runs listed below, the Playwright artifact for 39129982940 in `art-39129982940/`, and the local reproduction logs `repro-*.log`.

## Bottom line

These five rows have **three unrelated causes**. None of them is a product privacy or authority regression.

| Row                 | Class                  | Cause in one line                                                                                                                                                                                                                                                                    | Introduced by                                                                                                                                       |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E-19 (:220)       | **(d) CI environment** | The nightly runs this spec without the combat-journal fixture arm it requires. `GET /api/matches/:id/head` returns `404 {"error":"no head"}`, so the client never sends the `rewind-preview` POST the test is waiting for.                                                           | Latent since the row became a plain row (#1891, 2026-09-22). Not visible until the nightly reached Playwright again (77c30dcf0, #2182, 2026-10-17). |
| E2E-25 (:276)       | **(d) CI environment** | Same mechanism, through the same `previewCorrection` helper.                                                                                                                                                                                                                         | Latent since #1943 (2026-09-25). Not visible until 2026-10-17, as above.                                                                            |
| E2E-20/23/24 (:365) | **(b) test drift**     | U37 (#1975, 072b320a7, 2026-09-25) intentionally places networked tokens at the engine's public deploy hex. The test's sealed secret is a `GoProne` declaration with `to === from`, which is that same public hex. The board assertion is now false by construction.                 | #1975 (U37)                                                                                                                                         |
| E2E-21 (:460)       | **(b) test drift**     | Same as E2E-20.                                                                                                                                                                                                                                                                      | #1975 (U37)                                                                                                                                         |
| E2E-08 (:153)       | **(c) flake**          | Marked flaky: it failed attempt 1 and passed on retry. The test hashes the live `mekstation.db` file before and after a read-only SELECT while the server keeps writing to it (WAL mode). A write between the two hashes fails the assertion even though the reader changed nothing. | The hash pattern dates from #1345 and #1486. It only shows in the nightly, where one database lives for the whole suite.                            |

**The awaited response.** The response E2E-19 and E2E-25 wait for was **not changed by any recent L1 unit**. This includes P2CG1B..S, B14-0A/0B, the fog toggle #2253, the spectator (S) work and the fog-history PR #2212. The evidence:

- The failures are byte-identical in run 39017508685 (head 31610a56d), which predates #2212, #2253 and B14-0A/0B. They are also identical in 39022280834, 39033900424 and 39129982940.
- B14-0A (#2267) and B14-0B (#2270) are not in the 39129982940 head. The local armed run below was at a head that includes them, and E2E-19 and E2E-25 still pass there.
- Every file on the path was last touched on or before 2026-09-25: `matchHeadRoute.ts` (#1871), `readGmRewindHead` (#1875), `useGmRewindProducers` (#1881) and `useGmCorrectionProducers` (#1946).

**Nightly policy.** These specs carry no quarantine, tag exclusion or `testIgnore` in `playwright.config.ts`. The nightly runs every chromium spec bare (`.github/workflows/nightly-validation.yml:184-192`). The GM packs were designed to run under the QC ladder (`scripts/qc/gm-two-player-campaign-core.cjs`), which arms the fixture per group. The nightly has never armed them.

**History caveat.** "Failing since 2026-10-17" is the wrong frame for this bucket. The nightly has failed on every scheduled run back to at least 2026-08-08. From at least 2026-09-15 through 2026-10-16, Full E2E died at collection with `Error: Missing browser route proof details for /compendium/chassis` (for example runs 34980222901, 36147800812 and 38910827190). These packs therefore **never ran in the nightly** between their rows going live and 2026-10-17. 77c30dcf0 ("fix(qc): restore the nightly e2e collection") turned them on in run 39008344531. The 2026-10-17 06:01 and 07:19 runs had path and host problems, which 31610a56d fixed; see the per-run table.

## Per-run classification

| Run (head)                                             | E2E-19                                                     | E2E-25      | E2E-20             | E2E-21              | E2E-08                                 |
| ------------------------------------------------------ | ---------------------------------------------------------- | ----------- | ------------------ | ------------------- | -------------------------------------- |
| 39008344531 (817739ca6), first run to reach Playwright | fail: `EVIDENCE_DB_MISSING` (relative runtime path; infra) | fail        | fail: board `-2,5` | fail: board `-2,-5` | fail: `EVIDENCE_DB_MISSING`            |
| 39013211365 (105eddcb9)                                | `ECONNREFUSED ::1:3600` (server down; infra)               | same        | same               | same                | same                                   |
| 39017508685 (31610a56d), after the path and host fix   | **waitForResponse timeout**                                | **timeout** | **board**          | **board**           | pass                                   |
| 39022280834 (33d6476e9)                                | timeout                                                    | timeout     | board              | board               | pass                                   |
| 39033900424 (0ba167f32)                                | timeout                                                    | timeout     | board              | board               | pass                                   |
| 39129982940 (1b8558625)                                | timeout                                                    | timeout     | board              | board               | **flaky** (attempt 1 fail, retry pass) |

The four privacy rows fail consistently on every valid run, including all retries. E2E-08 failed once in four valid runs, and passed on retry that time.

---

## 1. E2E-19 and E2E-25: class (d), the CI lane lacks the fixture arm

### Root cause chain (file:line)

1. The spec says it needs the arm: `e2e/gm-two-player-privacy.pack.spec.ts:82-85` reads "Both rows require the ladder's journal fixture arm - the runner arms `privacy-pack` the way it arms `authority-recovery`."
2. Production combat-journal authority is hardcoded off: `src/lib/multiplayer/server/matchJournalAuthority.ts:19-20` (`'off'`). The only override is the E2E arm at `src/lib/multiplayer/server/combatJournalAuthorityEnabled.ts:41-59`. It requires `NEXT_PUBLIC_E2E_MODE==='true'` and `MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE` set to `shadow` or `enabled`.
3. Only the QC ladder sets that key: `scripts/qc/gm-two-player-campaign-core.cjs:203-205` and `:236-240`, for any plan that includes `privacy-pack` or `authority-recovery`. `playwright.config.ts:318-327` forwards the key to the server only when it is present.
4. The nightly step sets only `MEKSTATION_E2E_SERVER_COMMAND` and `HOSTNAME` (`.github/workflows/nightly-validation.yml:184-192`). The combat journal therefore stays off and writes no effective history head for the match stream.
5. The host clicks Preview GM Fix. `useGmCorrectionProducers.ts:100-108` calls `buildGmRewindRequest` (`useGmRewindProducers.ts:41-49`), which calls `GET /api/matches/:id/head`. `src/pages-modules/api/matchHeadRoute.ts:64-79` answers `404 {"error":"no head"}`. The builder returns `null`, the producer returns `{kind:'unavailable'}`, and **no `POST /rewind-preview` is ever sent**.
6. `previewCorrection` (`e2e/gm-two-player-privacy.pack.spec.ts:789-799`) waits for that POST, and times out after the 10 s `actionTimeout`.

### Evidence

- **CI trace** (`art-39129982940/.../E2E-19-chromium-retry1/trace.zip`):
  - The `networked-gm-preview-btn` click completes ("click action done").
  - The page's only `/api/matches/` traffic is two `GET .../head -> 404` responses with `Content-Length: 19`. That is exactly `{"error":"no head"}`, not `{"error":"unknown match"}` (25 bytes).
  - There is no `rewind-preview` request anywhere in the trace. The E2E-25 trace shows the same two 404s.
- **Local reproduction on origin/main ebbea9a.** The machine was idle-gated before each run, with `--workers=1` and the dev server via `node server.js`, mirroring the ladder environment:
  - **Unarmed** `--grep @E2E-19`: `GET .../head 404`, then `TimeoutError: page.waitForResponse: Timeout 10000ms`. This is identical to CI (`repro-unarmed.out.log`).
  - **Armed** (`MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE=enabled`): E2E-19 **passed** (30.0 s), with `head 200` and `rewind-preview 200` (`repro-armed.out.log`). E2E-25 **passed** (7.9 s) (`repro-armed2.out.log`).
- This head includes B14-0A/0B, #2212 and #2253, so none of those broke the armed path.

### Fix proposal

Choose one. A guard inside the spec is **not** recommended: once U24b retires the arm, a `test.skip(!armed)` would skip these rows silently forever.

- **Preferred: arm exactly these rows in the nightly.** Workflow-only, in `.github/workflows/nightly-validation.yml`:
  1. The main "Run full Playwright e2e suite" step adds `--grep-invert "@E2E-19|@E2E-25"`.
  2. A new step runs the same standalone-server command and `run-playwright.mjs test --project=chromium --ignore-snapshots e2e/gm-two-player-privacy.pack.spec.ts --grep "@E2E-19|@E2E-25"`, with `MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE: 'enabled'` in its env.

  This reproduces the ladder's arm without arming the other ~900 specs. Arming the whole suite is unmeasured; the council notepad already flags that "all-plan" arming is unmeasured.
  - **Caveat, not measured:** I proved the arm with the dev server. The nightly uses the `.next/standalone` build. The arm is read at runtime: the key through a dynamic `process.env[...]` lookup, and `NEXT_PUBLIC_E2E_MODE` through webServer env and the build-time value `true`. It should work, but the first nightly run is the proof.

- **Alternative:** add a nightly step running the repository's ladder, `node scripts/qc/run-gm-two-player-campaign.mjs --group=privacy-pack`. This also re-runs E2E-20/21/22/26/27/28 armed. Then exclude the privacy pack file from the main step.
- **When U24b lands** (production combat-journal hard cutover; it retires the arm, `core.cjs` and the `playwright.config.ts` forwarding), the workflow split must be collapsed in the same PR. Otherwise the second step forwards a key that nothing reads. Record this as a U24b obligation.

### Ownership, parallel safety, size

- **L1-owned paths: no.** The change is `.github/workflows/nightly-validation.yml` only. No unit in `units.json` owns that file.
- **Related units:**
  - **U24b** (planned) owns `playwright.config.ts` and `scripts/qc/gm-two-player-campaign-core.cjs`, so the preferred fix deliberately avoids both.
  - **U2b** (blocked) owns these rows' history; draft PR #1886 is the parked U2b run.
  - **U25** (planned) owns `e2e` broadly.
- **Safe now in parallel with B14-0:** yes. B14-0 owns `src/lib/multiplayer/server` and `openspec/specs/fog-of-war/spec.md`, and none of that is touched. Do re-run the armed rows after B14-0 merges: B14-0 adds fog-on refusals on live and replay paths, and E2E-19/25 run fog-off.
- **Sensitivity:** route the workflow PR as **sensitive (privacy)**. It decides which privacy rows are proven, and under which fixture. Name U2b and U24b in the PR.
- **Size:** XS, about 10-15 workflow lines.

---

## 2. E2E-20/23/24 and E2E-21: class (b), test drift from U37 (#1975)

### Root cause (file:line)

- **The test's premise is stated in its own header.** `e2e/gm-two-player-privacy.pack.spec.ts:140-154` says the client "seeds every token at `{q: 0, r: 0}`". It therefore uses `GoProne` (`:1107-1120`), because "the sealed secret becomes the actor's TRUE hex - which the opponent's board genuinely does not hold."
- **The product changed that premise on purpose.** #1975 (072b320a7, roadmap **U37**, 2026-09-25) seeds every networked token at the engine's deploy hex on `GameCreated`:
  - `src/hooks/replay/useHexMapStateFromEvents.ts:193-205` (`applyGameCreatedEvent`)
  - `src/utils/gameplay/gameState/initialization.ts:35` (`deployPlacementsFor`)

  The PR body says this is computed from the **public** GameCreated payload: "nothing new is revealed". The owner ruled on it as a replay-class change.

- **So the assertion fails by construction.** `GoProne` declares `to === from`, and the opponent's board now shows that public deploy hex (`-2,5` for the host Atlas, `-2,-5` for the guest Marauder). The checks at `:406-409` and `:497-500` assert `not.toHaveAttribute('data-token-map-position', <sealed hex>)`, which can no longer pass.
- **No leak.** The wire clauses (a) and (b) of the same rows pass: the raw wire never carries the declaration id or the `"q":..,"r":..` needle, and delivery numbering stays gapless. The DOM shows only what the public payload already implies.

### Evidence

- CI shows the identical assertion and values on every valid run.
- The local armed run on ebbea9a fails the same way at `:406` and `:497`, so the arm is not a factor (`repro-armed2.out.log`).
- The PR #1975 body's "red, green" table pins exactly `{-2,-5}` South and `{-2,5}` for the unmoved units.
- No ladder privacy-pack run after 2026-09-25 is recorded in `evidence/`, so the break was not observed until the nightly ran it.

### Fix proposal (test-only)

Files: `e2e/gm-two-player-privacy.pack.spec.ts` only.

1. Add a sealed **`Move`** helper, for example `declareSealedMove(tap, unitId, to)`. It sends `{kind:'Move', unitId, to, facing, movementType:'walk'}`, the shape pinned at `src/types/multiplayer/__tests__/Protocol.test.ts:237-246`. Use it in E2E-20 (`:378`) and E2E-21 (`:470`, `:475`).
   - The reason given for avoiding `Move` (the client did not know where any unit stands) was removed by U37. The destination can now be read from the token's own `data-token-map-position`, so the sealed secret differs from the public position.
   - Keep `GoProne` for E2E-22/26/27, which use `declareSealedChoice` (`:523-631`) and pass today. This keeps the change to two rows.
2. **The deploy rows are off-grid on the fixture's radius-4 map** (`:1165`):
   - Host: `-2,5 -> -2,4` (on-grid, 1 hex) is valid.
   - Guest: no on-grid hex lies within 1 of `-2,-5`. Use `0,-4` (3 hexes; Marauder walk 4) or raise the fixture's Map radius to 6.
   - Measure which one the engine accepts. The row's own `wireSummary` already prints a typed `movement_invalid` refusal.
3. Rewrite the stale header paragraph at `:140-154`. Also fold in the stale ROLE HONESTY paragraph at `:117-126`: reviews b14-0a, b14-0b and p2cg1s note CF-S-5, already directed to P2CG1H.
4. The E2E-24 positive clause (`:437-441`, actor's board shows the sealed hex) still holds with `Move`. The actor's projection applies its own declaration.

### Ownership, parallel safety, size

- **L1-owned paths: no.** It is e2e only.
- **Unit ownership:**
  - The file sits under **U25** (planned, `e2e`) and **U2b** (blocked, `e2e`).
  - The successor note **CF-S-5** asks **P2CG1H** to edit this file's header "when H next edits the GM packs". P2CG1H is blocked, and its `ownershipPaths` do not list this file.
  - Route the change as a small standalone e2e unit, or fold it into U25. Coordinate with P2CG1H so CF-S-5 is not done twice.
- **Safe now in parallel with B14-0:** yes, at the file level. B14-0 may change tactical fog-on delivery, but these rows are fog-off. Re-run the full privacy pack once after B14-0 merges.
- **Sensitivity:** review as **sensitive (privacy)**. The change rewrites the evidence for a sealed-choice withholding letter. The reviewer should confirm the new secret is not derivable from any public payload.
- **Size:** S, about 30-50 test lines, with a live mutant per row. One mutant leaks the sealed Move to the opponent, for example by broadcasting the actor's frame. Both clauses must then fail.

---

## 3. E2E-08: class (c), flaky hash race against a live writer

### Root cause (file:line)

- `e2e/gm-two-player-authority.pack1.spec.ts:546-563` (`batches`) does three things in order: `evidence.fileHash()`, then a read-only SELECT, then `expect(evidence.fileHash()).toBe(hash)`.
- `fileHash` hashes the raw main database file (`e2e/fixtures/sqliteEvidenceReader.ts:126-127`). It is not a snapshot.
- `mekstation.db` is in WAL mode (`src/services/persistence/SQLiteService.ts:83`), and the server process is still writing. Right after the commit at `:169`, the fan-out, outbox, cursor and acknowledgment writes are in flight. Any WAL checkpoint into the main file between the two hashes changes the bytes.
- The reader cannot write. The connection is `readonly` and statements are allowlisted (`:80`, `:60`). So the assertion checks the server's quiescence, not the reader's honesty.
- **Failure site:** `committedBatch` `:541`, the direct call right after the poll that saw the batch at `:538-540`, which is the busiest moment. Values: `Expected 114375c1… Received 07dcf4f0…`.

### Why only the nightly

In the nightly, one `mekstation.db` accumulates the whole 922-test suite. In the ladder, each group runs with its own run id and a fresh small database. A large, busy database makes auto-checkpoints during the window more likely. This mechanism is inferred, not instrumented: I did not capture `-wal` sizes. The race itself is certain from the code shape and from the pass on retry.

### Fix proposal

1. In `e2e/gm-two-player-authority.pack1.spec.ts` `batches()`: drop the per-read byte-hash equality. Instead, assert the connection is read-only.
   - Add `isReadOnly(): boolean` (`db.readonly`) to `ISqliteEvidenceReader` in `e2e/fixtures/sqliteEvidenceReader.ts`.
   - Alternatively, keep `fileHash` and compare only at a quiesced point. Do **not** raise any timeout.
2. The same pattern appears in 12 other places (`gm-two-player-evidence.pack`, `fixture.smoke`, `membership.smoke`, `authority-order.pack` and `helpers/authorityRecoveryEvidence.ts`). They can race the same way in the nightly; fix them under the same rule as a follow-up.

### Ownership, parallel safety, size

- **L1-owned paths:** not an L1 product path. But `e2e/gm-two-player-authority.pack1.spec.ts` is in **P2CG1H**'s `ownershipPaths`. P2CG1H is blocked, and its plan edits this file to send application ACKs instead of the numeric `CampaignAck`.
- **Safe now in parallel with B14-0:** yes; there is no B14-0 overlap.
- **Recommended routing:** fold this into P2CG1H's edit of the same file, so the file does not change under its admission baseline. If the nightly baseline is needed sooner, make it a separate 3-5 line change with P2CG1H notified.
- **Sensitivity:** authority-class row. Route the change past the authority reviewer. It weakens nothing about the store's idempotency claim: the one-receipt and one-batch row checks at `:196-198` stay.
- **Size:** XS, about 5-10 lines (pack1 plus the reader interface).

---

## What a trustworthy baseline needs from this bucket

1. Arm E2E-19/25 in the nightly with the workflow split above. The local proof says they then pass.
2. Rewrite E2E-20/21's sealed choice as a `Move`. This is drift, not a leak, but it is a privacy-evidence edit and needs a sensitive review.
3. Retire the live-writer hash race in E2E-08. Track the 12 sibling call sites.
4. Note for the overall diagnosis: the 2026-10-17 06:01 and 07:19 nightlies (39008344531 `EVIDENCE_DB_MISSING`, 39013211365 `ECONNREFUSED ::1`) were infra problems, fixed by 31610a56d. They are not evidence about these rows.

## What I did not do

I did not change product code, workflows or specs. I did not run the standalone production build locally. I did not run E2E-20/21 at the parent of 072b320a7. The U37 attribution rests on the PR's own pinned values, the matching hexes and the spec's stated premise, not on a bisect run. I did not instrument the WAL for E2E-08.
