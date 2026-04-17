# Tasks: Add Quick Sim Result Display

## 1. Result Panel Component

- [ ] 1.1 Create `QuickSimResultPanel` component that accepts
      `{ result: IBatchResult, onRerun?: () => void }` props
- [ ] 1.2 Render a header "Quick Resolve: N runs" reading `totalRuns`
- [ ] 1.3 Render four sections: Win Probability, Turn Count, Casualties,
      Raw Data (collapsible)
- [ ] 1.4 Handle empty-state rendering when `totalRuns === 0`

## 2. Win Probability Bar

- [ ] 2.1 Horizontal stacked bar with three segments (player / opponent
      / draw)
- [ ] 2.2 Segment widths proportional to `winProbability.player /
    opponent / draw`
- [ ] 2.3 Color scheme: player = theme primary, opponent = theme
      danger, draw = neutral gray
- [ ] 2.4 Show percentage inline on each segment if its width exceeds
      10% of the bar
- [ ] 2.5 Accessible label: "Win probabilities: Player 62%, Opponent
      30%, Draw 8%"

## 3. Turn Count Histogram

- [ ] 3.1 Create `TurnCountHistogram` component rendering a bar chart
      with 2-turn buckets across `[turnCount.min, turnCount.max]`
- [ ] 3.2 Show mean as a solid vertical line and median as a dashed
      line
- [ ] 3.3 Show p25/p75 as a shaded band
- [ ] 3.4 Show p90 as a labeled marker
- [ ] 3.5 Empty histogram when fewer than 2 successful runs — show text
      "Not enough data"

## 4. Casualty Breakdown

- [ ] 4.1 Two-column layout (Player / Opponent)
- [ ] 4.2 Each column shows: "Mech Destroyed Frequency" (%),
      "Heat Shutdown Frequency" (%)
- [ ] 4.3 Per-unit survival: one row per unit with designation + 0-100%
      bar showing `perUnitSurvival[unitId]`
- [ ] 4.4 Sort per-unit rows descending by survival rate

## 5. Most Likely Outcome Headline

- [ ] 5.1 Above the win-probability bar, render a large headline:
      "Most Likely Outcome: <Side> Victory (<confidence>)"
- [ ] 5.2 Confidence label derived from `winProbability`:
      `> 0.8 → "High"`, `0.6–0.8 → "Moderate"`, `< 0.6 → "Low"`
- [ ] 5.3 When `mostLikelyOutcome === "draw"`, render "Most Likely
      Outcome: Draw" (no confidence qualifier)

## 6. Raw Data Collapsible

- [ ] 6.1 Collapsed by default
- [ ] 6.2 Shows `totalRuns`, `erroredRuns`, `baseSeed`, and a "Copy
      seed" button
- [ ] 6.3 Button places `baseSeed` on the clipboard as plain text

## 7. Compact Summary Variant

- [ ] 7.1 `QuickSimResultSummary` component: single-row layout with
      win-prob bar (small), headline, and "View Full Results" link
- [ ] 7.2 Designed for the encounter detail page sidebar
- [ ] 7.3 Link navigates to `/gameplay/encounters/[id]/sim`

## 8. Progress + Cancel Surface

- [ ] 8.1 During `isRunning`, render `QuickSimProgressBar` with
      `runsCompleted / totalRuns`
- [ ] 8.2 Cancel button triggers the `AbortSignal` returned by
      `useQuickResolve()`
- [ ] 8.3 After cancel, show partial `IBatchResult` with a "Partial
      results (cancelled)" banner

## 9. Dedicated Sim Route

- [ ] 9.1 Create page `/gameplay/encounters/[id]/sim.tsx`
- [ ] 9.2 Run-size selector (25/100/500) and "Start" button
- [ ] 9.3 On start, dispatch `useQuickResolve()` and render the
      progress surface
- [ ] 9.4 On completion, render `QuickSimResultPanel` in-place
- [ ] 9.5 "Rerun" button that invokes the mutation again with a fresh
      `baseSeed`

## 10. Empty State

- [ ] 10.1 On the encounter detail page, before any batch runs, the
      summary row shows "No quick resolve data yet" with a "Run Batch"
      CTA button
- [ ] 10.2 CTA dispatches the same `useQuickResolve()` hook with
      default `runs: 100`

## 11. Accessibility

- [ ] 11.1 Win-prob bar is `role="img"` with a descriptive
      `aria-label`
- [ ] 11.2 Turn-count histogram includes a screen-reader-only table
      fallback listing the bucket counts
- [ ] 11.3 Progress bar uses `role="progressbar"` with
      `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] 11.4 All interactive controls (Cancel, Rerun, Copy Seed)
      reachable by keyboard

## 12. Tests

- [ ] 12.1 Unit test: `QuickSimResultPanel` with a fixed
      `IBatchResult` fixture renders expected percentages
- [ ] 12.2 Unit test: Empty-state renders when `totalRuns === 0`
- [ ] 12.3 Unit test: Headline shows "Draw" when `mostLikelyOutcome ===
    "draw"`
- [ ] 12.4 Integration test: Cancel button during a batch triggers the
      abort signal and renders the partial banner
- [ ] 12.5 Visual snapshot test for the full panel + summary variant

## 13. Spec Compliance

- [ ] 13.1 Every delta requirement across `tactical-map-interface` and
      `simulation-system` has at least one GIVEN/WHEN/THEN scenario
- [ ] 13.2 `openspec validate add-quick-sim-result-display --strict`
      passes clean
