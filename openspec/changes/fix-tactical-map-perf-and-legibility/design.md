# Design: Fix Tactical Map Hover Re-Render Cost and Firing-Arc Label Clutter

## Context

`HexMapDisplay` derives `tacticalMapProjectionLookup` via a `useMemo` whose
dependency array includes `hoveredHex`
(`HexMapDisplay.state.tsx:191,199`). The builder
`buildTacticalMapHexProjectionLookup` (`tacticalMapProjection.ts:142`) loops
every hex and constructs a fresh `ITacticalMapHexProjection` per hex
(`tacticalMapProjection.ts:159-175`), each holding freshly-allocated arrays
(`combatLosBlockerFor`, `blockedReasons`, `sourceReferences`) and per-hex
`isSelected`/`isHovered` booleans. On every mouse-move the memo re-runs, every
hex object gets a new identity, and `HexCell`'s `React.memo` (`HexCell.tsx:272`)
treats all ~1000 cells as changed — the whole board re-renders.

Crucially, `HexCell` already receives `isSelected` and `isHovered` as **separate
scalar props** (`HexCell.tsx:223-224`) and self-compares them in its memo
(lines 326-332). Only two cells change hover state on any given move (the one
the cursor leaves and the one it enters). So baking hover into the projection
objects is redundant work that defeats the memo it was meant to feed.

Separately, `FiringArcOverlay` renders, per in-arc hex, a fill `<path>`, an
`<ArcShape>`, and an `<ArcTextBadge>` text label
(`FiringArcOverlay.tsx:276-315`). At long ranges this produces hundreds of text
labels. The fill/shape are useful area cues; the dense text is the legibility
problem flagged as T-3.

## Decisions

### D1 — Make per-hex projection identity hover-independent

Remove `hoveredHex` and `selectedHex` from `buildTacticalMapHexProjectionLookup`
inputs and from the per-hex `buildTacticalMapHexProjection` object, and remove
`hoveredHex`/`selectedHex` from the `tacticalMapProjectionLookup` memo dependency
array in `HexMapDisplay.state.tsx`. The lookup then changes identity only when a
real projection input changes (terrain, movement range, combat range, path,
legacy attack range) — not on pure hover.

**Rationale:** projection objects are expensive (per-hex array allocations);
they should be derived from rules inputs only. Hover/selection are pure
view-presentation state. Decoupling restores `HexCell.memo`'s purpose: a
mouse-move re-renders only the entered and exited cells via their thin
`isHovered`/`isSelected` scalar props, which the memo already compares. This is
the "decouple hover from the projection lookup" fix named in the audit's T-1
remediation, choosing the variant of "derive isHovered/isSelected as a thin
per-cell prop" because those props already exist on `HexCell`.

### D2 — Hover/selection flow through existing thin per-cell props

`HexCell` keeps `isHovered`/`isSelected` as scalar props computed at the parent
render boundary by comparing each cell's `hex` against `hoveredHex`/`selectedHex`
(referentially stable string/coordinate compares), independent of the projection
object. The `intent`/`status` fields that previously consumed `isSelected`
inside `buildTacticalMapHexProjection` (e.g. `deriveProjectionIntent` returning
`'selected'`, `tacticalMapProjection.ts:213,388`) are recomputed at the cell
boundary from the scalar `isSelected` prop, so the projection object no longer
encodes selection-derived presentation. No new memo layer is introduced — this
reuses the existing prop contract.

**Rationale:** simplest solution that satisfies T-1 — no new component, no new
store slice, no new selector. The board already has the scalar props wired; we
stop overwriting them via the projection object.

### D3 — Thin firing-arc text labels to a bounded representative/legend set

Stop rendering an `<ArcTextBadge>` per in-arc hex. Instead render the arc text
label only on a bounded representative subset per arc — the outer-boundary /
mid-arc hexes — capped at a small constant per arc (the fill+shape still render
on every in-arc hex). Additionally zoom-gate label visibility: below a zoom
threshold, suppress per-hex labels entirely in favor of the existing arc legend.
The arc *classification* (`classifyFiringArcHexes`, `FiringArcOverlay.tsx:262`)
and the per-hex fill/shape are unchanged.

**Rationale:** the fill is the area cue players need; the text is duplicative
once the fill conveys the arc. Bounding the label count keeps the overlay
legible at long range without changing any arc legality or hit-location behavior.

### D4 — T-2 ElevationBadge is a handoff, not a duplicate edit

This change does not touch `HexCell.labels.tsx`. The always-on `ElevationBadge`
(T-2, `HexCell.labels.tsx:359`) is re-baselined into the active
`add-topdown-tactical-legibility` change, whose own design already specifies
gating/anchoring/zoom-scoping the badge. Editing it here would collide with that
change's deltas.

**Rationale:** single-ownership of each file/finding; avoids merge conflict and
double-spec for the same behavior.

## Open Questions

(none)

## Risks

- **Selection-derived presentation regressions.** Moving selection/hover out of
  the projection object risks a cell that previously rendered a "selected"
  intent now rendering plain. Mitigation: the agreement is asserted by a render
  test that the selected cell still shows the selection treatment after D1/D2,
  and that intent/status for non-selected cells is byte-identical to the
  pre-change projection (snapshot of the projection map excluding the
  hover/select fields).
- **Boundary-label heuristic hides a needed label.** Thinning labels could drop
  a label a player relied on. Mitigation: keep the arc legend as the always-on
  reference, ensure at least one label per visible arc, and zoom-gate rather than
  hard-remove so zoomed-in inspection still shows representative labels.
- **Hidden coupling to the removed fields.** Some consumer might read
  `projection.isHovered`/`isSelected` directly. Mitigation: task 1.1 greps all
  readers of those fields before removal and routes them to the scalar props.
