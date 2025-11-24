---
title: Operations, Workflow & Testing Guide
description: Day-to-day practices for working on the mech customizer & mech lab codebases.
---

## 1. Development Workflow

### Branching & Commits
- Work on feature branches (e.g., `feature/<topic>`). Keep commits small and grouped (lint/config vs feature changes).
- Use descriptive messages (e.g., `feat: add armor allocation editor`, `chore: tighten lint rules`).

### Linting & Type Safety
- Run `npm run lint` (maps to `eslint --max-warnings=0 --ext .ts,.tsx src`) before pushing.
- Do **not** introduce `any` or legacy type aliases; rely on the concrete interfaces in `src/features/mech-lab/store/MechLabState.ts` and mechanics modules.
- Legacy type definitions remain archived in `docs-old`; never import them into the current codebase.

### Testing
- Jest suites:
  - `npx jest src/features/mech-customizer/store/useCustomizerStore.test.ts`
  - `npx jest src/mechanics/__tests__/CriticalSlotMechanics.test.ts`
- Add tests whenever you extend store actions, reset flows, or mechanics calculations.
- For UI changes, at minimum run lint + relevant Jest suites; E2E/manual steps are outlined below.

## 2. Manual Validation Checklist

> Adapted from `docs-old/testing/customizer-validation-checklist.md` (see `docs-old/testing` for full history).

1. **Load & Tabs**
   - Navigate to `/customizer`, verify Overview loads with metrics.
   - Click through Structure/Armor/Equipment/Criticals/Fluff tabs; ensure localStorage preserves active tab across refresh.
2. **Equipment Tray & Debug**
   - Toggle tray open/closed; add/remove equipment and confirm list updates.
   - Open debug panel and inspect JSON to ensure state reflects changes.
3. **Structure & Armor**
   - Change tonnage, structure type, engine type; confirm top stats banner updates weight/validation.
   - Edit armor allocation values (front/rear) and verify totals update with warnings when exceeding caps.
4. **Critical Slots**
   - Assign equipment to torso/arm slots using PaperDoll; unassign to free slots.
   - Confirm slot usage in the banner matches manual assignments.
5. **Reset Scenarios**
   - Equipment-only reset clears gear but leaves configuration intact.
   - Configuration reset reverts structure/armor/heat sink selections but keeps equipment.
   - Full reset returns to default chassis metadata + blank armor allocation/fluff notes.
6. **Export**
   - Use Export panel to download JSON; spot-check tonnage, components, armor allocation, fluff notes.

## 3. Troubleshooting & Common Issues

| Issue                                      | Resolution                                                                 |
|--------------------------------------------|----------------------------------------------------------------------------|
| Lint complains about `.eslintrc.js`        | Ensure lint only runs against `src/`; `.eslintrc.js` is ignored via config. |
| Next lint CLI error                        | We run plain `eslint` instead; ignore Next CLI `--dir` errors.             |
| Missing type errors when editing docs      | Check references point to `src/…` modules; avoid referencing deleted files.|
| Armor allocation not saving                | Make sure `setArmorAllocation` uses `ARMOR_LOCATIONS` keys and persists in state. |
| Reset modes not working                    | Verify `CustomizerResetService` is invoked with correct mode; check console logs. |

## 4. Documentation Maintenance

- Legacy docs live in `docs-old/`. Do not delete them without updating `docs/changelog.md`.
- New documentation should be authored under `docs/` (`rules.md`, `architecture.md`, `operations.md`, `changelog.md`).
- Whenever a doc is superseded, add an entry to the changelog describing the new location.

## 5. Release Checklist

1. `npm run lint`
2. Run relevant Jest suites (`mechanics`, `store`)
3. Manual validation (summary of key pass/fail observations)
4. Documentation updates (README, docs/…)
5. Push grouped commits, open PR with summary/changelog

