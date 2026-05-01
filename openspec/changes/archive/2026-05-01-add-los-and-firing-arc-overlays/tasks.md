# Tasks: Add LOS and Firing Arc Overlays

## 1. Arc Classifier Utility

- [x] 1.1 Create `src/utils/overlays/arcClassifier.ts`
- [x] 1.2 Given a unit (position + facing) and a hex, return
      `front | left-side | right-side | rear | out-of-arc`
- [x] 1.3 Front is the 60-degree wedge centered on facing
- [x] 1.4 Sides are the adjacent 60-degree wedges
- [x] 1.5 Rear is the 180-degree wedge opposite front (TechManual p.109)
- [x] 1.6 Unit tests for every facing x target direction permutation

## 2. LOS Classifier Utility

- [x] 2.1 Create `src/utils/overlays/losClassifier.ts`
- [x] 2.2 Given origin and target hexes, return
      `{ state: 'clear' | 'partial' | 'blocked', blockers: HexCoord[] }`
- [x] 2.3 Use existing engine LOS logic (do not reimplement)
- [x] 2.4 Partial: at least one hex adds cover but does not fully occlude
- [x] 2.5 Blocked: at least one hex fully occludes
- [x] 2.6 Unit tests across clear / woods / building / elevation cases

## 3. FiringArcOverlay Component

- [x] 3.1 Create
      `src/components/gameplay/overlays/FiringArcOverlay.tsx`
- [x] 3.2 Subscribes to the selected unit ID from `useGameplayStore`
- [x] 3.3 For each hex in the unit's maximum weapon range, shade per
      arc classifier output
- [x] 3.4 Colors: front = green 25% alpha, sides = yellow 20% alpha,
      rear = red-pink 25% alpha
- [x] 3.5 Hexes out-of-arc render no shading
- [x] 3.6 Overlay renders beneath units, above terrain

## 4. LineOfSightOverlay Component

- [x] 4.1 Create
      `src/components/gameplay/overlays/LineOfSightOverlay.tsx`
- [x] 4.2 Subscribes to hover state (hovered hex ID)
- [x] 4.3 Draws a line from selected unit to hovered hex
- [x] 4.4 Clear state: solid green line, 2px
- [x] 4.5 Partial state: dashed yellow line, 2px
- [x] 4.6 Blocked state: solid red line, 2px, terminating at first
      blocker
- [x] 4.7 Annotate blocking hexes with a small icon (cover / wall /
      woods)
- [x] 4.8 Overlay renders above firing arc, below effect layers

## 5. Overlay Toggles

- [x] 5.1 Arcs render only when a friendly unit is selected
- [x] 5.2 Arcs hide during movement interpolation animations
- [x] 5.3 LOS line renders only when a hex is hovered (not selected)
- [x] 5.4 LOS line hides on click (commits attack path elsewhere)
- [x] 5.5 User toggle in settings to disable arcs (hotkey: A)
- [x] 5.6 User toggle in settings to disable LOS (hotkey: L)

## 6. Range Filtering

- [x] 6.1 Arcs shade only hexes within the unit's maximum weapon range
- [x] 6.2 Weapon list comes from the unit's configured equipment
- [x] 6.3 If the unit has zero operational weapons, only the rear-arc
      shading renders (purely informational)
- [x] 6.4 Unit tests for range inclusion at the edge of short/medium/
      long bands

## 7. Blocker Annotations

- [x] 7.1 Partial-cover hexes annotate the blocker with a "cover" icon
- [x] 7.2 Blocked hexes annotate the first blocker with a "wall" icon
- [x] 7.3 Annotations use `<title>` SVG elements for screen readers
- [x] 7.4 Annotations fade in/out with the LOS line

## 8. Accessibility

- [x] 8.1 Arc shading uses shape overlay (front = up-arrow chevron,
      sides = dot, rear = minus) in addition to color for colorblind
- [x] 8.2 LOS states announce via `aria-live` on hex hover change
- [x] 8.3 Hotkeys (A, L) documented and announced on first use

## 9. Performance

- [x] 9.1 Arc classification memoizes per (unit, facing)
- [x] 9.2 LOS classification memoizes per (unit, target) for the
      current turn
- [x] 9.3 Overlay re-renders only on selection or hover change
- [x] 9.4 Budget: arc overlay paints within 4ms on a 30x30 map

## 10. Tests

- [x] 10.1 Unit test: arc classifier returns `front` for hexes in the
      front wedge across all six facings
- [x] 10.2 Unit test: LOS classifier correctly flags blocked through a
      building
- [x] 10.3 Unit test: partial cover through light woods returns
      `partial`
- [x] 10.4 Integration test: selecting a unit renders arc shading;
      hovering an in-range hex renders a green LOS line
- [x] 10.5 Integration test: hovering a hex behind a wall renders a
      red LOS line terminating at the wall

## 11. Spec Compliance

- [x] 11.1 Every requirement in `line-of-sight-visualization` spec has a
      GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `firing-arc-calculation` delta has a
      scenario
- [x] 11.3 Every requirement in `tactical-map-interface` delta has a
      scenario
- [x] 11.4 `openspec validate add-los-and-firing-arc-overlays --strict`
      passes clean
