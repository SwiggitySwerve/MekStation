# Tasks: Add Minimap and Camera Controls

## 1. Camera Controls Hook

- [ ] 1.1 Extend `useMapInteraction.ts` with explicit pan / zoom / focus
      actions: `panBy(dx, dy)`, `zoomTo(scale, cursorPoint)`,
      `centerOn(hexCoord)`
- [ ] 1.2 Zoom-to-cursor: anchor the zoom so the hex under the cursor
      stays beneath the cursor
- [ ] 1.3 Clamp zoom to [0.3, 2.0]
- [ ] 1.4 Create a thin facade hook `src/hooks/useCameraControls.ts`
      exposing the same surface with testable pure state

## 2. Mouse Controls

- [ ] 2.1 Click-drag on an empty (non-unit, non-minimap) hex pans the
      camera
- [ ] 2.2 Scroll wheel zooms with cursor anchor
- [ ] 2.3 Double-click on a unit token calls `centerOn(unit.position)`
      and selects the unit
- [ ] 2.4 Middle-mouse drag also pans (alternate for laptop trackpads)

## 3. Keyboard Shortcuts

- [ ] 3.1 W/A/S/D (or arrow keys) pan by one hex worth of pixels
- [ ] 3.2 `+` / `-` zoom in / out by 10% per keystroke
- [ ] 3.3 Space recenters on the selected unit (no-op if none selected)
- [ ] 3.4 M toggles minimap visibility
- [ ] 3.5 A toggles firing arcs (defined in overlays change)
- [ ] 3.6 L toggles LOS line (defined in overlays change)
- [ ] 3.7 ? opens the hotkey help overlay
- [ ] 3.8 Esc closes modal overlays and clears hover state

## 4. Minimap Component

- [ ] 4.1 Create `src/components/gameplay/minimap/Minimap.tsx`
- [ ] 4.2 Fixed position top-right, 200x200 px with 12px margin
- [ ] 4.3 Renders a simplified terrain color palette per hex
- [ ] 4.4 Renders unit dots sized by weight class, colored by side
- [ ] 4.5 Renders current camera viewport as a bordered rectangle
- [ ] 4.6 Opaque backdrop with subtle drop shadow for legibility

## 5. Minimap Interactions

- [ ] 5.1 Click on the minimap centers the main camera on that point
- [ ] 5.2 Drag on the minimap (on the viewport rectangle) pans the
      main camera continuously
- [ ] 5.3 Minimap does NOT zoom (minimap scale is fixed)
- [ ] 5.4 Hovering a unit dot on the minimap shows a tooltip with the
      unit name

## 6. Hotkey Help Overlay

- [ ] 6.1 Create `src/components/gameplay/help/HotkeyHelpOverlay.tsx`
- [ ] 6.2 Opens on `?` keypress; closes on Esc or ? again
- [ ] 6.3 Lists all hotkeys grouped: Camera (WASD, +/-, Space),
      Overlays (A, L, M), Combat (1-5 weapon slots if defined
      elsewhere), Help (?)
- [ ] 6.4 First-time open flag is set once opened so new users see a
      subtle prompt on session start

## 7. Unit Focus

- [ ] 7.1 Double-click on a unit token pans + zooms so the unit sits
      in the viewport center
- [ ] 7.2 If zoom is below 0.6, bump to 0.8 before centering (so the
      unit is legible post-focus)
- [ ] 7.3 Center animation eases over 200ms
- [ ] 7.4 Selection state is set to the focused unit

## 8. Accessibility

- [ ] 8.1 All hotkeys documented in the help overlay
- [ ] 8.2 Minimap has `role="region"` with an `aria-label` describing it
- [ ] 8.3 Unit dots include `<title>` SVG elements for screen readers
- [ ] 8.4 Hotkeys avoid collisions with screen-reader navigation keys
- [ ] 8.5 Reduced motion disables the center-on-focus easing

## 9. Performance

- [ ] 9.1 Minimap renders at 15 FPS max (RAF-throttled)
- [ ] 9.2 Dot positions re-read from state only on unit move events
- [ ] 9.3 Viewport rectangle re-renders on camera change only
- [ ] 9.4 Minimap terrain baked once per map load, cached

## 10. Tests

- [ ] 10.1 Unit test: `zoomTo(scale, cursorPoint)` keeps hex under
      cursor stable within 1px
- [ ] 10.2 Unit test: `centerOn(hex)` puts the hex at viewport center
- [ ] 10.3 Unit test: pan clamps to map bounds (camera cannot leave the
      map)
- [ ] 10.4 Unit test: WASD keybinds each pan by the expected pixel
      amount
- [ ] 10.5 Integration test: double-click unit -> camera centers on
      it, selection updates
- [ ] 10.6 Integration test: minimap click -> camera pans
- [ ] 10.7 Integration test: ? opens help overlay; Esc closes it

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `camera-controls` spec has a
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `tactical-map-interface` delta has a
      scenario
- [ ] 11.3 `openspec validate add-minimap-and-camera-controls --strict`
      passes clean
