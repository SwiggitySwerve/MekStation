# Lane A review: U1c
reviewedHead: 00fdeab76dbdb76cf9877c2a6a7313ca09942fac
baseline: 7489e311fc0e2a2846c342786b21ad1ea09d29bb
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Scope

Range reviewed: `7489e311f..00fdeab76` (one commit, `00fdeab76`). Files touched (from `git diff --numstat`):

```
445  0  e2e/gm-two-player-lifecycle.pack.spec.ts
  1  0  openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
550  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u1c-admission-20260916.json
265  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u1c-local-20260916.json
 70  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u1c-red-20260916.json
157  2  openspec/planning/2026-09-12-roadmap-completion/units.json
 25  1  scripts/__tests__/gm-two-player-campaign-qc.test.ts
  7  1  scripts/qc/gm-two-player-campaign-core.cjs
```

Contract read on the head: `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md`, `GOAL.md`, `units.json` U1c entry (state `local-verified`, baseline `7489e311f...`, `stageReceipts.review/merge/mainProof/tick` all `null`), and the E2E-75 PROGRESS note appended to `tasks.md` line 589. E2E-75's letter is `specs/e2e-testing/spec.md:317-319`: "WHEN the harness drives pending, sealed, finalized, syncing, reconnecting, behind, rebuilding, rewound, and blocked states THEN each SHALL have a stable locator, persistent text, non-color-only semantics, correct command gating, and an assistive-technology announcement."

## A. Per-posture assertion strength

`e2e/gm-two-player-lifecycle.pack.spec.ts:258-297` (`capturePosture`) runs, for each of the five driven postures (`live` control, `sealed`, `finalized`, `syncing`, `behind`, driven in sequence at lines 154-181):

1. **data-state** — `expect.poll(() => postureState(page)).toBe(state)` (line 269-271) against the real `data-state` attribute (`data-testid="tactical-lifecycle-state"`), read via `TacticalLifecycleStateBanner.tsx:31-32`. Not a tautology: the poll can time out and fail, and did during red (see R2 below).
2. **Accessible announcement** — `toHaveRole('status')`, `aria-live="polite"`, `aria-atomic="true"` (lines 278-280) against the real DOM attributes emitted by `TacticalLifecycleStateBanner.tsx:34-39`, plus `banner.ariaSnapshot()` asserted to `toContain(text)` (line 294-295). This is a value the product **does** render to players: the live region's `role/aria-live/aria-atomic` triad is exactly what makes screen readers announce the content, and `ariaSnapshot()` reflects the accessibility tree AT consumes — not an internal/unrendered field.
3. **Pairwise-distinct messages** — two independent checks: a running per-text-to-state map (`seenText`, line 282-283) that fails the moment two different states share one sentence, and a final `expect(new Set(drivenText).size).toBe(drivenText.length)` (line 196) over all five captured rows. Neither is a tautology — both depend on runtime-captured `banner.innerText()` values and both were shown to fail live under mutant M1 (see local receipt: `Expected: "behind" Received: "syncing"`).
4. **Distinct from pending/blocked** — lines 212-223 call the product's own `deriveTacticalLifecyclePosture` (imported, not re-implemented) with `{pendingIntentCount:1}` and `{blockedBySequenceCollision:true}` overrides, confirm the derived states are `pending`/`blocked`, then assert `drivenText` (the five captured sentences) does not contain either held-back `.message`, and that the two held-back messages differ from each other. This reads the *same* `MESSAGES` constant (`src/lib/multiplayer/tacticalLifecycleState.ts:132-143`) the banner renders from, via the product's exported derivation function — not a hand-copied string literal that could silently drift.
5. **Command gating** — `gateRefused = (await refusal.count()) > 0` off the real `#networked-action-refusal` locator (line 286-287), compared to `GATED_STATES.has(state)` (line 289) and cross-checked again at lines 198-203 for the whole run. `GATED_STATES` (lines 71-78) is a test-local `Set` that duplicates the key set of `GATE_REASONS` in `src/lib/multiplayer/tacticalCommandGate.ts:37-48` rather than importing it. This is the one place the row is *slightly* weaker than it could be: a source-level rename/addition to `GATE_REASONS` that the test doesn't mirror would silently produce a wrong *expected* value rather than a compile error. It is not a tautology (the *actual* side reads the live DOM, so mutant M3 — `syncing` removed from `GATE_REASONS` — was correctly KILLED per the local receipt, `Expected: true Received: false`), but it is a manually-synchronized duplicate rather than a single source of truth. Non-blocking (flagged below).

No posture's assertion is weaker than the PROGRESS note or spec header claims. I found no assertion that reads a value the product does not render to players, and no tautology (the one candidate — the `seenText.get(text) ?? state` check — trivially passes only on a text's first occurrence by construction, which is correct behavior for a "first sighting" check, not a bug).

## B. In-paths levers only, no src/ touch

`git diff --numstat 7489e311f..00fdeab76` above lists 8 files; none is under `src/`. All five postures are driven through: `launchOneVersusOne`/`advancePhase`/`openContextPage`/`deleteIdentities` (pre-existing `e2e/helpers/gmTwoPlayerMatchFlow.ts`), `unitIdOnSide` (pre-existing `e2e/helpers/gmTwoPlayerRewind.ts`), and a new `installLifecycleHarness` built on Playwright's `page.routeWebSocket` (lines 336-422) that forwards, withholds, or closes **real** wire frames rather than injecting client-side state. `sendGoProne` (lines 316-329) sends one real `Intent{kind:'GoProne'}` frame on the harness's own transport — the same server-side path a real player's click would take — because (per the header, lines 156-157) the UI path needs a hex-selection locator this row does not own. `page.routeWebSocket` for direct frame manipulation is an established pattern already used in five other packs (`gm-two-player-backpressure`, `-exactly-once`, `-privacy`, `-proposals`, `-resilience`), so this is not a novel technique. Confirmed: **no `src/` files are touched.**

## C. Non-claims consistency

Three sources agree verbatim on the three non-claims plus the row-B deferral:
- Spec header (`e2e/gm-two-player-lifecycle.pack.spec.ts:16-26`): `reconnecting` (lever tried three ways, all step to `behind`), `rewound` (`PROJECTION_REWOUND` not in `ErrorCodeSchema`), `rebuilding` (needs a correction-lease lever this unit doesn't own).
- `tasks.md` PROGRESS note (line 589): same three, same reasoning, plus explicit statement that `pending`/`blocked` are "row B, deferred to successor unit U1e."
- `units.json` `nonClaims20260916` (lines 286-290): same three items verbatim, plus the pending/blocked deferral under the cap ruling.

I cross-checked the technical claims against source: `reconnectScheduled` is a real field read by `deriveState` at `tacticalLifecycleState.ts:202` (confirmed); `PROJECTION_REWOUND` is handled in `deriveState` (line 194-195) but the header's claim that the wire cannot carry it is corroborated by the file's own comment at lines 33-37 ("not a member of `ErrorCodeSchema`"). I did not find wording elsewhere in the diff that claims more than these non-claims license — e.g., the commit message and `units.json`'s `behavior` field for U1c both explicitly scope the claim to "row A" / "the five postures," and `tasks.md` line 584's parent checkbox (`22.3 ... E2E-71 through E2E-80`) is explicitly called out as still unchecked with "E2E-76/77/80 remain open."

## D. Ledger integrity

- **U1c state**: `local-verified` ✓, with `red` (`evidence/u1c-red-20260916.json`, exists, 70 lines) and `local` (`evidence/u1c-local-20260916.json`, exists, 265 lines) receipts recorded and present on disk at the head; `review`/`merge`/`mainProof`/`tick` are `null`, consistent with a unit awaiting Lane A review (this review).
- **U1e**: `state: "planned"`, same `ownershipPaths` — confirmed at `units.json:310-328`.
- **Checkbox**: `tasks.md:584` (`- [ ] 22.3 ...`) is unchanged (still unchecked) in this diff; only a `PROGRESS` bullet line was appended under it. `git diff` for `tasks.md` shows exactly one added line, no removed line, no checkbox toggled.
- **Validator**: `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → `ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows` (exit 0) — exact match to the required counts. `--next` → `NONE-ADMISSIBLE: 0 owner-gated, 5 blocked` (exit 3), consistent with GOAL.md's documented behavior for that state.
- **Caps**: counting product lines only (`e2e/`, `scripts/qc`, and the `tasks.md` line; excluding `units.json` and the `evidence/*.json` files under `openspec/planning`, per instruction): `445 + 1 + 25 + 7 = 478` added (480 counting the 2 deleted lines too) — under the 500-line cap. File count: 4 product files (`e2e` spec, `tasks.md`, qc test, qc core) plus 4 ledger/evidence files = 8 total, under the 15-file cap either way it's counted. This matches the unit's own `local` receipt `lineCounts.productTotalAdded: 478` and `fitsFileCap`/`fitsLineCap: true`.

## E. QC registration + pin test

`scripts/qc/gm-two-player-campaign-core.cjs` diff adds `lifecycle-pack:22` to `GROUP_CATALOG` and a `SPEC_BY_GROUP['lifecycle-pack'] = ['e2e/gm-two-player-lifecycle.pack.spec.ts']` entry (lines 135-141 in the new file). `scripts/__tests__/gm-two-player-campaign-qc.test.ts` adds `lifecycle-pack` to the pin's group list, asserts the exact `buildRunPlan` args/environment for the new group, adds it to the `all`-union expected spec list, and adds it to the "no longer NOT_IMPLEMENTED" loop set.

Ran:
```
npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts
```
Result: **Tests: 10 passed, 10 total.**

## F. Attribution / secrets / paths

- `git log -1 --format=%B 00fdeab76` and `git diff 7489e311f..00fdeab76 | grep -iE "generated with|claude|anthropic|co-authored-by|openai|gpt"` — **no matches**. No AI attribution anywhere in the range.
- `HOST_PASSWORD = 'LifecycleHost123!'` / `GUEST_PASSWORD = 'LifecycleGuest123!'` (lines 64-65) are dummy fixture literals for locally-created test accounts, matching the identical pattern already used unmodified in five other e2e packs (`coop-campaign-two-browser-journey`, `coop-campaign-ui-audit`, `gm-two-player-authority-order`, `gm-two-player-combat.pack1`, `gm-two-player-exactly-once`) — not a real secret.
- `evidence/u1c-admission-20260916.json` embeds `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u1c` and `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` (the operator's Windows username). This is a pre-existing, already-merged repo convention — the identical `PATH=...wroll...` string is a **standing constraint already committed in `GOAL.md`** (unmodified by this diff), and the identical worktree-path-in-evidence pattern is already present in `evidence/u1b-admission-20260916.json` on the baseline commit `7489e311f` (2 matches, verified via `git show`). Not a new leak introduced by this unit; flagged as a non-blocking observation only because it's still visible in a public range.

## Commands run (worktree: `.sisyphus/roadmap-completion-20260912/worktrees/u1c-review`, head `00fdeab76`)

```
$ npx tsc --noEmit -p tsconfig.json
(no output — exit 0)

$ npx oxfmt --check e2e/gm-two-player-lifecycle.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts scripts/qc/gm-two-player-campaign-core.cjs openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
All matched files use the correct format. Finished in 47ms on 3 files using 16 threads.

$ npx oxlint e2e/gm-two-player-lifecycle.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts scripts/qc/gm-two-player-campaign-core.cjs
Found 0 warnings and 0 errors. Finished in 12ms on 0 files using 16 threads.
(0 files matched — .oxlintrc.json ignores e2e/**, **/scripts/**, **/openspec/**, exactly as the PROGRESS note discloses: "oxlint covers NONE of this unit's files ... real but vacuous here")

$ npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts
Tests: 10 passed, 10 total. Time: 2.153 s.

$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows (exit 0)

$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
NONE-ADMISSIBLE: 0 owner-gated, 5 blocked (exit 3)
```

I also cross-read `src/lib/multiplayer/tacticalLifecycleState.ts`, `src/lib/multiplayer/tacticalCommandGate.ts`, `src/components/multiplayer/TacticalLifecycleStateBanner.tsx`, and `evidence/u1c-red-20260916.json` / `u1c-local-20260916.json` in full to verify the mutant claims (M1 `MESSAGES.behind`/`MESSAGES.syncing` collision, M2 `aria-live` removal, M3 `syncing` dropped from `GATE_REASONS`) and the red-phase claims (R1 `UNKNOWN_GROUP` exit 2, R2 the resilience-pack tautology at `gm-two-player-resilience.pack.spec.ts:685-690`) against the actual file contents. All matched.

## Non-blocking observations

1. **`GATED_STATES` (test) duplicates `GATE_REASONS` (product) by hand** instead of importing `keyof typeof GATE_REASONS` or the object's key set. A future rename in `tacticalCommandGate.ts` that isn't mirrored here would silently change the *expected* side of the gating assertion rather than fail to compile. Low risk (a live DOM read still backs the *actual* side, and the local receipt shows mutant M3 was correctly caught), but importing the type/keys directly would remove the manual-sync risk entirely. Not required before merge.
2. **Branch name** `codex/roadmap-u1c-e2e-75-77-20260916` mentions E2E-77, but this diff (and `units.json`'s U1c entry) only covers E2E-75 row A; E2E-77 is unit `U1d`, still `planned`, no receipts. This is purely a stale branch-name artifact from before the admission-stage split (`units.json:281-285` records the split reason) — no document in the diff overclaims E2E-77 coverage, so it's cosmetic only.
3. The resilience-pack regression check in the local receipt (`--group=resilience-pack`) reports 1 passed / 1 failed (E2E-15 fails), explicitly labeled `PRE-EXISTING, proven on clean origin/main with its own fresh build`. Worth the merge-time reviewer double-checking that claim still holds if `origin/main` has moved, but it is not this unit's regression to fix.
