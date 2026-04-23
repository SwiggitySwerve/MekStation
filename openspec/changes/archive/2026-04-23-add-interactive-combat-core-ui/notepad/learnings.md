# Learnings — add-interactive-combat-core-ui

## [2026-04-18] Existing surface

- Combat page already renders `GameplayLayout` (top `PhaseBanner`, split map/record-sheet, `ActionBar`, bottom `EventLogDisplay`). The remaining tasks are polish on top of this frame — not a rewrite.
- `RecordSheetDisplay` already renders armor, heat, weapons, pilot + wounds (6 pips, unconscious state) via `RecordSheetPanels`. Action-panel work reuses this component and extends it — it IS the Phase 1 record-sheet surface.
- `useGameplayStore` already exposes `useSelectedUnit()` projection (task 2.4 done) — combine with `selectUnit` to clear on empty-hex click.
- Store also exposes `selectUnit(null)` for clearing.
- `handleTokenClick(null)` is already wired to clear in `[id].tsx:88`. Missing: empty-hex click clearing.

## Side colors (from constants/hexMap.ts)

- `GameSide.Player` = `#3b82f6` (blue-500) = `text-blue-500` / `bg-blue-500`
- `GameSide.Opponent` = `#ef4444` (red-500) = `text-red-500` / `bg-red-500`

## Weapon status

- `IWeaponStatus` has `destroyed: boolean`, `ammoRemaining?: number`, `firedThisTurn: boolean`.
- NO `jammed` field currently; jammed weapons live on `IUnitGameState.jammedWeapons: readonly string[]`.
- `AmmoCounter` component exists but is heavy (full fire/reload UI). For inline record-sheet ammo, use a compact new `<InlineAmmoCounter>` or extend `WeaponRow` directly. Per convention: REUSE component when possible — we'll wrap `AmmoCounter`'s visual shell minimally via a new thin component matching its idiom (simple display, no Fire/Reload buttons).

## SPA projection

- `IGameUnit` has no SPA field; pilot lookup is via `pilotRef` only.
- For Phase 1 scope we project SPAs via a new `pilotSpas: Record<unitId, ReadonlyArray<{ id: string; displayLabel: string; description: string }>>` prop pattern (same shape as `pilotNames`). Demo fixture seeds some. Empty list → "No SPAs" placeholder per task 8.3.

## Responsive drawer

- Tailwind convention already used: `md:` (768px), `lg:` (1024px). Task 1.3 targets `< 1024px`, so `lg:` breakpoint.
- Record-sheet panel becomes a slide-in drawer below `lg`. Toggle button lives next to PhaseBanner turn indicator.

## Test patterns

- Smoke tests in `src/components/gameplay/__tests__/` named `add<ChangeName>.smoke.test.tsx`.
- Tests use `@testing-library/react`, synthetic `IGameSession`, and mock the router via `jest.mock('next/router', ...)`.
- Jest `resizeTo` / `matchMedia` mock pattern: use `window.innerWidth =` + `fireEvent(window, new Event('resize'))`.

## File convention

- ~300 LOC max per file. Split `ActionPanel` if it grows beyond that (sub-panels for armor/heat/weapons/SPAs already exist via `RecordSheetPanels`).

## Event log entry wording (task 11.3)

- Existing `EventLogDisplay.formatEvent()` already produces one-line human summaries for all event types, but most entries currently render only `text` (no explicit phase label) and some (HeatDissipated, MovementDeclared) render "Unit moved" without designation.
- Task 11.3 requires: phase + actor (unit designation when applicable) + one-line summary on EVERY entry. Fix: extend EventRow to display phase name + a resolved actor designation via an `actorLookup: Record<unitId, designation>` prop.
