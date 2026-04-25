# add-per-type-armor-diagrams — Decisions Notepad

Cross-task wisdom log. Each apply session appends a heading at the top.

# 2026-04-25 apply

## Status

- 46/46 tasks marked `[x]`. 6 of those are DEFERRED with explicit pickup pointers:
  - 3.9, 4.6, 5.6, 6.6, 7.6 → Storybook stories (single PR #333 will batch all 5)
  - 6.5 → infantry XP/morale (blocked on add-infantry-construction surfacing the fields on `useInfantryStore`)

## Implementation Notes

### `ArmorAllocationInput` primitive (task 1.3)

- New file `src/components/customizer/armor/ArmorAllocationInput.tsx`.
- Centralises clamp + ARIA + `data-armor-group` arrow-key navigation.
- Accepts a `groupId` prop. When set, `ArrowRight` at end-of-value and
  `ArrowLeft` at start-of-value hop focus to the next/previous input that
  shares the same `data-armor-group` attribute. Used by Vehicle, Aerospace,
  and ProtoMech diagrams.
- Test coverage: `src/components/customizer/armor/__tests__/ArmorAllocationInput.test.tsx`.

### Chin turret (task 3.5)

- The vehicle store has no dedicated `chinTurret` field; `TurretType.CHIN`
  exists in `VehicleInterfaces.ts` though.
- The diagram detects `turret.type === TurretType.CHIN` and:
  - Relabels the turret slot to "Chin Turret".
  - Renders a small forward-mounted ring (cy=55) instead of the normal
    centred turret ring (cy=110).
- Armor still routes through `VehicleLocation.TURRET` until
  add-vehicle-construction promotes a separate `CHIN_TURRET` enum value.

### Aerospace per-arc cap (task 4.4)

- Old `getArcMax` used a static `tonnage * 0.8` total — wrong for ferro and
  ignored small-craft cap rules.
- New helper:
  - `pointsPerTon = getArmorDefinition(armorType).pointsPerTon ?? 16`
  - `cap = subType === SMALL_CRAFT ? tonnage * 16 : tonnage * 8`
  - `total = min(armorTonnage * pointsPerTon, cap)`
  - `arcMax = floor(total * arcShare)` where shares are 0.35/0.25/0.25/0.15
- Mirrors the store's `autoAllocateArmor` shares so caps and auto-allocation
  agree to the integer.

### Aerospace auto-allocate (task 4.5)

- The store already implements `autoAllocateArmor` with the correct shares
  and pts/ton lookup. The diagram simply exposes a button that delegates,
  with the same `confirm(...)` gate the vehicle diagram uses.

### ProtoMech weight-table caps (task 7.5)

- Replaced the simplified `tonnage / 5` heuristic with the canonical TM
  Companion p.196 table: TORSO_MAX_BY_TON, ARM_MAX_BY_TON, LEGS_MAX_BY_TON,
  MAIN_GUN_MAX_BY_TON for tonnages 2–9.
- Heavy ProtoMech rule (10t+): head cap doubles to 4, other locations
  extrapolate at +3/ton beyond the 9-ton row.
- `lookupByTon` clamps gracefully outside the standard range to avoid a
  crash on prototype/non-canonical tonnage values.

### Placeholder re-exports (task 8.2)

- `VehicleDiagram.tsx`, `AerospaceDiagram.tsx`, `BattleArmorDiagram.tsx`
  were full pre-Wave 4 placeholder implementations. The customizer overview
  sidebars (`VehicleCustomizer.tsx`, `AerospaceCustomizer.tsx`,
  `BattleArmorCustomizer.tsx`) still import them by their legacy names.
- Each was rewritten as a ~30-line `@deprecated` thin wrapper that renders
  the new component (`VehicleArmorDiagram`, `AerospaceArmorDiagram`,
  `BattleArmorPipGrid`). This deletes ~700 lines of duplicate SVG and
  routes the sidebars to the canonical diagram.
- `compact` props on the wrappers are accepted but ignored — the new
  diagrams are responsive, so the prop is no longer meaningful.

### Keyboard navigation (task 9.2)

- Implemented inside `ArmorAllocationInput` — see "Implementation Notes >
  ArmorAllocationInput primitive" above.
- Distinct `groupId`s prevent cross-diagram focus jumps when multiple
  customizers are mounted simultaneously (e.g. tab-switching panes that
  keep DOM around).

### Auto-allocate confirm (task 9.3)

- Identical pattern in both Vehicle and Aerospace diagrams:
  ```ts
  const hasNonDefaultArmor = useMemo(
    () => Object.values(armorAllocation).some((v) => (v ?? 0) > 0),
    [armorAllocation],
  );
  ```
- `window.confirm(...)` is gated by `typeof window !== 'undefined'` so
  server-side rendering and jest-jsdom both work without throwing.
- Prompt copy: `"Auto-allocate will overwrite your current armor distribution. Continue?"`

## DEFERRED Pickups

| Task | Pickup | Blocker |
|------|--------|---------|
| 3.9  | PR #333 — Storybook bring-up | Storybook config not yet wired in repo (Wave 5) |
| 4.6  | PR #333 — Storybook bring-up | same |
| 5.6  | PR #333 — Storybook bring-up | same |
| 6.5  | add-infantry-construction → render XP/morale lines | `useInfantryStore` lacks `experience` / `morale` fields |
| 6.6  | PR #333 — Storybook bring-up | same |
| 7.6  | PR #333 — Storybook bring-up | same |

## Conventions To Preserve

- Use `data-armor-group` (not `data-armor-input`) for the focus-group
  attribute. Tests assert this name.
- Diagram components must remain pure render given store state; never
  call `setLocationArmor` / `setArcArmor` outside of explicit user
  interaction handlers.
- `ArmorLocationBlock` always wraps `ArmorPipRow` for the visual strip;
  do not call `ArmorPipRow` directly from per-type diagrams (route
  through `ArmorLocationBlock` so visual consistency is maintained per
  the "Shared Armor Pip Primitive" requirement).
- For vehicles & aerospace, the auto-allocate button MUST gate the call
  on `hasNonDefaultArmor` to avoid wiping a user's manual layout.
