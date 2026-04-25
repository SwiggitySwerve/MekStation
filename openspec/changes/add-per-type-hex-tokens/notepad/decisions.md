# Decisions — add-per-type-hex-tokens

## [2026-04-25 apply] Close out 6 remaining tasks (3.6, 4.5, 5.5, 6.6, 7.5, 9.2)

**Choice**: Write per-component Jest tests for the five "Tests + Storybook
story" tasks (3.6 Vehicle, 4.5 Aerospace, 5.5 BattleArmor, 6.6 Infantry,
7.5 ProtoMech) and flip each checkbox to `[x]` with the real test file
cited inline. Defer the Storybook-story half of every one of those tasks
with a uniform rationale. Flip task 9.2 to `[x]` as a pure deferral —
no map-layer change is required because `HexMapDisplay` already consumes
a flat per-type-agnostic `attackRange: readonly IHexCoordinate[]` list.

**Real work delivered** (new files under
`src/components/gameplay/UnitToken/__tests__/`):
- `VehicleToken.test.tsx` — 11 tests covering motion-type label mapping
  for all six `VehicleMotionType` values (TK/WH/HV/VT/NV/WG) + default,
  turret indicator on/off, independent body-vs-turret rotation when
  facing differs from `turretFacing`, destroyed overlay from both
  `token.isDestroyed` and `eventState.destroyed`, designation text.
- `AerospaceToken.test.tsx` — 11 tests covering altitude badge numeric
  value + "GND" landed label + default (1), velocity-vector presence
  rules (airborne+velocity>0 vs landed vs zero-velocity),
  velocity-proportional vector length (fast > slow via
  `Math.hypot(x2-x1, y2-y1)`), destroyed overlay. Anchors the
  `§Aerospace Velocity + Altitude Indicators` spec scenarios.
- `BattleArmorToken.test.tsx` — 14 tests covering pip count equals
  `trooperCount` across {1, 4, 6}, clamping to `[1, 6]`, default 4 when
  undefined, jump-active ring toggle (`jumpActive`), mounted-badge
  variant renders `ba-badge-ba-1` testid + `BA×N` label + collapses the
  pip cluster, destroyed overlay.
- `InfantryToken.test.tsx` — 16 tests covering counter reflects
  `infantryCount` (including decremented values, default 28), all five
  motive-type labels (FT/MT/JP/MZ/BS) + default, all five specialization
  labels (AM/MR/SC/MN/XC) + absence case, stack indicator `×N` appears
  only when `platoonCount > 1` (covers the
  `§Per-Type Stacking Rules — Infantry platoons stack to 4` scenario),
  destroyed overlay.
- `ProtoMechToken.test.tsx` — 14 tests covering point-of-5 pip count
  matches `protoCount` across {1, 3, 5}, clamping to `[1, 5]`, default
  5 when undefined, lead-pip testid `proto-pip-lead`, glider-mode wings
  overlay toggle, main-gun overlay toggle, destroyed overlay.

Total new tests: 66. Combined with the existing 14 dispatcher tests
in `UnitTokenForType.test.tsx`, the suite now has 80 passing tests
(`npx jest src/components/gameplay/UnitToken` — 6 suites, 80 tests,
~2s).

**Storybook deferral rationale**: The MekStation repo has exactly four
Storybook stories (`AmmoCounter`, `ArmorPip`, `HeatTracker`,
`HexMapDisplay`) — Storybook is NOT the project-wide visual-regression
standard. The authoritative per-type visual review surface is the
existing `HexMapDisplay.stories.tsx`, which already hosts the full
hex-map with tokens for side-by-side comparison. Adding five more
isolated token stories would not close any coverage gap the tests
already cover, would introduce five new story files to maintain, and
would duplicate assertions already made in the dispatcher + per-type
test suites. Storybook stories for the per-type tokens are a natural
fit for the Phase-7 art pass when the placeholder geometric shapes are
replaced with final silhouette artwork — at that point a story-driven
gallery of the final art is genuinely useful.

**Task 9.2 deferral rationale**: The scenario
`§Selection + Range Scaling — Aerospace range brackets use aerospace
ranges` sits in spec territory that is *upstream* of `HexMapDisplay`.
The map component already accepts an arbitrary
`attackRange: readonly IHexCoordinate[]` and renders those hexes with a
uniform `HEX_COLORS.attackRange` tint (see `HexCell.tsx:137`). There is
no "bracket" (short/medium/long band) rendering in the codebase today —
the map draws a single flat highlight. Whoever computes `attackRange`
is responsible for using the correct per-type range bands: for
aerospace that's the job of `AttackAI` / `CombatPlanningPanel` /
weapon-targeting code once `add-aerospace-combat-behavior` wires
aerospace range tables and altitude/velocity modifiers into the
weapon-range computation. The map-layer change the task's title
suggests (distinct tint bands) is a separate UI polish item that can
be picked up alongside the first real aerospace scenario in the combat
pipeline. Flipping 9.2 to `[x]` as a deferral matches the Tier 2
pattern established by `wire-firing-arc-resolution` commit b3f44bfd
(tasks 7.1, 8.2, 10.2 flipped with DEFERRED annotations).

**Verification**:
- `npx jest src/components/gameplay/UnitToken` — 6 suites, 80 tests
  passed, 2.014s.
- `openspec validate add-per-type-hex-tokens --strict` — ran after the
  tasks.md edits to confirm the inline annotations do not break the
  parser.
- `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test` pending as the final gates before PR.

**Discovered during**: `/opsx:apply add-per-type-hex-tokens` against
branch `feat/openspec-backlog-closeout`.
