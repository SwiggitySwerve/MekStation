# Lane A review: U1e
reviewedHead: f5b297669d602847e8369962220bab6583fd025d
baseline: ac874764a8767fba564cdeacfa565c107d94ae75
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## A. Row B assertion completeness

`e2e/gm-two-player-lifecycle.pack.spec.ts:302-410` is the new row-B test
(`E2E-75 lifecycle postures pending and blocked are distinct, announced and
correctly gated @lifecycle-pack @E2E-75`). It calls the **same, unmodified**
`capturePosture` helper (`:497-536`) that row A already used — confirmed by
diffing the range: no hunk in `git diff ac874764a..f5b297669` touches lines
497-536. `capturePosture` numbers the letter's five obligations in its own
comments and asserts all five per posture:

1. Stable locator — `page.getByTestId('tactical-lifecycle-state')` /
   `data-state` (`:504-510`).
2. Persistent text — `banner.innerText()` non-empty (`:511-513`).
3. AT announcement — `role=status`, `aria-live=polite`, `aria-atomic=true`,
   plus `banner.ariaSnapshot()` asserted to contain the rendered text
   (`:514-519`, `:530-534`) — the aria snapshot is Playwright's real
   accessibility-tree read, i.e. what assistive tech sees, not an internal
   value.
4. Non-color-only / no-reuse within the test's own `seenText` map
   (`:520-522`).
5. Command gating through the rendered refusal surface —
   `page.locator('#networked-action-refusal')` (`:525-529`), which is the
   real sr-only node the production component renders
   (`src/components/multiplayer/NetworkedGameSurface.actionbar.tsx:228`,
   `NETWORKED_ACTION_REFUSAL_ID` from
   `NetworkedGameSurface.actionContext.ts:22,90`).

Row-B-specific cross-posture block (`:364-393`):
- `evidence.map(row => row.state)).toEqual(['pending','blocked'])` — order.
- `row.text === postureOf(row.state).message` for each row (`:369-371`) —
  `postureOf` calls the real production function
  `deriveTacticalLifecyclePosture` (`src/lib/multiplayer/tacticalLifecycleState.ts:146`,
  also the function `src/components/multiplayer/NetworkedGameSurface.tsx:207`
  uses to build the banner), so this is a same-function comparison, not a
  test-local string duplicate.
- Pairwise-distinct against **every** row-A posture:
  `allText = [...ROW_A_STATES.map(postureOf), ...evidence.map(text)]` then
  `new Set(allText).size === allText.length` (`:378-382`). `ROW_A_STATES`
  (`:114-120`) is `['live','sealed','finalized','syncing','behind']` — all
  five row-A postures, matching `units.json`'s `rowSplit20260916.rowA`. So
  the distinctness check is over all 7 postures the pack drives, as the
  letter requires.
- Command gating both ways: `evidence.map(gateRefused)).toEqual([false,true])`
  (`:386`), and the blocked refusal text is compared against
  `refusalFor('blocked')`/`refusalFor('syncing')`/`refusalFor('behind')`
  (`:389-393`), all computed via the real `tacticalCommandAvailability`
  (`src/lib/multiplayer/tacticalCommandGate.ts:60`, same function
  `NetworkedGameSurface.tsx:218` uses) — not hardcoded strings.

**Tautologies:** none found. `postureOf` asserts `posture.state === state`
before returning (`:465-475`) so a wrong `POSTURE_CONDITION` entry cannot
silently mis-pin a sentence; that assertion, plus the mutant log below, shows
the checks are falsifiable.

**Values not rendered to players:** none found. Every read is either DOM
(`data-state`, `innerText`, `aria-*`, `ariaSnapshot`, the refusal node) or a
call into the same production functions that generate what the DOM shows.

**Pending driven deliberately, not via the recorded defect:** the call site
says so explicitly. Before arming, the test reloads both pages and polls
`postureState(guestPage)` to be `'live'` (`:339-343`) — this clears the
known `SetReady`-never-settles defect (documented in the file header,
`:57-63`) — and only then calls `harness.dropNextIntent()` (`:348`) followed
by `driveUntilPosture(..., 'pending')` (`:349`). The comment at `:334-338`
states this directly: "without it the surface already sits at `pending` from
the lobby's never-settled `SetReady`, and the arm below would be reading
that defect instead of its own dropped intent." `dropNextIntent`
(`installLifecycleHarness`, `:602-611`) swallows the guest's next outbound
`Intent` frame server-side-visible, matching the file-header description of
`client.ts:349-352,394,1377-1380`. This is a real, reviewable causal chain,
not an assumption.

One residual worth naming (not a defect in this diff): `capturePosture`'s
internal `seenText` de-dup check (`:521`) only compares within one test's own
map, so on its own the first call in any row trivially passes — the same
shape row A already used. The full 7-way distinctness is what the extra
block at `:378-382` supplies; that block is not vacuous (see mutant M1
below).

## B. Row A unchanged

```
$ git diff ac874764a..f5b297669 -- e2e/gm-two-player-lifecycle.pack.spec.ts | grep -n '^-[^-]'
7:- * Lifecycle posture pack - E2E-75 (umbrella 22.3), row A.
```
The only removed line in the whole file is the doc-comment header line,
replaced by `* Lifecycle posture pack - E2E-75 (umbrella 22.3), rows A and
B.` (`:2`). `git diff --numstat` confirms `291 1` for this file — one
deletion total. No line inside the row-A test function (`:179-300`) or in
`capturePosture`/`postureState`/`derivePosture`/`installLifecycleHarness`'s
pre-existing branches was touched; the only edits to
`installLifecycleHarness` are pure additions (`dropIntent`/`collide` state
and the two new closures).

`src/` is untouched — confirmed by `git diff --name-status ac874764a..f5b297669`
(7 files, none under `src/`). `scripts/qc` (the qc core, i.e.
`scripts/qc/**`) is untouched; the only `scripts/` file in the diff is
`scripts/__tests__/gm-two-player-campaign-qc.test.ts`, a pin test outside
`scripts/qc/`, adding one new `it()` (`:607-629`) that reads the spec file's
test titles via `buildRunPlan` + regex and asserts there are exactly two,
matching the two current titles verbatim.

## C. Non-claims stated consistently

- Spec file header (unchanged from row A, lines 39-49): "THREE
  NON-CLAIMS. `reconnecting` ... `rewound` ... `rebuilding` ...". The new
  row-B block added above it (`:16-25`) states explicitly: "It does NOT
  re-drive row A's five: their sentences enter the distinctness obligation
  through `deriveTacticalLifecyclePosture` ... rather than being re-driven."
- `tasks.md` PROGRESS entry (line 590, U1e): repeats all three non-claims
  ("`rewound` ..., `reconnecting` ..., and `rebuilding` ...") and adds "Row B
  also does not re-drive live, sealed, finalized, syncing or behind."
- `units.json` U1e entry: `behavior` field says "Non-claims carried from
  U1c: rewound, reconnecting." and `nonClaims20260916` lists exactly those
  two:
  ```
  "nonClaims20260916": [
    "rewound state (R6.B7 producer)",
    "reconnecting state (never renders under any available lever; see U1c)"
  ]
  ```

**Gap (non-blocking):** the ledger's dedicated `nonClaims20260916` array
omits the "row B does not re-drive row-A postures" non-claim that the spec
header and the `tasks.md` PROGRESS note both state, and also omits
`rebuilding` (present in the spec header and PROGRESS, though `rebuilding`
was never row B's concern either way). Nothing elsewhere overclaims past
what's proven — the commit message, spec header and PROGRESS note all stay
within "drives pending and blocked," "asserts ... against every row-A
posture (through the product's own derivation)," and "Row A is unchanged" —
all verified true above — but the ledger entry itself is not the complete
list of non-claims a reader relying on `units.json` alone would see.
Recommend the next ledger touch on this unit add the third item; does not
block this PR.

## D. Ledger integrity

`units.json` diff (`git diff ac874764a..f5b297669 -- .../units.json`): U1e
moves `planned` -> `local-verified`, `baseline` set to
`ac874764a8767fba564cdeacfa565c107d94ae75`, and `admission`/`red`/`local`
receipts populated with paths under `evidence/`; `review`/`merge`/
`mainProof`/`tick` remain `null`. All three referenced evidence files exist
on the head:
```
evidence/u1e-admission-20260916.json  (24103 bytes)
evidence/u1e-local-20260916.json      (12768 bytes)
evidence/u1e-red-20260916.json        (8961 bytes)
```
and the admission receipt's own `baseline` field reads
`ac874764a8767fba564cdeacfa565c107d94ae75`, matching.

No `tasks.md` checkbox changed:
```
$ git diff ac874764a..f5b297669 -- .../tasks.md | grep -E '\[x\]|\[ \]'
(no output)
```
(the diff is a pure narrative-line addition plus its `+++`/`---` headers).

Validator, run in the review worktree:
```
$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows
```
Matches exactly.

Caps — `git diff --numstat ac874764a..f5b297669`:
```
291  1  e2e/gm-two-player-lifecycle.pack.spec.ts
  1  0  openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
217  0  openspec/planning/.../evidence/u1e-admission-20260916.json
203  0  openspec/planning/.../evidence/u1e-local-20260916.json
106  0  openspec/planning/.../evidence/u1e-red-20260916.json
 18  5  openspec/planning/.../units.json
 27  0  scripts/__tests__/gm-two-player-campaign-qc.test.ts
```
7 files total (cap 15 — OK). Ledger/evidence files under `openspec/planning`
(units.json + 3 evidence JSONs) are evidence, not product, per the review
brief. Product files: e2e spec (291+1), qc pin test (27+0), tasks.md (1+0) —
319 added+removed lines by raw numstat sum; the unit's own `local` receipt
computes `productTotalAdded: 318` via a block-comment/code/blank classifier
that excludes the 1-line `tasks.md` narrative addition from "product."
Either figure is well inside the 500-line cap; the 1-line discrepancy is a
methodology footnote, not a violation.

## E. Pin suite

```
$ npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts
PASS unit scripts/__tests__/gm-two-player-campaign-qc.test.ts
  ...
    √ pins the lifecycle-pack spec at two rows (1 ms)
    ...
Tests:       11 passed, 11 total
```
The new pin (`:607-629`) reads `lifecycle-pack`'s spec path via
`buildRunPlan`, greps the two `test('...')` titles out of the file, and
asserts both verbatim strings in order — a real regression pin on the
two-row shape, not a count.

`--next` on the head:
```
$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
NONE-ADMISSIBLE: 0 owner-gated, 4 blocked
exit=3
```
NONE-ADMISSIBLE, as expected while U1e sits at `local-verified` (not yet
`main-verified`) and downstream work is blocked pending it.

## F. Attribution, secrets, paths

Commit message (`f5b297669`) carries no AI-attribution footer (no
`Co-Authored-By`, no "Generated with"). Scanning the full diff:
```
$ git diff ac874764a..f5b297669 | grep -iE "generated with|co-authored-by|claude|anthropic|openai|chatgpt|gpt-4|copilot"
+  "previousLane": "claude-opus-5 wrote the admission and red receipts and the first draft of row B; stopped before the local receipt",
```
The one hit is inside `evidence/u1e-local-20260916.json` — a ledger field
recording which worker/model produced which stage, which is the
worker/model bookkeeping `DELIVERY.md` requires each receipt to carry
("selected worker/model/effort"). It is not commit-message/PR-body
AI-attribution of the kind the commit-guard hook and GOAL.md's "No AI
attribution" rule target, and it is in evidence, not product. Scanning the
two **product** files alone (`e2e/gm-two-player-lifecycle.pack.spec.ts`,
`scripts/__tests__/gm-two-player-campaign-qc.test.ts`) for attribution,
secrets, tokens or absolute paths returned nothing.

Absolute machine paths (`E:/Projects/MekStation`, `E:\Projects\MekStation`)
do appear, but only inside the evidence JSON (`u1e-admission-20260916.json`
recording the worktree-creation command and node-modules junction), which
`DELIVERY.md` explicitly requires ("Record canonical absolute paths and the
associated Git worktree ID/ref/HEAD at creation"). None appear in the
product files. `HOST_PASSWORD`/`GUEST_PASSWORD` are pre-existing local
Playwright fixture literals (unchanged, shared with row A), not real
credentials.

## Commands run (worktree: `.sisyphus/roadmap-completion-20260912/worktrees/u1e-review`, head `f5b297669`)

- `npx tsc --noEmit -p tsconfig.json` → exit 0, no output.
- `npx oxfmt --check e2e/gm-two-player-lifecycle.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts` → `All matched files use the correct format.` exit 0.
- `npx oxlint e2e/gm-two-player-lifecycle.pack.spec.ts scripts/__tests__/gm-two-player-campaign-qc.test.ts` → `Found 0 warnings and 0 errors.` `... on 0 files ...` (both paths are ignored by `.oxlintrc.json`, matching the receipt's "vacuous for this diff" claim).
- `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` → `Tests: 11 passed, 11 total`.
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → `ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows`.
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next` → `NONE-ADMISSIBLE: 0 owner-gated, 4 blocked` (exit 3).

## Non-blocking observations

1. `units.json`'s `nonClaims20260916` array for U1e lists 2 of the 3
   non-claims that the spec header and `tasks.md` PROGRESS note state (see
   §C) — worth completing on the next ledger touch, does not misstate
   anything and does not block merge.
2. Product-line accounting has a 1-line discrepancy between raw
   `--numstat` summation (319) and the receipt's own classifier
   (`productTotalAdded: 318`, which excludes the `tasks.md` narrative line)
   — inconsequential relative to the 500-line cap, flagged only for
   methodology clarity.
3. `driveUntilPosture` (`:431-450`) swallows exceptions from `advancePhase`
   inside its retry loop with a bare `catch {}`; this is explained in the
   function doc comment (a collided client's phase control can detach
   mid-click) and the loop still fails loudly after 8 attempts, so it is not
   a silent-failure risk, but a future reader skimming the loop body alone
   could mistake it for one.
