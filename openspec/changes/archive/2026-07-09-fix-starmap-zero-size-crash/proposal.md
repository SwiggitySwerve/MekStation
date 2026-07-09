## Why

The campaign Starmap tab crashes into the route error boundary with `Failed to execute 'drawImage' on 'CanvasRenderingContext2D': The image argument is a canvas element with a width or height of 0`, and "Try Again" re-crashes identically — the tab is dead (2026-07-07 live playtest, finding C5). `StarmapDisplay` replaces its 800×600 default stage size with the container's measured `clientWidth`/`clientHeight` on mount; when the campaign route's container has zero height (or is measured before layout), the react-konva stage renders 0×0 and Konva's internal buffer-canvas `drawImage` throws.

## What Changes

- `StarmapDisplay` never renders the Konva stage at a non-positive size: zero/negative measurements keep the previous valid size (or defer stage mount until the first valid measurement) while the `ResizeObserver` keeps watching, so the map appears as soon as layout provides real dimensions — making the error boundary's "Try Again" (and plain waiting) actually recover.
- The campaign starmap route wrapper gives the display container a guaranteed non-zero height (flex/viewport-based), fixing the underlying zero-height layout on `/gameplay/campaigns/[id]/starmap`.
- A regression test covers the zero-size mount sequence (mount at 0×0 → no throw → resize to real dimensions → stage renders).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `starmap-interface`: "Canvas-Based Rendering" — rendering SHALL be resilient to zero-size measurement: no draw attempt at non-positive stage dimensions, automatic recovery when the container gains size.

## Impact

- `src/components/campaign/StarmapDisplay.tsx` (stage-size guard, lines 42-67 measurement effect), the campaign starmap page wrapper (`src/pages/gameplay/campaigns/[id]/starmap.tsx` container height), component test alongside existing StarmapDisplay tests/stories.
- No engine, store, or API changes. Non-goals: starmap feature work (lenses, logistics), the error-boundary component itself.
