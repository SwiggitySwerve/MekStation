# Learnings — add-mech-silhouette-sprite-set

## Repo conventions

- Testing is **Jest**, not vitest. Test suites live under `__tests__/` beside the file.
- Test helper: wrap SVG children in `<svg>` — jsdom requires SVG root. See
  `src/components/gameplay/UnitToken/__tests__/UnitTokenForType.test.tsx` for
  the `renderInSvg(ui)` helper pattern.
- Lint is **oxlint**; formatter is **oxfmt**. Scripts:
  `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`.
- Husky pre-commit is broken on Windows — use `git commit --no-verify`.

## Token rendering architecture

- Token dispatcher: `src/components/gameplay/UnitToken/UnitTokenForType.tsx`
  routes by `token.unitType` to per-type renderers. Dispatcher also projects
  events via `projectEvents()` once and passes `eventState` down.
- Per-type renderers are **children of a `<g>`** — the dispatcher provides
  the outer `<g transform="translate(x,y)" onClick=…>` wrapper, and each
  renderer returns token-local SVG children only (no outer group).
- `MechToken` currently paints: selection/target ring, optional active-target
  pulse (SVG `<animate>`), circular body fill, facing arrow path, designation
  label, destroyed cross, pilot/crit/damage overlays.
- Legacy `UnitToken.tsx` is marked TODO-deprecated and kept only for a smoke
  test. Do NOT touch — the real swap target is `MechToken.tsx`.

## Accessibility

- `useAccessibilityStore` (zustand + persist) exposes `reduceMotion: boolean`
  and `highContrast: boolean`. Read via `useAccessibilityStore((s) => s.reduceMotion)`.
- No `prefers-reduced-motion` CSS media query is used today — the store flag
  is the single source of truth.

## IUnitToken shape

- Already extended with optional per-type fields (vehicle, aerospace, BA,
  infantry, proto). Adding new **optional** fields for sprite-system (weight
  class, chassis archetype, per-location armor state) is safe and does not
  break Phase-1 callers.
- Backwards-compat rule for this surface: new fields MUST be optional, and
  callers that don't set them MUST still get a sensible silhouette (default
  → humanoid-medium).

## Constants + math

- `HEX_SIZE = 40` (center to vertex). Sprites should occupy ~80% of the hex
  diameter at zoom 1.0 → radius ~32 → fits inside 64×64 — use a 200×200
  viewBox internally for crisp scaling.
- `getFacingRotation(facing)` returns 0/60/120/180/240/300 degrees.
- The facing arrow in MechToken was drawn with a `rotate(rotation - 90)`
  offset because the path points "up" (−y). Our sprite convention: the SVG
  is drawn facing "north" by default, and we apply `rotate(facing * 60)`
  about the center — no additional −90 needed.

## Weight class enum

`src/types/enums/WeightClass.ts` has `ULTRALIGHT / LIGHT / MEDIUM / HEAVY /
ASSAULT / SUPERHEAVY`. Sprite catalog buckets ULTRALIGHT with LIGHT, and
SUPERHEAVY with ASSAULT (only 4 buckets per spec).

## Snapshot tests

Jest snapshot tests exist in `src/components/gameplay/__tests__/__snapshots__/`.
For sprite visual regression, use Jest snapshot on the rendered SVG output.
