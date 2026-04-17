# Change: Add Quick Sim Result Display

## Why

The Quick Resolve batch runner (`add-quick-resolve-monte-carlo`)
produces an `IBatchResult` that by itself is a blob of numbers. Players
need a visual surface that answers "should I take this fight?" in under
10 seconds — a stacked win-probability bar, a turn-count histogram,
casualty expectations, and a one-line "most likely outcome" summary.
Without this display the Monte Carlo data is invisible. This change
adds the result surface that renders `IBatchResult` on the encounter
detail page and (optionally) in a dedicated `/gameplay/encounters/[id]/sim`
route for deep-linking.

## What Changes

- Add a `QuickSimResultPanel` React component that takes an
  `IBatchResult` and renders:
  - a stacked horizontal bar showing win probabilities (player /
    opponent / draw), with inline percentages
  - a turn-count histogram (bucketed by 2-turn bins) plus mean, median,
    p25, p75, p90 annotations
  - per-side expected-casualty breakdown (mechs destroyed, heat
    shutdowns, per-unit survival rates shown as 0-100% bars)
  - a "Most Likely Outcome" headline summarizing winner + confidence
  - a collapsible "Raw Data" section showing `{totalRuns, erroredRuns,
baseSeed}` for reproducibility
- Add a `QuickSimResultSummary` compact variant for the encounter
  detail page: single row with win-prob bar + headline + "Expand" link
- Add route `/gameplay/encounters/[id]/sim` that runs
  `useQuickResolve()` and renders the full panel on completion
- Progress state: during the batch, render a progress bar + the current
  `runsCompleted / totalRuns` count and a "Cancel" button that triggers
  the `AbortSignal` defined in `add-quick-resolve-monte-carlo`
- Empty-state rendering when `totalRuns === 0`: "Run a batch to see
  outcome distribution" with a CTA button

## Dependencies

- **Requires**: `add-quick-resolve-monte-carlo` (produces the
  `IBatchResult` this change consumes), `tactical-map-interface`
  (existing spec that owns encounter-detail UI surfaces),
  `simulation-system` (progress channel contract)
- **Required By**: none in Phase 2 (this is a leaf display). Phase 3
  campaign integration will reuse the panel when showing "expected
  outcome before contract acceptance".

## Impact

- Affected specs: `tactical-map-interface` (ADDED — Quick Sim result
  panel, summary variant, progress surface, empty state),
  `simulation-system` (MODIFIED — consumer-side contract for the
  progress channel and cancel signal — no new engine behavior, just
  binding surface)
- Affected code: new `src/components/gameplay/QuickSimResultPanel.tsx`,
  new `src/components/gameplay/QuickSimResultSummary.tsx`, new
  `src/components/gameplay/TurnCountHistogram.tsx`, new page
  `src/pages/gameplay/encounters/[id]/sim.tsx`,
  `src/pages/gameplay/encounters/[id]/index.tsx` (extended with summary
  row)
- Non-goals: exporting the result to CSV/PDF (future), persisting the
  result to disk (Phase 3), showing comparative "what if I swap mech X
  for mech Y" (future — would need the comparison surface from
  `add-pre-battle-force-comparison`)
