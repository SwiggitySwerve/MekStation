# Proof worker — equipment catalog density

## Baseline (production `http://localhost:3611`, isolated Playwright Chromium)

- Viewport 1318×912, ephemeral context, no user profile, no unit/DB writes.
- Atlas AS7-D → Equipment tab.
- Ordinary row height: **70px** (n=12).
- Header vs row column center drift: **max |dx| = 13px** (not within 2px).
- Document overflow: none.
- Collapsed rows showed both Add and Add + place.
- Evidence: `baseline-desktop-1318x912.png`, `baseline-catalog-clip-1318x912.png`, `baseline-metrics.json`.
- Recapture: `node ../2026-09-16-evidence-distilled/equipment-density-20260910.md (formerly .sisyphus/equipment-density-20260910/proof-worker/capture-baseline.cjs)`

## Owned tests

| File                                                                          | Change                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `e2e/customizer-equipment-catalog.spec.ts`                                    | Expand Small Laser details before Add and place (incl. after reload). Density/alignment @ 1318×912 and 390×844. |
| `src/components/customizer/equipment/__tests__/EquipmentCatalogCard.test.tsx` | Collapsed Add `<name>` only; expanded Add and place; readOnly disables.                                         |
| `src/__tests__/components/customizer/equipment/EquipmentBrowser.test.tsx`     | Addition uses `getByRole('button', { name: 'Add Medium Laser' })`.                                              |

`expectColumnsAligned` still checks `data-catalog-column` box centers (header vs row, ≤2px), then first `span` of name/weight/criticalSlots sort cells (not the full button box) vs that cell and vs the row cell, ≤2px.

Wide workspace at 1318 is required: visible → press → `aria-pressed=true` → geometry + `density-desktop-wide.png` → press back → `aria-pressed=false` → geometry. Sidebar-open proof (`density-desktop-sidebar.png` + first-pass alignment) is unchanged.

## Unit results

```
node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath \
  src/__tests__/components/customizer/equipment/EquipmentBrowser.test.tsx \
  src/components/customizer/equipment/__tests__/EquipmentCatalogCard.test.tsx
```

**2 suites, 17 tests, pass.** EquipmentCatalogCard 3/3; EquipmentBrowser addition uses accessible Add Medium Laser.

## Typecheck correction

Removed `exact: true` from `getByRole('button', { name: 'Add Medium Laser' })` in `EquipmentBrowser.test.tsx`. Testing Library `ByRoleOptions` has no `exact`; string `name` is already exact. Callback assertion unchanged. Parent re-runs typecheck and focused tests.

## Browser coverage — pending parent rebuild

Did not run Playwright against the old 3611 build. Parent runs the four flows after production rebuild:

```
npx playwright test e2e/customizer-equipment-catalog.spec.ts --project=chromium
```

Screenshots go to `testInfo.outputPath`: electronics-desktop, catalog-desktop, placement-mobile, catalog-mobile, density-desktop-sidebar, density-desktop-scrolled, density-desktop-wide, density-mobile.
