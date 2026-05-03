## Context

The MekStation responsive surface has grown organically and now defines breakpoints and the WCAG 2.5.5 minimum touch target size in three places each. [src/constants/layout.ts](src/constants/layout.ts) already declares itself "Single source of truth for responsive design values" in its file-header comment (line 5), and exports `BREAKPOINTS` (line 56, keys `SM/MD/LG/XL/XXL`) and `TOUCH.MIN_TARGET_SIZE` (line 75). However, [src/utils/responsive.ts:3](src/utils/responsive.ts) defines its own `BREAKPOINTS` (lowercase keys `sm/md/lg/xl/2xl` matching Tailwind defaults), [src/hooks/useDeviceType.ts:6](src/hooks/useDeviceType.ts) defines a private `BREAKPOINTS` with two-key shape (`mobile/tablet`), and [src/hooks/useTouchTarget.ts:28](src/hooks/useTouchTarget.ts) hardcodes `DEFAULT_MIN_SIZE = 44`.

Numeric values agree today but key naming has already drifted (uppercase vs lowercase vs domain-keyed). Any future edit to a breakpoint must touch all three files in lockstep, and there is no compile-time enforcement.

This change closes that drift without modifying any consumer code or any numeric value.

## Goals / Non-Goals

**Goals:**

- One canonical numeric definition of `BREAKPOINTS` and `MIN_TOUCH_TARGET` per repo (in `layout.ts`).
- Zero changes to existing public API surfaces — all current import paths and named exports keep working.
- Zero changes to any test (existing tests must pass unmodified).
- Add an invariant test that fails if the constants are re-fragmented.

**Non-Goals:**

- Hook canonicalization (`useIsMobile` family vs `useDeviceType`) — separate change.
- Codemod of consumers to import directly from `layout.ts` — re-exports keep this change minimal; direct-import migration is a follow-up.
- Capability-first CSS adoption (`pointer:`, `@container`, `svh/dvh/lvh`).
- Resolving the four orphan touch hooks (`useLongPress`, `useSwipeGestures`, `useVirtualKeyboard`, `useTouchTarget` orphan CSS class).
- Renaming `BREAKPOINTS` keys (`SM` vs `sm`) — preserved for backward compat; the project convention disagreement is not blocking and resolving it would force consumer churn.

## Decisions

### D1. Canonical module is `src/constants/layout.ts`

**Rationale:** It already declares itself as the SoT in its header comment, already organizes related constants under namespaces (`SIDEBAR`, `Z_INDEX`, `TOUCH`, `ANIMATION`, `HEADER`), and uses the project's UPPER_SNAKE_CASE constant convention. The other two files (`responsive.ts`, `useDeviceType.ts`) have their definitions inline next to hook implementations, which is exactly the pattern that produced the drift.

**Alternative considered:** Make `responsive.ts` canonical and have `layout.ts` re-export. Rejected because `responsive.ts` mixes constants with React hooks (`useMediaQuery`, `useIsMobile`, etc.) — that's a worse home for shared constants than a pure constants module.

### D2. Re-export, don't codemod

`responsive.ts` and `useDeviceType.ts` build their existing exports from `layout.ts` values. Existing import paths keep working unchanged.

```typescript
// src/utils/responsive.ts (new)
import { BREAKPOINTS as LAYOUT_BREAKPOINTS, TOUCH } from '@/constants/layout';

/**
 * Tailwind-keyed breakpoints. Re-exported from `@/constants/layout` BREAKPOINTS.
 * @see src/constants/layout.ts for the canonical definition.
 */
export const BREAKPOINTS = {
  sm: LAYOUT_BREAKPOINTS.SM,
  md: LAYOUT_BREAKPOINTS.MD,
  lg: LAYOUT_BREAKPOINTS.LG,
  xl: LAYOUT_BREAKPOINTS.XL,
  '2xl': LAYOUT_BREAKPOINTS.XXL,
} as const;

/**
 * Re-exported from `@/constants/layout` TOUCH.MIN_TARGET_SIZE.
 * @see src/constants/layout.ts for the canonical definition.
 */
export const MIN_TOUCH_TARGET = TOUCH.MIN_TARGET_SIZE;
```

```typescript
// src/hooks/useDeviceType.ts (new)
import { BREAKPOINTS as LAYOUT_BREAKPOINTS } from '@/constants/layout';

const BREAKPOINTS = {
  mobile: LAYOUT_BREAKPOINTS.MD,
  tablet: LAYOUT_BREAKPOINTS.LG,
} as const;
```

```typescript
// src/hooks/useTouchTarget.ts (new)
import { TOUCH } from '@/constants/layout';

const DEFAULT_MIN_SIZE = TOUCH.MIN_TARGET_SIZE;
```

**Alternative considered:** Codemod every consumer to import directly from `layout.ts`. Rejected for this change because (a) it expands blast radius beyond what's necessary to close the SoT gap, (b) the lowercase-keyed `BREAKPOINTS` shape from `responsive.ts` is more ergonomic for Tailwind-aligned code than `layout.ts` `SM/MD/LG`, so consumers should keep using whichever shape suits them. A future change can decide whether to deprecate one shape entirely.

### D3. Invariant test prevents re-fragmentation

Add `src/__tests__/constants/responsive-constants-sot.test.ts` that:

1. Imports `BREAKPOINTS` and `MIN_TOUCH_TARGET` (and `TOUCH.MIN_TARGET_SIZE`) from all four files.
2. Asserts the numeric values are equal across all definitions (`responsive.ts.BREAKPOINTS.md === layout.ts.BREAKPOINTS.MD`, etc.).
3. Asserts the canonical values match the spec-cited 44px and `640/768/1024/1280/1536` ladder.

The test is mechanical and serves as a tripwire: any future PR that re-fragments the constants by adding a new private definition will immediately diverge from `layout.ts` and break this test.

**Alternative considered:** Lint rule. Rejected because writing a custom ESLint rule that detects "module-local BREAKPOINTS constant" requires more infrastructure than the test, and the test runs in CI today.

### D4. JSDoc `@see` markers, not `@deprecated`

The re-exports get an `@see src/constants/layout.ts` JSDoc pointer, not `@deprecated`. Reason: `responsive.ts` `BREAKPOINTS` (lowercase keys) and `useDeviceType` `BREAKPOINTS` (mobile/tablet keys) are *different shapes* of the same data, both valid for their use sites. Marking them deprecated would be misleading — they are not going away, only their numeric values are derived. `@deprecated` would be right if/when D2's "future change" decides to consolidate shapes.

## Risks / Trade-offs

- **Risk:** A consumer that imports `BREAKPOINTS` from `responsive.ts` and treats it as a tuple type (e.g., `keyof typeof BREAKPOINTS`) might be sensitive to the order or named keys. → **Mitigation:** Re-export preserves the exact shape and key order. The new file is byte-similar minus the literal numbers, which are now imports.
- **Risk:** TypeScript narrowing might lose `as const` literal-type behavior if the re-export pattern is wrong. → **Mitigation:** Keep `as const` on the re-exported object; the underlying literal types from `layout.ts` are already `as const` and preserve through indexed access.
- **Risk:** Circular import (`layout.ts` → `responsive.ts` → ...) since both might be imported by hooks. → **Mitigation:** `layout.ts` has zero imports today (verified by Read); the new direction is one-way (`responsive.ts` and hooks → `layout.ts`). No cycle.
- **Trade-off:** Three named shapes still exist for `BREAKPOINTS` (uppercase / lowercase / mobile-tablet). This change does not unify shapes, only values. Acceptable: a single SoT for *values* closes 100% of the drift risk; shape convergence is a separate readability debate worth its own change.

## Migration Plan

1. Add the invariant test first — it must fail before the refactor (proves it's catching real drift) and pass after.
2. Refactor `responsive.ts` to re-export from `layout.ts`.
3. Refactor `useDeviceType.ts` to derive private `BREAKPOINTS` from `layout.ts`.
4. Refactor `useTouchTarget.ts` to derive `DEFAULT_MIN_SIZE` from `layout.ts`.
5. Run full test suite — must remain at 22477/22477 (or whatever the current baseline is at branch time).
6. No rollback needed: pure refactor, no behavior change.

## Open Questions

None — all four file changes are mechanical and the invariant test is straightforward. If the user later decides to unify `BREAKPOINTS` shapes (e.g., remove the lowercase variant), that is a separate change that this one explicitly defers.
