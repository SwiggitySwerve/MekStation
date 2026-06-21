# Tasks: Fix Tactical Map Hover Re-Render Cost and Firing-Arc Label Clutter

## 1. Investigation and red-first evidence

- [x] 1.1 Grep every reader of `ITacticalMapHexProjection.isHovered` /
  `isSelected` and of `selectedHex`/`hoveredHex` flowing into
  `buildTacticalMapHexProjectionLookup` (`tacticalMapProjection.ts`,
  `HexMapDisplay.state.tsx`, `HexCell.tsx`); document which presentation derives
  from those fields (e.g. `deriveProjectionIntent` returning `'selected'` at
  `tacticalMapProjection.ts:213,388`) so D1/D2 can re-route them to scalar props
  without dropping behavior.
- [x] 1.2 Write a red-first render-perf probe: mount `HexMapDisplay` with a
  ~1000-hex map, instrument `HexCell` render count, fire a single
  `onMouseEnter` hover change, and assert (failing today) that fewer than N
  cells re-render — proving the whole-board re-render flagged in T-1.
- [x] 1.3 Write a red-first firing-arc probe: render `FiringArcOverlay` for a
  120° arc at range 18-23 and assert (failing today) that the count of
  `firing-arc-*` text-label nodes is bounded — proving the T-3 label wall.

## 2. Decouple hover/selection from the projection lookup (T-1)

- [x] 2.1 Remove `hoveredHex` (and `selectedHex`) from
  `BuildTacticalMapHexProjectionLookupInput` and from
  `buildTacticalMapHexProjectionLookup` / `buildTacticalMapHexProjection`
  (`tacticalMapProjection.ts:142-200`), dropping `isHovered`/`isSelected` from
  the per-hex `ITacticalMapHexProjection` object.
- [x] 2.2 Remove `hoveredHex`/`selectedHex` from the
  `tacticalMapProjectionLookup` `useMemo` dependency array in
  `HexMapDisplay.state.tsx:183-205` so the lookup keeps stable identity across
  mouse-move.
- [x] 2.3 Recompute selection-derived presentation (intent/status that used
  `isSelected`) at the `HexCell` boundary from the existing scalar
  `isSelected`/`isHovered` props (`HexCell.tsx:223-224,326-332`), not from the
  projection object; confirm `HexCell` still receives stable projection props
  for unchanged cells.
- [x] 2.4 Confirm projection-object identity for an unchanged hex is referentially
  equal before and after a pure hover change.

## 3. Bound firing-arc text labels (T-3)

- [x] 3.1 In `FiringArcOverlayComponent` (`FiringArcOverlay.tsx:276-315`) replace
  the per-hex `<ArcTextBadge>` (line 314) with a bounded representative/boundary
  label set — at most a small constant of labels per arc — while keeping the
  per-hex fill `<path>` and `<ArcShape>` on every in-arc hex.
- [x] 3.2 Zoom-gate label visibility: below a configured zoom threshold, suppress
  per-hex arc text labels in favor of the arc legend; keep at least one
  representative label per visible arc above the threshold.
- [x] 3.3 Confirm `classifyFiringArcHexes` output and the arc fill/shape area
  shading are unchanged by the label thinning (no change to arc classification
  or hit-location selection).

## 4. T-2 handoff verification (no edit)

- [x] 4.1 Confirm this change does NOT modify `HexCell.labels.tsx`; note in the PR
  that the `ElevationBadge` gating (T-2) is owned by the active
  `add-topdown-tactical-legibility` change and is intentionally untouched here.

## 5. Tests

- [x] 5.1 Promote the 1.2 probe to a passing render-scope assertion: a pure hover
  change re-renders only the entered + exited cells (not the full board).
- [x] 5.2 Add a projection-identity test: the `tacticalMapProjectionLookup` map
  and each per-hex projection object keep referential identity across a hover
  change (only real projection inputs change identity).
- [x] 5.3 Promote the 1.3 probe to a passing assertion: arc text-label node count
  is bounded for a long-range wide arc, and a snapshot of `classifyFiringArcHexes`
  + arc fill is unchanged versus the pre-change baseline.

## 6. Verification and documentation

- [x] 6.1 Full verification: `npx tsc --noEmit --skipLibCheck`, lint, the affected
  Jest suites (HexMapDisplay/HexCell render-perf, FiringArcOverlay, tactical-map
  projection), and `npx openspec validate fix-tactical-map-perf-and-legibility
  --strict`.
- [x] 6.2 Update `docs/audits/2026-06-12-full-codebase-review.md` (or the
  remediation tracker) marking T-1 and T-3 closed by this change, with T-2
  explicitly handed off to `add-topdown-tactical-legibility`.
