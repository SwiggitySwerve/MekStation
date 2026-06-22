# Tasks: Add Top-Down Tactical Legibility

## 1. Elevation badge layer

- [x] 1.1 Refine the existing elevation badge render path in `HexCell` (corner-anchored SVG text inside the existing hex group), fed by the hex's terrain elevation, skipping elevation-0 hexes, signed formatting via `formatElevationLabel`.
- [x] 1.2 Add `showElevationBadges` to the map interaction store following the existing overlay-toggle shape (default ON in top-down, ignored in isometric), persisted like the other overlay toggles.
- [x] 1.3 Implement the zoom readability threshold: hide the badge layer below the cutoff via the existing zoom state; restore on zoom-in without re-toggle.
- [x] 1.4 Enforce collision priority (unit token > MP cost text > badge) at the fixed anchor; verify against Storybook stress states with tokens + overlays + badges on one hex.

## 2. Non-color overlay encodings

- [x] 2.1 Add the blocked-tile cross-hatch pattern + blocked glyph to the shared SVG `<defs>` and reference it from blocked movement tiles (alongside the existing dark gray tint), visually distinct from the jump diagonal pattern.
- [x] 2.2 Add the run-only dashed-border encoding distinguishing run tiles from walk tiles without hue.
- [x] 2.3 Update the overlay legend to document the non-color encodings alongside the palette colors.

## 3. Tests and stories

- [x] 3.1 Unit tests: badge renders signed values on non-zero hexes, no badge at elevation 0, toggle off removes badges, zoom threshold hides/restores the layer, badge data source equals the projection's hex terrain object.
- [x] 3.2 Unit tests: blocked tiles render the cross-hatch encoding, run-only tiles render the dashed border, legend lists both.
- [x] 3.3 Storybook stories for badge-dense boards (negative elevations, water depths) and encoding combinations; update tactical-map visual smoke baselines.

## 4. Verification

- [x] 4.1 `npx tsc --noEmit --skipLibCheck`, lint, affected Jest suites, Storybook build, and visual smoke green; `npx openspec validate add-topdown-tactical-legibility --strict`.
- [x] 4.2 Manual dev-browser pass on a 30x34 map: badges readable at default zoom, no perf regression on pan/zoom (compare against the W5 occlusion-sweep baseline behavior).
