# Clear cancelled tactical map gestures

## Why

A cancelled touch leaves the map's pan or pinch bookkeeping active, so later touch moves can continue a gesture that the browser cancelled.

## What Changes

- Route SVG touch cancellation through the existing touch-end cleanup.
- Verify cancelled pan, pinch, and rotation gestures stop and fresh gestures still work.

## Impact

- Affected spec: `tactical-map-interface`.
- Affected code: `HexMapDisplay` and its camera interaction tests.
- Reuses the existing gesture owner without changing camera math or domain rules.

## Non-goals

No changes to tactical shell orchestration, customizer gestures, gameplay events, persistence, technology availability, or tech bases.
