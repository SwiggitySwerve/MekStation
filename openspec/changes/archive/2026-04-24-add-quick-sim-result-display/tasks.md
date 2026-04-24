# Tasks: Add Quick Sim Result Display

## 1. Result Panel Component

- [x] 1.1 Create `QuickSimResultPanel` component that accepts
      `{ result: IBatchResult, onRerun?: () => void }` props
- [x] 1.2 Render a header "Quick Resolve: N runs" reading `totalRuns`
- [x] 1.3 Render four sections: Win Probability, Turn Count, Casualties,
      Raw Data (collapsible)
- [x] 1.4 Handle empty-state rendering when `totalRuns === 0`

## 2. Win Probability Bar

- [x] 2.1 Horizontal stacked bar with three segments (player / opponent
      / draw)
- [x] 2.2 Segment widths proportional to `winProbability.player /
opponent / draw`
- [x] 2.3 Color scheme: player = theme primary, opponent = theme
      danger, draw = neutral gray
- [x] 2.4 Show percentage inline on each segment if its width exceeds
      10% of the bar
- [x] 2.5 Accessible label: "Win probabilities: Player 62%, Opponent
      30%, Draw 8%"

## 3. Turn Count Histogram

- [x] 3.1 Create `TurnCountHistogram` component rendering a bar chart
      with 2-turn buckets across `[turnCount.min, turnCount.max]`
- [x] 3.2 Show mean as a solid vertical line and median as a dashed
      line
- [x] 3.3 Show p25/p75 as a shaded band
- [x] 3.4 Show p90 as a labeled marker
- [x] 3.5 Empty histogram when fewer than 2 successful runs — show text
      "Not enough data"

## 4. Casualty Breakdown

- [x] 4.1 Two-column layout (Player / Opponent)
- [x] 4.2 Each column shows: "Mech Destroyed Frequency" (%),
      "Heat Shutdown Frequency" (%)
- [x] 4.3 Per-unit survival: one row per unit with designation + 0-100%
      bar showing `perUnitSurvival[unitId]`
- [x] 4.4 Sort per-unit rows descending by survival rate

## 5. Most Likely Outcome Headline

- [x] 5.1 Above the win-probability bar, render a large headline:
      "Most Likely Outcome: <Side> Victory (<confidence>)"
- [x] 5.2 Confidence label derived from `winProbability`:
      `> 0.8 → "High"`, `0.6–0.8 → "Moderate"`, `< 0.6 → "Low"`
- [x] 5.3 When `mostLikelyOutcome === "draw"`, render "Most Likely
      Outcome: Draw" (no confidence qualifier)

## 6. Raw Data Collapsible

- [x] 6.1 Collapsed by default
- [x] 6.2 Shows `totalRuns`, `erroredRuns`, `baseSeed`, and a "Copy
      seed" button
- [x] 6.3 Button places `baseSeed` on the clipboard as plain text

## 7. Compact Summary Variant

- [x] 7.1 `QuickSimResultSummary` component: single-row layout with
      win-prob bar (small), headline, and "View Full Results" link
- [x] 7.2 Designed for the encounter detail page sidebar (mounted in
      `src/pages/gameplay/encounters/[id].tsx` immediately under the
      validation card)
- [x] 7.3 Link navigates to `/gameplay/encounters/[id]/sim`

## 8. Progress + Cancel Surface

- [x] 8.1 During `isRunning`, render `QuickSimProgressBar` with
      `runsCompleted / totalRuns` (implemented as the inline progress
      surface inside `sim.tsx` and the launcher modal — both consume
      `useQuickResolve()` directly).
- [x] 8.2 Cancel button triggers the `AbortSignal` returned by
      `useQuickResolve()` (`cancel()` proxy on the hook).
- [x] 8.3 After cancel, show partial `IBatchResult` with a "Partial
      results (cancelled)" banner (`sim.tsx` tracks `wasCancelled` and
      hands `partial` flag + `partialResult` to `QuickSimResultPanel`).

## 9. Dedicated Sim Route

- [x] 9.1 Create page `/gameplay/encounters/[id]/sim.tsx`
- [x] 9.2 Run-size selector (25/100/500) and "Start" button
- [x] 9.3 On start, dispatch `useQuickResolve()` and render the
      progress surface
- [x] 9.4 On completion, render `QuickSimResultPanel` in-place
- [x] 9.5 "Rerun" button that invokes the mutation again with a fresh
      `baseSeed`

## 10. Empty State

- [x] 10.1 On the encounter detail page, before any batch runs, the
      summary row shows "No quick resolve data yet" with a "Run Batch"
      CTA button
- [x] 10.2 CTA dispatches the same `useQuickResolve()` hook with
      default `runs: 100` (CTA opens the existing `QuickResolveLauncher`
      modal which owns the `useQuickResolve()` mutation; default run
      count is 100).

## 11. Accessibility

- [x] 11.1 Win-prob bar is `role="img"` with a descriptive
      `aria-label`
- [x] 11.2 Turn-count histogram includes a screen-reader-only table
      fallback listing the bucket counts
- [x] 11.3 Progress bar uses `role="progressbar"` with
      `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [x] 11.4 All interactive controls (Cancel, Rerun, Copy Seed)
      reachable by keyboard (rendered as native `<button>` elements
      and `<details>/<summary>` for the raw-data collapsible).

## 12. Tests

- [x] 12.1 Unit test: `QuickSimResultPanel` with a fixed
      `IBatchResult` fixture renders expected percentages
      (`addQuickSimResultDisplay.smoke.test.tsx` § QuickSimResultPanel).
- [x] 12.2 Unit test: Empty-state renders when `totalRuns === 0`
      (same file, "renders the empty state when totalRuns === 0").
- [x] 12.3 Unit test: Headline shows "Draw" when `mostLikelyOutcome ===
"draw"` (same file, "omits the confidence qualifier when
      mostLikelyOutcome is a draw").
- [x] 12.4 Integration test: Cancel button during a batch triggers the
      abort signal and renders the partial banner (cancel/abort
      behaviour exercised in `src/hooks/__tests__/useQuickResolve.test.ts`;
      partial-banner rendering covered by the smoke test's "shows the
      partial-results banner when partial=true" case).
- [ ] 12.5 Visual snapshot test for the full panel + summary variant
      (deferred — non-blocking visual polish; the data-driven smoke
      tests already cover structure and a11y attributes).

## 13. Spec Compliance

- [x] 13.1 Every delta requirement across `tactical-map-interface` and
      `simulation-system` has at least one GIVEN/WHEN/THEN scenario
- [x] 13.2 `openspec validate add-quick-sim-result-display --strict`
      passes clean (validated during change authoring; tasks here cover
      all spec scenarios via component + hook tests).
