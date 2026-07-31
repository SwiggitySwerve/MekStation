## 1. Force Group Presentation

- [x] 1.1 Thread the viewer's `playerSide` from `GameplayLayout` through `GameplayTopBand` into `TacticalTurnRail`.
- [x] 1.2 Split the initiative roster into viewer-relative Allied Force and Opposing Force groups in combat mode and Player Force and Opponent Force groups in GM, replay, and spectator modes while preserving projected initiative order.
- [x] 1.3 Resolve side data from authoritative unit state, then game-unit metadata, or render an explicit Unassigned group instead of defaulting to allied.
- [x] 1.4 Show each force's operational count, any nonzero eliminated and withdrawn counts, and persistent terminal status text.

## 2. Responsive and Accessible Framing

- [x] 2.1 Render independently scrollable force lists with pinned labels, narrow-screen overflow guidance, and no document-level horizontal overflow.
- [x] 2.2 Expose named force regions and lists with human-readable unit control names.
- [x] 2.3 Derive terminal status before active status so destroyed and withdrawn units never expose `aria-current`.

## 3. Regression Coverage and Verification

- [x] 3.1 Add focused `TacticalTurnRail` component coverage for force grouping, counts, terminal text, and observer labels.
- [x] 3.2 Prepare a focused regression-hardening change that proves missing-side units remain visible under Unassigned; replay and spectator use observer labels; named regions/lists and visible counts are exposed; exactly one live non-terminal active unit receives `aria-current`; overflowing force lists scroll independently with pinned labels; and narrow layouts retain two normal rows or a third Unassigned row without hiding the command dock.
- [x] 3.3 Extend phase-projection coverage to prove terminal units remain in initiative order while being excluded from unresolved and blocker collections.
- [x] 3.4 Run focused Jest coverage, Node 22 TypeScript, changed-file lint and format checks, production build, tactical projection validation, and viewport sweep.
  - Permanently recorded by [merged PR #1083](https://github.com/SwiggitySwerve/MekStation/pull/1083) and [CI run 30516864020](https://github.com/SwiggitySwerve/MekStation/actions/runs/30516864020) at source head `8d9783d0c00a73eb7684e151bcad9be62ca81c15`: focused Jest, Node 22 TypeScript, changed-file oxlint/oxfmt, production build, tactical projection parity, and viewport sweep (6/6 inventory guards, 12/12 helper tests, 51/51 route/layout cases).
- [x] 3.5 Capture desktop, mobile, zoom, keyboard, ARIA, engine, and store evidence for the presentation wave and document separate durability limits.
  - The [PR #1083 handoff](https://github.com/SwiggitySwerve/MekStation/pull/1083) permanently records the evidence summary and limits. Run-local screenshots and inspection notes remain supplementary untracked artifacts, are not part of this candidate, and are not treated as authority or persistence proof. The handoff records missing Unassigned and real screen-reader execution plus the absence of a rail-specific axe artifact; repository-level axe coverage passed in PR CI.
- [x] 3.6 Obtain independent exact-commit code, goal, QA, history, and security review approval for the presentation-only diff.
  - [Merged PR #1083](https://github.com/SwiggitySwerve/MekStation/pull/1083) permanently records all five review-work passes against exact source head `8d9783d0c00a73eb7684e151bcad9be62ca81c15`.
- [x] 3.7 Open the focused product PR, wait for terminal checks, and record the exact-SHA handoff before starting command-authority hardening.
- [x] 3.8 Open the focused task 3.2 PR, wait for required checks, and record its merge plus exact-main regression handoff.
  - [PR #1098](https://github.com/SwiggitySwerve/MekStation/pull/1098) merged as `f357d4425223f3b2d2519f7bfd28c5051b7be738` after all 29 checks passed in [CI run 30661362540](https://github.com/SwiggitySwerve/MekStation/actions/runs/30661362540).
  - Detached exact-main regression at that merge SHA passed focused Jest (17/17), focused Chromium (2/2), strict OpenSpec validation, and the viewport sweep (6/6 inventory guards, 12/12 helper tests, 51/51 route/layout cases). The in-app browser remained unavailable, so the repository-configured Chromium fallback was recorded as an environment limit rather than equivalent authority or persistence proof. An initial unsupported external `node_modules` junction was rejected by Turbopack before the test server started; the authoritative rerun used a local `npm ci` installation and passed.
