## Context

`StarmapDisplay` (`src/components/campaign/StarmapDisplay.tsx:42-67`) initializes `stageSize` to 800×600, then an effect measures `containerRef.current.clientWidth/clientHeight` immediately on mount and on every `ResizeObserver` tick. On the campaign starmap route the container measures 0 (zero-height parent), so the react-konva `Stage` gets `width={0} height={0}`; Konva's layer buffer canvas is 0×0 and its internal `drawImage` throws `InvalidStateError`, caught only by the route error boundary. "Try Again" remounts into the same zero-height parent → identical crash (playtest screenshots 38-starmap/39). The playtest confirmed this at a normal 1600×900 viewport, so this is a layout bug on the route, aggravated by the component's lack of a zero-size guard.

## Goals / Non-Goals

**Goals:** starmap tab renders on the campaign route; zero-size measurement can never crash the component; recovery is automatic once size exists.
**Non-Goals:** changing the rendering technology, LOD, or any starmap interaction behavior; hardening other Konva consumers (none measured-to-zero today; a shared hook is follow-up if a second consumer appears).

## Decisions

**D1 — Clamp-and-defer guard in the component (defense), not only a layout fix.**
`updateSize` ignores non-positive measurements: keep the last valid size; if no valid measurement has occurred yet, do not render the `Stage` at all (render the container div only, so the `ResizeObserver` keeps observing and mounts the stage on the first real size). Alternative: `Math.max(1, …)` clamping. Rejected: a 1×1 stage "renders" but produces an invisible map with a working-looking UI — silent failure; deferring until real size is honest and recovers automatically.

**D2 — Fix the route container height at the page wrapper.**
Give the starmap page's display container a definite height (fill the campaign content area via flex column + `min-h-0` + `flex-1`, or viewport-derived height consistent with sibling campaign tabs). The tactical map's `hex-map-container` pattern on the games route is the in-repo reference for a canvas host that always has size. Tailwind v4 utilities; no custom CSS.

**D3 — Regression test at the component level.**
jsdom test: mount with a 0×0 container (mock `clientWidth/clientHeight` = 0) → no throw, no `Stage` in the tree; flip the mocks to 1200×700 and fire the ResizeObserver callback → `Stage` renders with those dimensions. Konva stage itself can be the existing test double used by StarmapDisplay tests/stories if one exists — do not pull real canvas into jsdom.

## Risks / Trade-offs

- [Deferred stage mount could flash empty on slow layouts] → acceptable: empty container ≠ crash; fit-view effect (lines 81-89) already recomputes when `stageSize` changes, so the first paint is correctly fitted.
- [Other routes embedding StarmapDisplay (stories, dashboards) relying on immediate 800×600 default] → guard only replaces the default when measurement is valid; if a consumer never provides size, stage now stays unmounted instead of rendering a default-sized map into a 0-height box (that was already invisible) — verify the Storybook story still renders (it provides explicit size).

## Migration Plan

Component-local change; revert the PR to roll back.

## Open Questions

None.
