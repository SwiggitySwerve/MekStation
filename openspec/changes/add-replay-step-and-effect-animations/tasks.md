# Tasks — Add Replay Step and Effect Animations

This change ships three deliverables:

- **A** — Movement step animation in replay (M, ~3 days)
- **A'** — AttackEffectsLayer in replay surfaces (S, ~1 day)
- **B** — Encounter Watch Replay link (S, ~2 hours)

Total estimated wall-clock: 4 working days, including tests +
manual smoke + storybook coverage.

## 1. Authoring (this change)

- [x] 1.1 Author `proposal.md`
- [x] 1.2 Author `design.md`
- [x] 1.3 Author `specs/tactical-map-interface/spec.md` delta
  (2 ADDED reqs)
- [x] 1.4 Author `specs/encounter-system/spec.md` delta (1 ADDED
  req)
- [x] 1.5 Author `tasks.md` (this file)
- [x] 1.6 `npx openspec validate add-replay-step-and-effect-animations
  --strict` clean

## 2. Implementation — Gap A (movement step animation in replay)

- [x] 2.1 Create
  `src/hooks/replay/useReplayMovementAnimations.ts` exporting
  the new hook signature
  `useReplayMovementAnimations(events: readonly IGameEvent[],
  currentSequence: number, opts: { mapId: string }): void`
  - Acceptance: hook compiles strict-mode, exposes a single
    public function, no default export
  - QA: `npm run typecheck` passes
- [x] 2.2 Implement `useEffect` body with previous-cursor ref
  to detect forward vs rewind
  - Acceptance: rewind path calls
    `useAnimationQueue.getState().reset()` before re-walking
    forward; forward path increments from `prevCursor` to
    `currentSequence` only
  - QA: unit test `forward advance enqueues per-step` passes
- [x] 2.3 Implement step-kind switch: `forward` / `lateral` /
  `jump` produce path-bearing animations; `turn` produces
  facing-only animation; `standUp` / `goProne` /
  `chargeDeclared` / `dfaDeclared` / `shakeOffSwarm` are
  skipped (no enqueue, no throw)
  - Acceptance: each step kind has a unit test with assertion
    on the resulting `useAnimationQueue` state
  - QA: `npm run test -- useReplayMovementAnimations` green
- [x] 2.4 Implement `MovementAnimationMode` mapping from
  `IMovementStep.kind` + `payload.movementType` to the queue's
  mode enum
  - Acceptance: walk / run / jump / lateral all map correctly
    per the live-play `Movement Path Interpolation` contract
- [x] 2.5 Implement reduced-motion branch — skip all enqueues
  when `usePrefersReducedMotion()` returns `true`
  - Acceptance: with the hook mocked to `true`, no enqueue is
    called for any step kind
- [x] 2.6 Implement legacy-events fallback — when
  `payload.steps` is `undefined`, enqueue a single instant-
  snap animation derived from `payload.from` / `payload.to`
  - Acceptance: legacy NDJSON fixture without `steps` field
    parses without error and enqueues one fallback animation
- [x] 2.7 Wire the hook into
  `src/components/quickgame/QuickGameReplayPanel.tsx` — call
  `useReplayMovementAnimations(events, replay.currentSequence,
  { mapId: 'quickgame-replay' })` immediately after the
  existing `useHexMapStateFromEvents` call
  - Acceptance: `QuickGameReplayPanel` renders with no
    runtime warnings; existing tests still pass
  - QA: `npm run test -- QuickGameReplayPanel` green
- [x] 2.8 Wire the hook into
  `src/pages/gameplay/games/[id]/replay.tsx` — same
  invocation with `mapId: 'replay'`
  - Acceptance: replay route renders with no runtime
    warnings; existing tests still pass

## 3. Implementation — Gap A' (AttackEffectsLayer in replay)

- [x] 3.1 Mount `<AttackEffectsLayer events={events}
  tokens={tokens} mapId={'quickgame-replay'} />` in
  `QuickGameReplayPanel.tsx` — implementation note: the
  existing `<HexMapDisplay>` already mounts the layer
  internally and forwards the `mapId` + `events` + `tokens`
  props passed to it (line 463). The replay panel passes
  `mapId="quickgame-replay"` to `<HexMapDisplay>` so the
  internal layer is correctly scoped to the replay surface.
  No additional sibling mount is needed.
  - Acceptance: rendered DOM contains exactly one
    `<AttackEffectsLayer>` element when the panel is active
  - QA: integration test
    `QuickGameReplayPanel.attackEffects.test.tsx` asserts the
    layer renders and receives the correct `tokens` and
    `mapId` props
- [x] 3.2 Mount `<AttackEffectsLayer events={events}
  tokens={tokens} mapId={'replay'} />` in
  `pages/gameplay/games/[id]/replay.tsx` — same approach as
  3.1 (mapId forwarded through `<HexMapDisplay>`).
  - Acceptance: rendered DOM contains exactly one
    `<AttackEffectsLayer>` element on the replay route
  - QA: integration test `replay.attackEffects.test.tsx`
- [x] 3.3 Confirm no enrichment of `IAttackResolvedPayload` is
  needed — the layer already derives geometry from
  `tokens[].position` (verified during research)
  - Acceptance: no edit to
    `src/types/gameplay/GameSessionInterfaces.ts`
  - QA: `git diff src/types/gameplay/GameSessionInterfaces.ts`
    is empty after the change ships

## 4. Implementation — Gap B (encounter Watch Replay link)

- [x] 4.1 Identify the encounter-detail action surface module
  that hosts the existing `EncounterActionsFooter` actions —
  chose `src/components/gameplay/pages/EncounterDetailPage.actions.tsx`
  for the new `EncounterWatchReplayButton` so visual styling
  matches the existing action surfaces.
  - Acceptance: chosen module documented in the implementing
    PR description
- [x] 4.2 Add a "Watch Replay" button rendered when
  `encounter.gameSessionId !== undefined`. Use the existing
  `Button` primitive from `@/components/ui` with the same
  visual style as the surrounding actions. `data-testid` =
  `'encounter-watch-replay-link'`. Label = `'Watch Replay'`.
  - Acceptance: rendered DOM matches the spec scenarios
  - QA: unit test
    `EncounterDetailPage.watchReplay.test.tsx` exercises the
    visible / hidden / click paths
- [x] 4.3 Wire the button's `onClick` to
  `router.push('/gameplay/games/' +
  encounter.gameSessionId + '/replay')` using the existing
  `useRouter()` instance from `next/router`
  - Acceptance: click test asserts `router.push` mock is
    called with the literal expected string

## 5. Tests

- [ ] 5.1 Unit tests for `useReplayMovementAnimations`:
  forward advance, rewind reset, jump step, reduced-motion,
  legacy fallback, skipped step kinds — at minimum 6 spec
  blocks (one per spec scenario in
  `tactical-map-interface/spec.md` "Replay Movement Step
  Animation Playback")
- [ ] 5.2 Integration test for the adapter+reducer
  composition: render a small replay with both
  `useHexMapStateFromEvents` and
  `useReplayMovementAnimations`, advance the cursor across a
  multi-step move, assert `useAnimationQueue.getState()`
  reaches the expected shape AND `tokens[unit].position`
  reaches the expected hex
- [ ] 5.3 Integration test for `<AttackEffectsLayer>` in
  `QuickGameReplayPanel`: mount the panel with a fixture
  events log containing one `AttackResolved`, advance cursor
  past it, assert a beam DOM element appears and its
  endpoints match the actor and target token positions
- [ ] 5.4 Integration test for `<AttackEffectsLayer>` in the
  standalone replay route — same shape as 5.3 but driven by
  the page component
- [ ] 5.5 Unit tests for the encounter Watch Replay button:
  visible-when-launched, hidden-when-draft, click-pushes-route,
  hides-when-cleared (4 spec scenarios)
- [ ] 5.6 Storybook story for the encounter detail page in the
  Launched state showing the Watch Replay button visible
- [ ] 5.7 Run `npm run test` — full suite green
- [ ] 5.8 Run `npm run typecheck` — strict-mode clean

## 6. Final verification

- [ ] 6.1 `npm run lint` clean across all touched files
- [ ] 6.2 `npm run typecheck` clean across the repo
- [ ] 6.3 `npm run test` — full suite green; no new flakes
- [ ] 6.4 Manual smoke (Gap A): launch a quick game, complete
  it, open Replay tab, scrub forward through a multi-hex
  walk and a jump — token visibly walks/arcs rather than
  teleporting; rewind mid-walk does not leave a stale
  animation finishing in the new state
- [ ] 6.5 Manual smoke (Gap A'): in the same Replay tab, scrub
  past a weapon attack — beam / missile / impact flash
  visibly play; reduced-motion preference (set in OS) cuts
  to the layer's existing 300 ms / 80 ms fallback durations
- [ ] 6.6 Manual smoke (Gap B): launch an encounter (the
  encounter must reach `Launched` status with a populated
  `gameSessionId`), navigate back to the encounter detail
  page, click "Watch Replay" — page navigates to
  `/gameplay/games/<sessionId>/replay` and the replay loads
- [ ] 6.7 Reduced-motion smoke — repeat 6.4 / 6.5 with
  `prefers-reduced-motion: reduce` set; verify token
  positions still update correctly and beams use the short-
  duration fallbacks; no full-duration animations play
- [ ] 6.8 `omo-spec-verifier` (or `omo-momus`) confirms each
  SHALL/MUST in the two delta specs has implementation +
  test coverage

## 7. Archive

- [ ] 7.1 `npx openspec validate add-replay-step-and-effect-animations
  --strict` final pass clean
- [ ] 7.2 Archive via `/opsx:archive
  add-replay-step-and-effect-animations` — full spec sync
  expected (NO `--skip-specs`); deltas merge into
  `openspec/specs/tactical-map-interface/spec.md` and
  `openspec/specs/encounter-system/spec.md`
- [ ] 7.3 Confirm the archive PR's CI is green and the merged
  source-of-truth specs reflect the ADDED requirements
