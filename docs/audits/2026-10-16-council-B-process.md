# Council B: delivery process audit - what to keep, what to cut, how to park

Owner question (verbatim): "what should be our current path to get to something that builds and then we can add onto in layers".

Lens: the way the work is being done, not the product. Council A (`E:/Projects/Personal/MekStation/docs/audits/2026-10-16-council-A-product-path.md`) already established that main builds, PR CI is green, REL-03 on ba8007f2 proved the single-player loop, and that neither the P3 receipt chain nor TS7 is a prerequisite for an owner-runnable artifact. This report does not repeat that; it measures what the last ~31 hours of process produced, what it cost, which rules actually bind, and how to park the two detours cheaply.

**Verdict in one paragraph.** Between #2136 and #2180 (31 h 06 m wall) the team merged 46 PRs. 30 of them (65%) are ledger ceremony (9 registration/split/correction, 13 closure, 8 one-field release); 15 carry code, and of those only 8 add behaviour, all of it dormant behind a port that `server.js` never installs. The ledger grew by 25,138 lines against 3,753 product lines (6.7:1). About 41% of the serial critical path (12.8 h) was spent on ledger PRs; the 13 unit implementation cycles averaged 81 min each, most of which is `test:stable` (~17 min, run locally and again in CI) plus a 30-60 min independent review. Review and admission-first did catch real things (2 code defects fixed pre-merge, 2 contract-level holes recorded, 1 production regression averted at plan level) but 16 of 23 review documents produced only documentary notes, and 4 of 5 admission stops were cap re-counts, not defects. Meanwhile the only red signal on main - the post-merge CAMP-01 workflow, failing on every one of the 38 pushes since the repair release ba8007f2 - was never triaged, the Lane B "OWNER-RULING" gate has been reduced to a comment posted by automation 3-14 seconds _after_ each merge, and GitHub itself enforces no required checks at all. The honest summary: the process is optimised for auditability of dormant code, not for getting a build into the owner's hands. The fix is not to abandon the ledger but to size proof to risk: a light lane for dormant/move/type/tooling and ledger-only work, the full lane only for the handful of units that change production behaviour.

## 0. Scope, sources, how I counted

Read-only, 2026-10-17 ~05:30-06:40 UTC (2026-10-16 23:30 - 2026-10-17 00:40 MDT). No build, Jest, Playwright, Git mutation, PR comment or publication. Another agent was running roadmap Jest suites; I ran only `git`, `gh`, `grep`-class reads and PowerShell arithmetic over `git diff --numstat`.

- Shared checkout `E:/Projects/Personal/MekStation` is at d6885860 (Oct 4) with 3 modified tracked files and 45 untracked paths. All tracked-file claims use `git show origin/main:<path>`; `origin/main` was fetched and is **08555b7a1b22f1bc10f9e6335c3ea7edd79c98da** (PR #2180, 2026-10-17T04:14:38Z). Tracked line numbers below refer to that commit.
- `STATUS` = `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md` (untracked, read lines 1-360). `PLAN` = `.../PLAN.md` in the same directory. `LEDGER` = `E:/Projects/Personal/MekStation/openspec/planning/2026-09-12-roadmap-completion/`. `GOAL` / `DELIVERY` = `LEDGER/GOAL.md` and `LEDGER/DELIVERY.md` on origin/main (the 18-line `.omo/ulw-execute/.../GOAL.md` is a different file and is not the one STATUS cites).
- PR kinds: classified by hand from `gh pr list --state merged` titles plus the per-merge `git diff --numstat <merge>^1 <merge>` file lists. Line categories: `product` = `src/**`, `server.js`, `desktop/src/**` excluding test patterns; `test` = `__tests__/`, `*.test.*`, `*.spec.*`, `e2e/`; `tooling` = package manifests, lockfiles, tsconfig, jest/next config, `scripts/**`, `.github/**`, `openspec/scripts/**`; `ledger` = `openspec/planning/**`, `openspec/changes/**`, `openspec/active-change-ledger.json`, `docs/**`. Lines = additions + deletions. Script: `%TEMP%\mek_prsum2.ps1` (not in repo).
- Time accounting uses GitHub `mergedAt` timestamps only. "Critical path" means the single product-writing lane PLAN:139 mandates, so serial gaps between consecutive merges are attributed to whatever PR closed the gap.
- Review classification: I read the verdict paragraph and the finding headings of each of the 23 `docs/audits/2026-10-16-*review*.md` files (untracked in the root checkout) and cross-checked against STATUS entries.
- Anything I could not verify is labelled **unverified**.

## 1. The numbers

### 1.1 PRs merged after the repair release, by kind (46 PRs, #2135-#2180)

| Kind                                                                   | Count | PRs                                                                           |
| ---------------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------- |
| Behaviour code, dormant receipt chain (P2CA/P2CD/P2CB/P2CE1-3/P2CF1-2) |     8 | #2135 #2139 #2143 #2147 #2150 #2155 #2159 #2162                               |
| Move-only refactor (P2CG1A1/A2)                                        |     2 | #2166 #2169                                                                   |
| Type-only (TS7S1A)                                                     |     1 | #2174                                                                         |
| Tooling/config (CI gate, tsconfig, tsx, @swc/jest)                     |     4 | #2153 #2176 #2178 #2180                                                       |
| Planning document (OpenSpec TS7 change)                                |     1 | #2154                                                                         |
| Registration / split / correction (ledger)                             |     9 | #2136 #2137 #2142 #2146 #2158 #2165 #2167 #2170 #2173                         |
| Closure (ledger receipts, main proof)                                  |    13 | #2138 #2140 #2144 #2148 #2151 #2156 #2160 #2163 #2168 #2171 #2175 #2177 #2179 |
| Release, one field `blocked -> planned`                                |     8 | #2141 #2145 #2149 #2152 #2157 #2161 #2164 #2172                               |

Ceremony share: 30/46 = **65%** (31/46 = 67% counting the plan document). Code-bearing: 15/46 = 33%; behaviour-bearing: 8/46 = 17%.

Council A's count of 46 merges after #2134 matches mine; its figure that the corrected P2CG1 chain is 14 units (A1..I4) is confirmed at STATUS:120 and in `LEDGER/units.json` (14 `P2CG1*` units; A1, A2 `main-verified`, 12 `blocked`).

### 1.2 Lines, and how many of them run in production

Totals across the 46 PRs (additions + deletions):

| Category                                          |      Lines |   Files |
| ------------------------------------------------- | ---------: | ------: |
| product (`src/**`)                                |      3,753 |      30 |
| test                                              |      5,429 |      23 |
| tooling (incl. 690 lockfile lines in #2178/#2180) |        947 |      13 |
| **ledger**                                        | **25,138** | **245** |
| of which `LEDGER/evidence/`                       |     19,708 |       - |
| of which `units.json`                             |      3,872 |       - |
| of which `roadmap.json`                           |        440 |       - |

Ledger : product = **6.7 : 1**. Ledger : (product + test + tooling) = 2.5 : 1. For the four TS7 units the ratio is extreme: #2176 changed 9 tsconfig lines (root 5, desktop 4) against 782 ledger lines; #2178's `LEDGER/evidence/ts7s2a-mainproof-20261016.json` alone is ~900 lines to attest a four-line `package.json` script swap.

Of the 3,753 product lines: 1,132 are the two move-only extractions (#2166, #2169), 45 are type-only (#2174), and ~2,576 are the receipt chain. **Lines that change production behaviour today, by my reading: roughly 30**, namely

- the P2CA migration registration (`src/services/persistence/SQLiteService.migrations.ts` +2, plus the 21-line `SQLiteService.publicAppliedViews.migration.ts`) which creates the `campaign_public_applied_view` table at startup - an active schema change for a table nothing in production writes (#2135);
- the one-line reconnect fix `hostFold.current = EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD;` in `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx` (#2162 diff) - the only live behaviour fix in the whole chain, and it rode in as a side effect of P2CF2;
- the widened wire schemas in `src/types/multiplayer/Protocol.ts` (#2139), which accept new message kinds no production sender emits.

Dormancy is verifiable, not asserted: `server.js:657-665` on origin/main passes `membership` and `forceClaims` but no `applicationReceipts`; `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:304` builds the application handling only when `membership && applicationReceipts`; `git grep applicationReceipts origin/main -- src server.js` excluding tests returns only that binder. `createDurableCampaignLaunchView` and `readStrictCampaignLaunchPrecedence` (`src/lib/multiplayer/server/campaignProgressionReaders.durable.ts:92,110`) have no non-test caller outside their own module. STATUS itself says "mounted-dormant" (STATUS:161) and "Receipt mode still off in production" (STATUS:171).

So the honest product delta of 31 hours and 46 PRs is: ~2,600 lines of correct-looking, well-tested, reviewed code that cannot be exercised by any user, plus one one-line fix, plus a desktop test runner swap and the removal of `ts-node`.

### 1.3 Where the 31 hours went

Window: #2136 merged 2026-10-15T21:08Z to #2180 merged 2026-10-17T04:14Z = **31 h 06 m**.

| Bucket                                                                      | Serial minutes | Share | How computed                                                                                                                             |
| --------------------------------------------------------------------------- | -------------: | ----: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 13 unit implementation cycles (release/split merge -> implementation merge) |          1,052 |   56% | P2CD 56, P2CB 73, P2CE1 86, P2CE2 65, P2CE3 130 (two review rounds), P2CF1 89, P2CF2 109, A1 77, A2 60, S1A 67, S1B 90, S2A 72, S2B 78   |
| 13 closure PRs (implementation merge -> closure merge)                      |            467 |   25% | 27, 24, 18, 45, 76, 30, 27, 30, 37, 43, 37, 35, 38                                                                                       |
| 5 serial registration/split PRs                                             |            256 |   14% | P2CB saga 26, P2CE split 56, P2CF split 43, P2CG1 split 72, TS7S1 split 59 (#2167, #2170, #2136, #2137 ran in parallel and are excluded) |
| 8 release PRs                                                               |             45 |    2% | 7, 6, 22, 1, 3, 2, 2, 2                                                                                                                  |
| slack                                                                       |            ~46 |    3% | remainder                                                                                                                                |

**Ledger ceremony on the critical path: 768 min = 12.8 h = 41%.** Average implementation cycle 81 min, and inside that cycle sit two `test:stable` runs (author local ~17 min, CI ~17 min: STATUS:43, STATUS:63) and a 30-60 min independent review, so actual coding time per slice is plausibly 15-30 min. The per-unit cadence of ~2.2 h (14 implementation PRs in 31 h) confirms STATUS:43's estimate.

**Proof cost is flat per unit, so small slices multiply it.** Counted product lines per unit versus the 500 cap (STATUS entries): P2CA 311, P2CD ~450, P2CB 470, P2CE1 103, P2CE2 416, P2CE3 239, P2CF1 194, P2CF2 453, A1 233, A2 379, **TS7S1A 45, TS7S1B 27, TS7S2A 33, TS7S2B 42**. The four TS7 units used 5-9% of their cap and each still paid the full admission/red/local/review/closure/mainproof ladder (~2 h each, STATUS:43).

The P2CE case is the clearest single waste: a complete, green, 717-line implementation of Task 12 existed at 01:51Z and was shelved because it exceeded 500 counted lines (STATUS:274). It was re-landed as three slices that finished at 10:22Z - **8.5 h** to deliver code that already worked, during which review round 1 of slice 3 found one real race (B1) that may or may not have been found in the monolith (unknowable).

### 1.4 Independent review: what it actually found

23 review documents dated 2026-10-16: 15 on implementation PRs, 7 on ledger/registration PRs, 1 design review (Task 14 sequencing). Verdicts: 20 APPROVE-WITH-NOTES, 2 REQUEST-CHANGES, 1 design confirmation.

Findings that changed code or plan (**7 of 23**):

| Review                                                | Finding                                                                                                                                                                       | Real?                                                                           | Outcome                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `2026-10-16-p2ce3-fable-review.md` (round 1)          | B1: `publish` clears `view.inFlight` before `view.latest` is set -> ACK of the just-written offer refused as unknown-receipt, durable row one cut behind; reproduced by probe | **Yes, code defect** (in dormant code)                                          | 2-line fix + regression test, round 2 approve (STATUS:220-226) |
| `2026-10-16-task11-p2cd-opus-review.md`               | F1/F2: drain after every receipt-mode dispatch                                                                                                                                | **Yes, code defect**                                                            | fixed pre-merge with new regression test (STATUS:319)          |
| `2026-10-16-p2cf1-fable-review.md`                    | M1: contract-level liveness hole - P2CE3 binder refuses ACK of previous offer once next offer exists; P2CF1 tears the view down on it                                         | **Yes, design defect**                                                          | not fixed; recorded as hard Task 14 precondition (STATUS:182)  |
| `2026-10-16-p2cf2-fable-review.md`                    | M2: host fold component-local, resets per binding while transport is reused                                                                                                   | Design cost                                                                     | carried to Task 14 (STATUS:166)                                |
| `2026-10-16-p2cg1-split-registration-fable-review.md` | two majors: I1 deletes transport numeric ACK but an out-of-scope suite asserts it; ungated mission create reachable after legacy deletion if port failed to install           | **Yes, plan defects** (one would have failed CI at I1, one is an authority gap) | correction PR #2167 added a leaf and unit I4 (STATUS:120,133)  |
| `2026-10-16-task14-sequencing-fable-review.md`        | confirmed implementer's claim that P2CG1 as registered would refuse every production co-op AdvanceDay                                                                         | **Yes**                                                                         | P2CG1 re-planned into the 13->14 chain (STATUS:144-146)        |
| `2026-10-16-p2ce3-fable-review-r2.md`                 | closes B1                                                                                                                                                                     | -                                                                               | approve                                                        |

Documentary-only (**16 of 23**): P2CB saga registration, P2CER registration, Task 57 r1 and r2, Task 9 packet r2, P2CE split, P2CF split, P2CB, P2CE1, P2CE2, P2CG1A1, P2CG1A2, TS7S1A, TS7S1B, TS7S2A, TS7S2B. Several of these are high-quality (the TS7S1B review found the real but harmless `resolve.modules` side effect; TS7S2B's mutation testing surfaced a pre-existing desktop test gap), but none required a change to the reviewed head.

So: 2 of 15 implementation reviews (13%) found a code defect; 2 more found contract-level problems; the reviews with the highest yield were the two **plan-level** reviews (P2CG1 split, Task 14 sequencing). Reviews of move-only, type-only and tooling PRs found nothing actionable in 6 of 6 cases - and those are exactly the PRs where the author's own byte-identical emit / AST move proof already made the review redundant.

### 1.5 Admission-first stops: 5 stops, 1 real save

| Stop                             | Trigger                                                                                          | Outcome                                                                        | Real defect averted?                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| P2CB round 1 (STATUS:297)        | saga owner + test leaves outside grant                                                           | registration PR #2142 (136 ledger lines)                                       | No - ownership re-count                                                |
| P2CE / Task 12 (STATUS:274)      | 717 counted lines vs 500                                                                         | split PR #2146 (517 lines), 3 slices                                           | No - cap re-count                                                      |
| P2CF / Task 13 (STATUS:204)      | 7 leaves outside registration, 15-17 files                                                       | split PR #2158 (665 lines), 2 slices                                           | No - ownership re-count                                                |
| **P2CG1 / Task 14 (STATUS:150)** | registered contract would delete legacy ACK credit before activation -> production co-op refuses | design review + split #2165 (2,196 lines) + correction #2167 (370) -> 14 units | **Yes** - a plan defect that would have become a production regression |
| TS7S1 (STATUS:75)                | 16 files vs 15 (`design.md` undercounted hidden errors)                                          | split PR #2173 (792 lines)                                                     | No - cap re-count                                                      |

Cost of the five stops: 6 ledger PRs, 4,676 ledger lines, 4.3 h of serial critical path (section 1.3), plus the P2CE re-implementation. STATUS:77 celebrates "admission-first keeps catching under-counted registrations before any code lands"; the data says it mostly catches that the registrations were written without measuring, which is a registration-quality problem the stops then pay for a second time.

### 1.6 What the process did _not_ catch while being thorough

1. **CAMP-01 Live Adversarial Evidence has failed on every push to main since the repair release.** `gh run list --workflow 'CAMP-01 Live Adversarial Evidence'`: 38 consecutive `failure` conclusions from ba8007f2 (2026-10-15T11:53Z, #2134 itself) through 08555b7a; last success 07990c0a on 2026-10-09. The Windows leg reports `skippedUnexpectedly: 1, unexpectedSkips: ["proof6a2-envelope-anchor-production"]` (run 39001828361, job 117306195514) and the `Live Tier Signal` job exits 1 with `Windows degraded`. The probe is gated on `verified-git-windows` (`scripts/qc/run-camp01-live-adversarial.mjs:216`) and returns `skipped-with-reason`/`VERIFIED_GIT_UNAVAILABLE` when the resolver rejects the runner's git (`:91-108`); the script did not change between the last success and the first failure, so the probable cause is Windows runner image drift, **unverified**. Either way it is the only red indicator on main and nobody in 46 PRs triaged it; STATUS mentions CAMP-01 once (STATUS:383) in an unrelated context. Council A noticed it; this report adds that it is a 38-run streak that began with the release itself.
2. **Lane B has become a post-merge stamp emitted by automation.** DELIVERY.md:14 requires the owner to post `OWNER-RULING <head>` out of band and DELIVERY.md:16 requires waiting for it before merge; GOAL.md:85 lists "the agent never writes the OWNER-RULING comment" under Forbidden moves. In practice (sampled via `gh api .../issues/N/comments`): #2143 ruling at +14 s after merge, #2155 +3 s, #2169 +5 s, #2180 +3 s, all by the owner's login, all with zero GitHub reviews on the PR. STATUS:286 and :303 record this as "owner-authorized". #2180 is review class `routine`, so a ruling was not even required. The receipts then record these as Lane B rulings. A gate that fires three seconds after the thing it gates is documentation, not a gate; it should either be made real for the few units that need it (activation, legacy deletion) or dropped from everything else.
3. **GitHub enforces almost nothing.** `gh api repos/.../branches/main/protection`: `required_approving_review_count: 0`, no required status check contexts, `enforce_admins: false`; the `main` ruleset is `enforcement: disabled`. "31/31 green before merge", the validator, caps, head-SHA guards: every one of them is agent discipline. The owner has already used that freedom twice (STATUS:116 skip `test:stable` on closures; STATUS:238 admin-merge docs PRs without CI). This is not a criticism - it is the lever the owner holds.
4. **The ledger validator never runs in CI.** `grep validate-roadmap .github/workflows/pr-checks.yml` finds nothing; the only Jest test touching `units.json` (`scripts/__tests__/roadmap-codex-identity-capture.test.ts:408`) writes a fixture ledger, not the live one. `--next` on main currently prints `U24b` (the P4 journal-authority hard cutover; `LEDGER/units.json` U24b, node R4.S7) because `validate-roadmap.mjs:759-779` picks the first `planned` unit whose node deps are terminal and whose paths are not reserved by an in-flight unit; it knows nothing about phases, the one-lane rule, or the TS7-before-P2CG1B stop (`units.json` `ts7TrackRegistration20261016.schedulingRule`: "No machine-readable edge joins the track and P2CG1B").
5. **Four plan-shaping reviews exist only as untracked files in one dirty working tree.** `git ls-tree origin/main docs/audits/ | grep 2026-10` is empty. Product-unit review bodies are archived as `LEDGER/evidence/*-source-*-review-*.txt`, but the Task 14 sequencing review (sha 7326...0cc, matches the untracked file), the P2CG1 split review (REQUEST-CHANGES), the P2CE and P2CF split reviews, the P2CER and Task 57 reviews have no tracked body - the ledger cites their hashes (`git grep task14-sequencing origin/main -- LEDGER` = 2 hits, 0 archived bodies). One `git clean` in the root checkout erases the reasoning behind the 14-unit chain.
6. **The 14-minute `roadmap-loop-closure-proof` suite tests the ledger tooling, not the ledger.** `scripts/__tests__/roadmap-loop-closure-proof.test.ts` (2,381 lines) spawns the closure scripts against temp git fixtures. It is already in the CI unit shards (`jest.config.js:71` roots include `scripts`; `pr-checks.yml:189`). Running it locally on every closure (STATUS:109,116) buys regression coverage for `scripts/qc/roadmap-*.mjs` that CI already provides, unless those scripts changed - which the TS7 track will do once in S4B. STATUS:111 already suspects this.
7. **TS7S2B's source is on main while its ledger says `implementing`.** `units.json` TS7S2B `state: "implementing"` reserves `desktop/package.json`, `desktop/package-lock.json`, `desktop/jest.config.js`, `.storybook/main.ts`, `openspec/changes/migrate-to-typescript-7/tasks.md` (validator `IN_FLIGHT_STATES`, `validate-roadmap.mjs:61,760`). Validator-green, factually stale, and no closure PR was open at assessment time (`gh pr list --state open`: only #2113 and #1886, both unrelated drafts).

## 2. Keep, cut, and who may cut

### 2.1 What is genuinely buying risk reduction

- **Independent review of behaviour-changing code** found 2 real defects in 8 behaviour PRs and 2 contract-level holes. Keep it for anything that changes what a running server or browser does.
- **Design/plan review before a large chain is registered** had the best yield of anything in the sample (Task 14 sequencing, P2CG1 split: 3 real findings for 2 reviews). Keep it, and do it _before_ registering 14 units next time, not after.
- **Byte-identical emit / AST move proofs** (TS7S1A whole-project emit 983/983 identical, A1/A2 AST move-proof with injected mutations, S1B desktop emit 84/84 files) are cheap, mechanical, and conclusive. They are what makes the _review_ of those PRs redundant, not the other way round.
- **Red-first tests and mutation probes** on the receipt chain (RED 15-34 failing before, mutation 14/14-43/45 killed) are the reason the dormant code is probably correct. Keep for behaviour units.
- **The validator's structural checks** (receipt ladder, head equality, ancestry, cap counting - `validate-roadmap.mjs:31-62, 706-730`) are seconds to run and make the ledger self-consistent. Keep running it; stop pretending CI does.
- **Admission-time measurement** is valuable as a _measurement_; its value is destroyed when every overflow forces a 1-2 h registration PR plus a post-merge review of that PR.

### 2.2 What is overhead that buys no risk reduction right now

- Separate one-field release PRs (8 PRs; owner already folded them into closures at STATUS:116 - finish the job).
- Separate closure PRs for ledger-only state flips, each running a 14-min tooling self-test and producing ~800 lines of receipts, for units whose source is already on main under CI.
- Independent review of move-only, type-only, config and lockfile PRs where a mechanical equality proof exists (6/6 found nothing actionable).
- Post-merge OWNER-RULING comments on routine-class units (#2180) or on any unit where the owner did not in fact rule.
- Review of registration PRs whose only content is leaf lists and estimates (5 of 7 found nothing requiring change; the two that did were the design-level ones).
- Cap-driven splitting of code that already exists and is green (P2CE). The rule exists to bound review effort; when the review is of dormant code that cannot run, the bound protects nothing.
- Two full `test:stable` runs per unit (author local + CI). GOAL.md:94 already says product PRs "wait for the full required check set"; the local run is belt-and-braces against a CI that nothing on GitHub requires.

### 2.3 Which rules bind, and who can change them

| Rule                                                      | Where it is written                                                                                | Enforced by                               | Owner can waive?                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| 15 files / 500 counted product lines per unit             | GOAL.md:93; DELIVERY.md:11; `validate-roadmap.mjs:531-534` (schema) and `:706-730` (`--git` count) | validator, run locally by agents only     | **Yes** - via `capException.countedLines` per unit (GOAL.md:93), or by not running `--git` |
| Seven-stage receipt ladder; states and required receipts  | GOAL.md:20-30; `validate-roadmap.mjs:31-45`                                                        | validator (local)                         | Yes for which stages are _heavy_; the ladder itself is structural and cheap - keep         |
| `--next` picks the unit; one in-flight unit per path      | GOAL.md:10-16; `validate-roadmap.mjs:758-779`                                                      | validator (local)                         | Yes; the parent already overrides it (it prints U24b and nobody works U24b)                |
| One product-writing lane; serialize heavy runs            | PLAN:139; GOAL.md:96                                                                               | parent agent                              | Yes (hardware-bound, but the owner sets the rule)                                          |
| Lane A independent review on every PR; reviewer != author | DELIVERY.md:14; GOAL.md:27,40-46                                                                   | parent agent                              | Yes - it is a convention; not a GitHub required review                                     |
| Lane B OWNER-RULING before merge for sensitive classes    | DELIVERY.md:14,16; GOAL.md:27,85                                                                   | nobody (posted post-merge by automation)  | Yes - and it is already de facto waived; make that honest                                  |
| Docs-class PRs may be combined and admin-merged           | GOAL.md:94                                                                                         | -                                         | Already permitted; under-used (21 ledger-only PRs could have been ~8)                      |
| Product PRs wait for full CI                              | GOAL.md:94; DELIVERY.md:16                                                                         | parent agent (GitHub requires 0 contexts) | Yes, but do not: CI is the only machine proof the build works                              |
| No `--no-verify`, no force-push, no AI attribution        | GOAL.md:91-92; `.husky/pre-commit`; branch protection `allow_force_pushes: false`                  | pre-commit hook; GitHub (force-push only) | Force-push block is machine; the rest is convention                                        |
| Tick a `tasks.md` row only with a main-side tick receipt  | GOAL.md:30,87                                                                                      | validator (local)                         | Yes; keep - it is cheap and prevents fake completion                                       |
| TS7 track before P2CG1B                                   | `units.json` `ts7TrackRegistration20261016.schedulingRule`                                         | parent agent ("No machine-readable edge") | **Yes, by a one-line STATUS/registration note**                                            |
| Pause after P3                                            | STATUS:1-3 (owner chat)                                                                            | parent agent                              | Yes - owner instruction, owner can redirect (STATUS:3 last sentence)                       |

**Machine-enforced on GitHub today: force-push block and conversation resolution. Nothing else.** Every other rule is enforced by the agents reading these files, which means every other rule is the owner's to resize by editing these files or saying so in STATUS.

### 2.4 Proposed "build-first" lane with proportionate proof

Three classes, decided at admission by the author and recorded in one line of the unit's admission receipt (`proofClass: light | full | ledger`). The classification itself is reviewable; the proof is sized to it.

**(a) Light lane - dormant, type-only, move-only, tooling/config units.** Criteria: no production call path changes (dormant behind an uninstalled port, or emit/AST-identical, or config only). Proof: author's mechanical equivalence proof (byte-identical emit, AST move-proof with injected mutations, before/after command output hash, test-count equality) recorded in the PR body; CI green on the exact head (the 31 checks already run); validator pass. **No** independent model review, **no** local `test:stable` (CI runs it), **no** OWNER-RULING, **no** separate closure PR: the closure receipts (review = "mechanical proof, see PR body", merge, mainProof = the CI run id and `--next` output) land in the _next_ PR that touches the ledger, or in a weekly combined ledger PR under GOAL.md:94. Expected cycle: ~45 min instead of ~2.2 h. Applies to: all remaining TS7 units if resumed, P2CG1B-G2 as long as nothing installs the port, any further move/type work.

**(b) Full lane - behaviour-changing production units.** Criteria: changes a code path a user or socket can reach on main after merge (P2CG1H activation, I1-I4 legacy deletion, U24b-style cutovers, any UI fix in the single-player loop). Proof: red-first test, local focused suites, CI green, **independent review by a different model**, and - where the class is authority/migration - a **real** owner ruling obtained _before_ merge (a chat "yes" transcribed with its timestamp is honest; a comment posted 3 s after merge is not). Closure PR may stay separate but drops the 14-min tooling self-test unless `scripts/qc/roadmap-*.mjs` changed. Add one thing the current lane lacks: a **main-side runtime smoke** (start the built server, hit the changed route) rather than only Jest, because the current post-merge "main proof" for behaviour units is Jest-only (verified for TS7S2A's receipt and the P2C\* receipts I sampled; **unverified** for every unit).

**(c) Ledger-only PRs.** Combine release + closure + registration corrections into one PR per unit _or_ per day, admin-merged per GOAL.md:94 and STATUS:238, proof = `validate-roadmap.mjs` (no args and `--next`) plus `validate-roadmap.test.mjs` (86 tests, seconds). No model review unless the PR registers a _new_ multi-unit chain (then a design review of the chain, once, before registration). Archive any review body the ledger hashes into `LEDGER/evidence/` in the same PR so no hash points at an untracked file.

What this does to the numbers: for the 46-PR sample, lane (a) would have covered 7 of 15 code PRs (the 4 TS7, 2 move-only, 1 type-only), lane (c) would have collapsed 30 ledger PRs into roughly 10-14, and the 12.8 h of ledger critical path would have been ~3-4 h. The 8 behaviour PRs keep their full proof.

## 3. The two detours

### 3.1 The P2CG1 chain (14 units; A1, A2 done; B..I4 remain)

**On the critical path to "something that builds and can be layered on"?** No. Main builds now (Council A). The chain's purpose is to activate receipt-gated co-op readiness (H) and then delete the legacy numeric ACK credit (I1-I4). Until H, every unit is dormant; after H, the behaviour it changes is shared-campaign readiness, which is Council A's Layer 3, not the first artifact or Layer 1/2. STATUS:102 already records that the chain's own author considers A2 "the end of the move-only extraction, before behavior work starts" - a natural resting point.

**Cheapest safe park.** Nothing in the ledger needs to change for the validator: all 12 remaining units are already `blocked` (`units.json`), `R2.authority-live` is `main-verified`, and `--next` prints U24b regardless. The chain is parked by _not releasing P2CG1B_. To keep the ledger honest rather than merely green:

1. One STATUS entry at the top: "P2CG1 chain parked at A2 main-verified by owner decision <date>; B..I4 remain blocked; resume predicate = owner starts Layer 3." (STATUS is untracked; this costs nothing.)
2. Optionally, in the next ledger-only PR, set `blockedReason` on P2CG1B (currently `null`) to that sentence. The validator does not read `blockedReason` (**verified**: no reference in `validate-roadmap.mjs`), so this is free and informative.
3. Do **not** move units to `owner-gated` or write a decision packet: GOAL.md:68 reserves packets for questions the owner must answer, and "when do we want Layer 3" is sequencing, not a contract question. Packets also change the `NONE-ADMISSIBLE` counts the validator prints.

**Must anything be finished first?** No. Main is consistent: the extracted `campaignApplicationConnection.ts` is live code with identical behaviour (AST proof), the dormant chain is inert without the port, and the one live fix (hostFold reset) is covered by the P2CF2 suites. The carry-forward obligations (M1 liveness hole, M2 rebind cost, C2 same-connection seat read, Task 14 preconditions) are all recorded in STATUS and `units.json` successor notes; they bite only when H is admitted. There is a small hygiene option - removing the unused `campaign_public_applied_view` migration - but it is a product change needing its own unit and buys nothing; leave it.

**Risk of parking:** the 12 blocked units were registered against today's file shapes (STATUS:121 "I4 admission must re-measure if B/C reshape those types"); after weeks of unrelated change several leaf lists will be stale and the chain will need re-admission anyway. That is an argument _for_ parking now rather than registering more detail.

### 3.2 The TS7 track (S1A, S1B, S2A, S2B merged; S3, S4A, S4B, S5A remain before the chosen stop)

**On the critical path?** No, and STATUS:104 says so in the plan's own words: "the track helps hooks/CI latency but does not change unit throughput much." Its measured payoff is a root type check going from ~34 s to ~4 s. It was inserted (STATUS:99-105) because the owner asked for a stopping point to add CI optimisation and the TS7 plan to the roadmap; it then consumed 8 h (20:18Z -> 04:14Z) and 11 PRs for 4 units that changed 45 source lines, 9 tsconfig lines, two `package.json` script/dependency edits and one Jest transform.

**Is the current half-migrated state a stable resting state?** Yes, by design. `openspec/changes/migrate-to-typescript-7/tasks.md` section 1 is titled "Code and config prep that is valid on 5.8" and section 2 "Remove replaceable compiler-API consumers"; both are complete (1.1-1.5, 2.1-2.4 ticked; 2.5 is owner-held). Root `package.json:322` and `desktop/package.json:70` both still pin `typescript ^5.8.3`; `typecheck` is still plain `tsc --noEmit --skipLibCheck` (`package.json:26`); desktop Jest runs on `@swc/jest` with its own `tsc -p tsconfig.test.json --noEmit` type gate (`desktop/package.json:46`); `ts-node` is gone and the terminology scripts run under `tsx` (#2178). No TS6/TS7 alias is installed anywhere, so nothing is "half" installed - the repo is simply a TS 5.8.3 repo whose source happens to also compile clean under TS 7.0.2 (STATUS:63). The only residuals: `openspec/active-change-ledger.json` lists the change as active (correct - it is paused, not done); `openspec/scripts/README.md` still says `npx ts-node` (STATUS:30; cosmetic, belongs to S5A); the TS7S2B review's M3 note that `@swc/core ^1.15.30` resolves to 1.16.18 on a fresh install (STATUS:13; carried to S3; **unverified** impact, CI installs from the lockfile).

**Cheapest safe park.**

1. Finish the TS7S2B _ledger_ closure - it is the one dishonest state on main (section 1.6 item 7). Ledger-only PR: `review`/`merge`/`mainProof` receipts, `state: main-verified`, **do not release TS7S3** (leave `blocked`). Proof per lane (c): validator + `validate-roadmap.test.mjs`; cite CI run 38999634888 (31/31 on head dd9a54db) as the main proof instead of a fresh 14-min `roadmap-loop-closure-proof`. If the closure agent STATUS:14 mentions is already running, let it finish but tell it not to flip S3.
2. Add to `units.json` `ts7TrackRegistration20261016` (in that same PR) an `amended20261017Park` note: "Track parked after TS7S2B main-verified by owner decision; stopping condition for P2CG1B waived; S3/S4A/S4B/S5A/S2OD/S5B/S5C remain blocked until resumed." The validator does not read this object (**verified**: `ts7TrackRegistration20261016` appears nowhere in `validate-roadmap.mjs`), so it is free; it makes the waiver the schedulingRule itself asks for ("or an explicit parent waiver is recorded") exist somewhere tracked.
3. Mirror the same sentence at the top of STATUS and in `tasks.md` section 3 header as a one-line note ("Paused 2026-10-17 at the end of section 2; resume with 3.1").

**Must anything be finished first?** No. Nothing in sections 1-2 depends on sections 3-5 landing. The only thing I would _not_ leave as-is is the ledger state of S2B.

**If the owner later resumes:** S3 (bump both `typescript` to ^6.0.3) and S4A/S4B (alias TS6 + TS7 entry points, repoint every gate and pin) are exactly the kind of tooling units lane (a) was designed for - each has a mechanical proof (0 errors, byte-identical emit, pinned command strings). Resumed under lane (a) they are ~45 min each, not ~2 h.

## 4. Process for the next two weeks

Numbered; step 1 is the action for right now. Steps assume the owner adopts the three-lane rule in section 2.4; if not, steps 1, 2, 3 and 9 still stand on their own.

1. **Now: declare the park.** Owner writes (chat is enough; parent transcribes to STATUS top): "P2CG1 chain parked at A2; TS7 track parked at S2B; TS7-before-P2CG1B stopping condition waived; no new roadmap unit is released until the owner artifact (Council A steps 1-4) is in hand." This costs zero PRs and stops the next ~2 h cycle from starting.
2. **Today: close TS7S2B's ledger without releasing S3** (section 3.2 steps 1-2) as one ledger-only PR that also archives the four untracked review bodies the ledger hashes (`task14-sequencing`, `p2cg1-split-registration`, `p2ce-split`, `p2cf-split`) into `LEDGER/evidence/`. Proof: validator + its 86 tests + CI. Admin-merge per GOAL.md:94.
3. **Today: triage CAMP-01.** One agent, read-only first: pull the Windows artifact `camp01-live-adversarial-Windows` from run 39001828361, read the `proof6a2` skip reason, compare `git --version` on the runner between 07990c0a's run and ba8007f2's. If it is runner drift, either pin the runner/git or make the aggregator treat a `skipped-with-reason` capability loss as `warning` not `failure` - a tooling PR under lane (a). If it is a product regression, it jumps to the top of the list. Either way main's post-merge dashboard must be green before the owner artifact is cut from it.
4. **Days 1-2: cut the owner artifact** exactly as Council A specifies (pinned 08555b7a or newer after step 3, isolated worktree, `npm ci`, ordinary `npm run build`, extracted-archive acceptance, hash and run sheet). This is not a roadmap unit; it is a release task. Record it as a STATUS entry and a `docs/audits/<date>-owner-preview-<sha>.md` with the hash, not as units.json receipts.
5. **Days 2-5: Layer 1 as repair-by-exception.** Run the owner acceptance on the extracted artifact; every failure becomes a lane (b) unit _registered at the moment it is found_ (one PR per defect, red-first, CI, independent review; owner ruling only if it touches authority/migration). Do not pre-register a matrix of units. Target: a bounded list of real defects, not a chain.
6. **Rewrite the lane rules in the files agents actually read** (GOAL.md "Standing constraints" and DELIVERY.md steps 5 and 10) in one docs PR: add the `proofClass` field and the three lanes of section 2.4; state that Lane B is required only for `full` lane units with authority/migration class and must precede the merge; state that ledger-only closure proof is validator + its tests + CI run id; state that closure receipts for `light` units may land in the next ledger PR. Without this, the next agent team re-reads the old text and reinstates the ceremony.
7. **Make the two cheap machine checks real.** (i) Add `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` (no args) to a `ledger` job in `pr-checks.yml` gated on `openspec/planning/**` changes - seconds, and it turns the validator from convention into a check. (ii) Turn on required status checks for `main` in branch protection for at least `Type Check`, `Lint`, the six unit shards and the Next build; leave `enforce_admins` off so the owner retains admin-merge for docs. This replaces "31/31 green by agent promise" with "cannot merge red" for product PRs.
8. **Days 5-10: Layer 2 (same-instance skirmish) only if the owner wants it before Layer 3**, under lane (b), one unit per observed gap, no chain registered in advance. If the owner instead wants shared campaign missions, un-park P2CG1B..H under lane (a) for B-G2 and lane (b) for H and I1-I4, and _then_ re-measure the leaf lists (STATUS:121).
9. **Weekly, not per unit: one combined ledger PR** (GOAL.md:94) that records all `light` closures, state flips and successor releases of the week, validated by the validator, admin-merged. Per-unit closure PRs remain only for `full` lane units.
10. **Day 10-14: look at the numbers again** the same way this report did (`git diff --numstat` by category, `mergedAt` gaps, review yield). The target is not a ratio but a direction: ledger lines per product line should fall below ~2:1 and ceremony share of critical path below ~15%; if review yield on `light` lane PRs is zero again, keep them light; if a `light` PR ever broke main, promote that class to `full`.

### Risks of this recommendation

- **Lane (a) misclassification.** An author calls a unit "dormant" when it is not (P2CF2's hostFold reset shipped a live behaviour change inside a "mounted-dormant" unit). Mitigation: the classification is one line in the admission receipt and is itself the thing a reviewer checks for lane (a) PRs (5 min: "does any production call path reach this?"), rather than reviewing the whole diff.
- **Dropping the local `test:stable`** moves failure discovery from the author's machine to CI, adding one CI round-trip (~17 min) on the occasions it fails. Over the 46 PRs, CI failed on product PRs twice, both flakes (STATUS:221, :343), so the expected cost is low; the owner can keep the local run for `full` lane.
- **Making CI required on GitHub** will block the admin-merge habit for _product_ PRs the moment a flaky e2e job is red. That is the point, but it means the two known flakes (ThreeContextPrivacyEvidence bare-substring match, STATUS:216,221; seam-fresh-construction same-seed divergence, STATUS:336,343) need their own small fixes early in the two weeks or they will cost the team time.
- **Parking P2CG1 and TS7 accrues re-admission debt.** Leaf lists and estimates in `units.json` will go stale; when resumed, each unit needs a fresh census (STATUS:69 already requires this for S3/S4B). This is cheaper than finishing them now only if the owner actually wants the artifact and Layer 1 first - which is the question asked.
- **Honesty about Lane B.** Writing down that the owner's rulings have been automated post-merge stamps will feel like a step backwards in rigour. It is the opposite: the current receipts claim an owner gate that did not gate. For the handful of activation/deletion units in Layer 3 the ruling has to be real or it should not be recorded.
- **This report's own limits.** Line categorisation is regex-based and mine; "critical path" attribution assumes strict seriality (the lane was in practice mostly serial, but #2167/#2170/#2136/#2137 overlapped); review "yield" is judged from verdict text, not by re-reproducing each probe; the CAMP-01 root cause is a hypothesis; I did not open the `.omo/ulw-execute` evidence trees beyond paths STATUS names. Timestamps are GitHub `mergedAt`, not agent start times, so the implementation cycles include queue time.

## Appendix: per-PR classification (lines = additions + deletions)

| PR   | Kind                           | product |  test | tooling | ledger |
| ---- | ------------------------------ | ------: | ----: | ------: | -----: |
| 2135 | behaviour (P2CA)               |     268 |   373 |       0 |    459 |
| 2136 | registration (Task 57)         |       0 |     0 |       0 |    419 |
| 2137 | registration (P2CER)           |       0 |     0 |       0 |    141 |
| 2138 | closure                        |       0 |     0 |       0 |    764 |
| 2139 | behaviour (P2CD)               |     394 |   701 |       0 |      0 |
| 2140 | closure                        |       0 |     0 |       0 |    797 |
| 2141 | release                        |       0 |     0 |       0 |      2 |
| 2142 | registration (P2CB saga)       |       0 |     0 |       0 |    136 |
| 2143 | behaviour (P2CB)               |     491 |   859 |       0 |    180 |
| 2144 | closure                        |       0 |     0 |       0 |    631 |
| 2145 | release                        |       0 |     0 |       0 |      2 |
| 2146 | split (P2CE)                   |       0 |     0 |       0 |    517 |
| 2147 | behaviour (P2CE1)              |     116 |   229 |       0 |    165 |
| 2148 | closure                        |       0 |     0 |       0 |    631 |
| 2149 | release                        |       0 |     0 |       0 |      2 |
| 2150 | behaviour (P2CE2)              |     406 |   492 |       0 |    174 |
| 2151 | closure                        |       0 |     0 |       0 |    773 |
| 2152 | release                        |       0 |     0 |       0 |      2 |
| 2153 | tooling (CI gate)              |       0 |     0 |     189 |      0 |
| 2154 | plan doc (TS7)                 |       0 |     0 |       0 |    474 |
| 2155 | behaviour (P2CE3)              |     233 |   676 |       0 |    191 |
| 2156 | closure                        |       0 |     0 |       0 |  1,228 |
| 2157 | release                        |       0 |     0 |       0 |      2 |
| 2158 | split (P2CF)                   |       0 |     0 |       0 |    665 |
| 2159 | behaviour (P2CF1)              |     196 |   506 |       0 |    205 |
| 2160 | closure                        |       0 |     0 |       0 |    931 |
| 2161 | release                        |       0 |     0 |       0 |      2 |
| 2162 | behaviour (P2CF2)              |     472 | 1,578 |       0 |    220 |
| 2163 | closure                        |       0 |     0 |       0 |  1,009 |
| 2164 | release                        |       0 |     0 |       0 |      2 |
| 2165 | split (P2CG1, 13 units)        |       0 |     0 |       0 |  2,196 |
| 2166 | move-only (A1)                 |     398 |     0 |       0 |    222 |
| 2167 | correction (P2CG1 -> 14 units) |       0 |     0 |       0 |    370 |
| 2168 | closure + release              |       0 |     0 |       0 |    796 |
| 2169 | move-only (A2)                 |     734 |     0 |       0 |    233 |
| 2170 | registration (TS7 track)       |       0 |     0 |       0 |  2,111 |
| 2171 | closure                        |       0 |     0 |       0 |    907 |
| 2172 | release                        |       0 |     0 |       0 |      2 |
| 2173 | split (TS7S1)                  |       0 |     0 |       0 |    792 |
| 2174 | type-only (TS7S1A)             |      45 |    15 |       0 |    656 |
| 2175 | closure + release              |       0 |     0 |       0 |    855 |
| 2176 | tooling (TS7S1B tsconfig)      |       0 |     0 |       9 |    782 |
| 2177 | closure + release              |       0 |     0 |       0 |    845 |
| 2178 | tooling (TS7S2A tsx)           |       0 |     0 |     194 |  1,562 |
| 2179 | closure + release              |       0 |     0 |       0 |    896 |
| 2180 | tooling (TS7S2B swc)           |       0 |     0 |     555 |  1,189 |

(#2153's 6 `next.config.ts` lines are folded into tooling and #2176's 4 `openspec/active-change-ledger.json` lines into ledger; the section 1.2 totals used the same rule.)
