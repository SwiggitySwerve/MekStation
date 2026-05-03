## Why

Three independent definitions of `BREAKPOINTS` and three independent definitions of `MIN_TOUCH_TARGET = 44` exist across `src/utils/responsive.ts`, `src/constants/layout.ts`, and `src/hooks/useDeviceType.ts` / `src/hooks/useTouchTarget.ts`. The numeric values agree today but key naming has already drifted (`sm/md/lg` vs `SM/MD/LG` vs `mobile/tablet`), and any future change to a breakpoint or the touch-target constant requires editing three files in lockstep. An OMO Council audit on 2026-05-02 surfaced this as the highest-leverage / lowest-risk fragmentation in the responsive surface, and the existing `mobile-interaction-patterns` spec already names the canonical values — the implementation just doesn't have a single source of truth.

## What Changes

- Designate `src/constants/layout.ts` as the canonical module for `BREAKPOINTS` and `MIN_TOUCH_TARGET`.
- Convert `src/utils/responsive.ts` `BREAKPOINTS` and `MIN_TOUCH_TARGET` to re-exports of the values defined in `layout.ts` (preserving existing import paths and export names — no consumer changes required).
- Convert `src/hooks/useDeviceType.ts` private `BREAKPOINTS` to derive its `mobile`/`tablet` thresholds from `layout.ts` `BREAKPOINTS.MD` / `BREAKPOINTS.LG`.
- Convert `src/hooks/useTouchTarget.ts` private `DEFAULT_MIN_SIZE` to import from `layout.ts` `TOUCH.MIN_TARGET_SIZE`.
- Add JSDoc `@deprecated`-style hints on the re-exports pointing to `layout.ts` as canonical, so new code is steered to the canonical import.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-interaction-patterns`: add a "Single Source of Truth for Responsive Constants" requirement under the existing Responsive Breakpoints requirement. Numeric values do not change; the requirement codifies that BREAKPOINTS and MIN_TOUCH_TARGET have exactly one canonical definition module.

## Non-Goals

- Hook canonicalization (`useIsMobile` family vs `useDeviceType`). Tracked separately.
- Wiring orphan hooks (`useLongPress`, `useSwipeGestures`, `useVirtualKeyboard`) into UI surfaces. Tracked separately.
- Capability-first CSS adoption (`pointer:`, `@container`, `svh/dvh/lvh`, `@tailwindcss/container-queries` plugin). Tracked separately.
- `BottomNavBar.tsx` `min-h-[44px]` → `min-h-touch` token migration. Tracked separately.
- Codemod of consumers to import `BREAKPOINTS` / `MIN_TOUCH_TARGET` directly from `layout.ts`. Re-exports keep this change minimal; direct-import migration is a follow-up.

## Impact

**Code:**
- `src/constants/layout.ts` — add explicit `BREAKPOINTS` numeric source (already exists at line 56), add documentation comment marking it canonical.
- `src/utils/responsive.ts` — `BREAKPOINTS` and `MIN_TOUCH_TARGET` become re-exports.
- `src/hooks/useDeviceType.ts` — private `BREAKPOINTS` removed; `useDeviceType` reads from `layout.ts`.
- `src/hooks/useTouchTarget.ts` — `DEFAULT_MIN_SIZE` removed; reads from `layout.ts`.

**Tests:**
- [src/__tests__/responsive.test.tsx](src/__tests__/responsive.test.tsx) — must continue to pass without modification (numeric values unchanged).
- [src/__tests__/hooks/useTouchTarget.test.ts](src/__tests__/hooks/useTouchTarget.test.ts) — must continue to pass (default min size unchanged).
- Add a new lightweight invariant test asserting that `BREAKPOINTS` and `MIN_TOUCH_TARGET` are exported from exactly one module (`layout.ts`).

**APIs / Dependencies:**
- No external API changes.
- No new dependencies.
- Public hook API (`useIsMobile`, `useIsTablet`, `useIsDesktop`, `useDeviceType`, `useTouchTarget`) unchanged.

**Risk:**
- Very low. No calculation code changes; no consumer-facing import path changes (re-exports preserve compatibility).
- BV parity unaffected (no battle-value code touched).
- Test baseline 22477/22477 must remain green.
