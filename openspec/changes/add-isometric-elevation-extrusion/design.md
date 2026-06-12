# Design: Add Isometric Elevation Extrusion

## Context

Isometric mode is a presentation transform over the same axial battlefield state: a single CSS/SVG matrix (`projection.ts` — shear+rotate, rotate-before-shear ordering fixed in audit W2 C-15) with discrete rotation steps 0–5, scene assembly and depth ordering in `buildIsometricSceneItems` / `isometricDepthKey` (`HexMapDisplay.isometric.ts`), occlusion ghosting via the single occlusion sweep (W5.1 perf shape), and `centerOn` corrected for the isometric transform (W5.1). Elevated hexes currently render as flat tiles at an offset — height is only readable through labels and occlusion side effects.

## Goals / Non-Goals

**Goals:**
- Elevated hexes read as solid stacked terrain: visible extrusion skirts proportional to elevation, correctly depth-ordered at every rotation step.
- Shipped rotation behavior captured as camera-controls requirements with tests, including the player-facing control surface.
- No change to occluder semantics, hit-testing targets, or projection data.

**Non-Goals:**
- WebGL/three.js substrate change; continuous rotation; lighting/shading models beyond a flat face tint.
- Top-down rendering changes.

## Decisions

**D1 — Extrusion = per-hex skirt polygons generated in the isometric scene builder, not a transform change.**
For each hex with elevation > 0, `buildIsometricSceneItems` emits 1–2 visible side-face polygons (the faces toward the camera for the current rotation step) beneath the existing top face, with height `elevation × ISO_ELEVATION_UNIT` (the same vertical offset constant the top-face placement already uses). Faces get a darkened terrain tint (flat shading, two fixed luminance steps for the two visible faces). Alternative — CSS 3D transforms per hex: rejected, breaks the single-matrix model and the existing depth-sort assumptions. Alternative — one merged silhouette path per elevation plateau: rejected for v1 (harder invalidation, marginal node savings); revisit if node count hurts.

**D2 — Depth ordering reuses `isometricDepthKey` with a face-rank tiebreaker.**
Skirt faces sort with their owner hex's depth key, ranked immediately before the hex top face so tops always paint over their own skirts; unit tokens keep their existing ordering relative to hex tops. Camera-facing face selection is a pure function of rotation step (six-case lookup), unit-tested per step. This keeps the painter's algorithm intact — no z-buffer emulation.

**D3 — Occlusion semantics unchanged; extrusion is visual only.**
The occlusion sweep continues to operate on hex elevation data, not on rendered skirt geometry. Skirts never register as hover/hit targets (pointer-events none); occluder highlights and hover explanations keep their current metadata contract. This honors the existing "Isometric Occluder Hex Highlights" / "Isometric Occluder Hover Explanations" requirements without deltas.

**D4 — Rotation retro-spec: camera-controls gains an ADDED requirement; control surface verified first.**
The shipped behavior (six discrete headings, scene depth re-sort per step, centerOn preservation, reduced-motion) becomes a camera-controls requirement. Task order verifies whether a player-facing rotation control (button/hotkey) exists; if absent, this change adds it next to the existing camera controls (zoom/fit) using the same interaction-store pattern. UNVERIFIED at authoring time: presence of a rotation hotkey/button — the requirement is written against behavior, with the control surface as a scenario.

**D5 — Rotation transition animation is a stretch task, gated on reduced motion.**
A short interpolated transform transition between steps, fully disabled under `prefers-reduced-motion` (consistent with "Reduced Motion Disables Camera Easing"). Lands only if it doesn't complicate the matrix path; otherwise dropped without affecting the change's finish line.

## Risks / Trade-offs

- [Node count grows by ~1–2 polygons per elevated hex; large mountainous maps could slow pan/zoom] → Skirts only for elevation > 0 (most hexes flat); polygons memoized with the same referential-stability patterns as HexCell (W5); visual smoke + existing perf budgets gate the PR.
- [Skirts visually colliding with badge/labels or unit tokens at low elevations] → Tops always paint over own skirts (D2); Storybook stress states for adjacent cliffs, units in pits, and rotation cycles.
- [Face-selection bugs at specific rotation steps produce "floating" tiles] → Per-step unit tests assert the visible-face lookup for all six steps; full-rotation-cycle test extends the existing "Full rotation cycle restores original occluder state" coverage.
- [Retro-spec reveals the rotation control surface never shipped player-facing] → That gap becomes an in-scope task (D4) rather than a surprise; scope is one control + hotkey, consistent with existing camera-controls patterns.

## Migration Plan

Single PR, UI-only. Rollback = revert. Storybook + visual smoke baselines updated in the same PR.

## Open Questions

- Whether a player-facing rotation control already exists (resolved by task 1.1; determines whether task 3.2 is verification or implementation).
