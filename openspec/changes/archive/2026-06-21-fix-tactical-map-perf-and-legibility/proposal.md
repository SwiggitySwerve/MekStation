# Change: Fix Tactical Map Hover Re-Render Cost and Firing-Arc Label Clutter

## Why

Two tactical-map weaknesses surfaced by the 2026-06-12 full codebase review are
covered by no active change, and both regress play on real-sized maps.

- **T-1 (high) — every hover rebuilds the entire per-hex projection map.** The
  `tacticalMapProjectionLookup` memo lists `hoveredHex` in its dependency array
  (`src/components/gameplay/HexMapDisplay/HexMapDisplay.state.tsx:191,199`), so
  every mouse-move re-invokes `buildTacticalMapHexProjectionLookup`
  (`src/utils/gameplay/tacticalMapProjection.ts:142`). That builder loops every
  hex and mints a fresh `ITacticalMapHexProjection` object per hex
  (`tacticalMapProjection.ts:159-175`), each carrying freshly-allocated arrays
  (`combatLosBlockerFor` line 168/249, `blockedReasons` line 249,
  `sourceReferences` line 250) plus per-hex `isSelected`/`isHovered` flags
  (lines 169-170). Because every projection object gets a new identity on each
  hover, `HexCell`'s `React.memo` (`HexCell.tsx:272`) sees changed props for all
  ~1000 cells and the whole board re-renders on every mouse-move — even though
  only the entered and exited hexes actually changed hover state.
  `HexCell` already receives `isSelected`/`isHovered` as thin scalar props
  (`HexCell.tsx:223-224`) and self-compares them in its memo (lines 326-332), so
  the hover state does not need to be baked into the expensive projection
  objects at all.

- **T-3 (high) — `FiringArcOverlay` stamps a label on every in-arc hex.** The
  overlay maps over every classified in-arc hex out to weapon max range and
  renders, per hex, a fill `<path>`, an `<ArcShape>`, and an `<ArcTextBadge>`
  text label (`src/components/gameplay/overlays/FiringArcOverlay.tsx:276,314`).
  A 120° arc at range 18-23 classifies 340-550 hexes, so the map fills with a
  wall of "FRONT"/"L ARC" labels that obscure terrain and tokens. The arc
  *fill* is legitimate area shading; the *per-hex text label* is the clutter.

The `add-topdown-tactical-legibility` change already absorbs T-2 (the
always-on `ElevationBadge` at `HexCell.labels.tsx:359`) and re-baselines its own
"Why" to gate/anchor/zoom-scope that badge; this change does NOT touch the
elevation badge — it is handed off to that change to avoid a double-edit.

## What Changes

- Decouple hover/selection from the per-hex projection lookup: remove
  `hoveredHex` (and `selectedHex`) from `buildTacticalMapHexProjectionLookup`'s
  inputs and from the `tacticalMapProjectionLookup` memo dependency array, so the
  expensive per-hex projection objects keep stable referential identity across
  mouse-move. Hover and selection continue to drive rendering through the
  existing thin per-cell `isHovered`/`isSelected` scalar props that `HexCell`
  already self-compares in its `React.memo`.
- Bound firing-arc labels: render the `<ArcTextBadge>` only on a small
  representative/boundary subset of each arc (or as a single per-arc legend
  entry), not on every in-arc hex, and zoom-gate label visibility so labels are
  suppressed when zoomed out. The arc *fill* and *shape* shading remain on every
  in-arc hex (that is the intended area cue); only the dense text labels are
  thinned.
- Add a hover-stability rendering perf requirement to `tactical-map-interface`
  pinning the invariant that a hover change re-renders only the entered/exited
  cells, not the full board, and that projection objects keep stable identity
  across pure hover changes.
- Add an arc-label-density requirement to `firing-arc-calculation` bounding how
  many text labels an arc overlay may stamp and pinning that arc legality/area
  shading is unchanged by the label thinning.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tactical-map-interface`: gains a hover-stable projection rendering perf
  requirement (T-1) — hover changes must not rebuild per-hex projection objects
  or re-render the whole board.
- `firing-arc-calculation`: gains an arc-label-density requirement (T-3) — the
  arc overlay must bound per-hex text labels while leaving arc classification,
  legality, and area shading unchanged.

## Impact

- `src/components/gameplay/HexMapDisplay/HexMapDisplay.state.tsx` —
  `tacticalMapProjectionLookup` memo: drop `hoveredHex`/`selectedHex` deps; route
  hover/selection through the existing thin per-cell props.
- `src/utils/gameplay/tacticalMapProjection.ts` —
  `buildTacticalMapHexProjectionLookup` / `buildTacticalMapHexProjection`: remove
  `hoveredHex`/`selectedHex` from the build inputs and from the per-hex object so
  projection identity is hover-independent.
- `src/components/gameplay/HexMapDisplay/HexCell.tsx` — confirm/keep
  `isHovered`/`isSelected` as memo-compared scalar props that no longer derive
  from the projection object.
- `src/components/gameplay/overlays/FiringArcOverlay.tsx` — thin the
  `<ArcTextBadge>` render (line 314) to a boundary/representative set or legend;
  zoom-gate label visibility.
- New/updated render perf tests asserting hover re-render scope and projection
  object identity stability; new firing-arc render test asserting label count
  is bounded and arc classification is unchanged.

## Non-goals

- No change to `ElevationBadge` gating/anchoring/zoom behavior — owned by the
  active `add-topdown-tactical-legibility` change (T-2 handoff). This change must
  not edit `HexCell.labels.tsx`.
- No change to firing-arc *classification* math, arc legality, hit-location
  selection, or the arc *fill/shape* area shading — only the dense per-hex text
  labels are thinned.
- No change to movement/combat projection content or the preview↔commit
  agreement contract (owned by `fix-tactical-projection-agreement-gaps`).
- No new projection layer, façade, or rendering backend (SVG stays).
