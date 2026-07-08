## 1. Component guard (D1)

- [ ] 1.1 In `src/components/campaign/StarmapDisplay.tsx`, change the measurement flow: ignore non-positive `clientWidth`/`clientHeight` (keep last valid size); track whether any valid measurement has occurred and render the container div WITHOUT the Konva `Stage` until it has; `ResizeObserver` keeps observing so the stage mounts on first valid size.
- [ ] 1.2 Verify the fit-view effect (`computeFitView`/`panToInclude`) recomputes on the first valid `stageSize` so the initial paint is fitted (no manual pan needed after deferred mount).
- [ ] 1.3 Regression test (jsdom): mount at 0×0 → no throw, no stage; resize callback to 1200×700 → stage renders at 1200×700. Reuse the existing StarmapDisplay test double approach for Konva (do not pull real canvas into jsdom).
- [ ] 1.4 Confirm the Storybook story still renders (it supplies explicit container size).

## 2. Route layout fix (D2)

- [ ] 2.1 Give the campaign starmap page's display container a definite height (`src/pages/gameplay/campaigns/[id]/starmap.tsx` wrapper): flex column fill of the campaign content area with `flex-1 min-h-0` (Tailwind), consistent with how the tactical map route hosts `hex-map-container`.
- [ ] 2.2 Check sibling campaign tabs for the same zero-height container pattern; fix only if the same wrapper is shared (no drive-by changes).

## 3. Verification

- [ ] 3.1 `npm run typecheck && npm run lint` clean; StarmapDisplay suites pass; full `npm run test:stable` once.
- [ ] 3.2 Live smoke on `npm run dev`: open `/gameplay/campaigns/<id>/starmap` for the 2026-07-07 playtest campaign — map renders, pan/zoom works, no error boundary; screenshot to `.sisyphus/evidence/playtest/`. (May be skipped by the implementing worker; orchestrator runs it.)
