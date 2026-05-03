## 1. Tripwire Test First (TDD)

- [x] 1.1 Create `src/__tests__/constants/responsive-constants-sot.test.ts` with three assertion blocks: (a) `BREAKPOINTS.md`/`md`/`MD`/`mobile` resolve to 768 across all four sites, (b) `BREAKPOINTS.lg`/`LG`/`tablet` resolve to 1024 across all sites, (c) `MIN_TOUCH_TARGET` / `TOUCH.MIN_TARGET_SIZE` / `DEFAULT_MIN_SIZE` all equal 44.
- [x] 1.2 Run the test against the current (pre-refactor) codebase — it MUST PASS now (values agree today). This proves the test reads the right symbols.
- [x] 1.3 Temporarily edit `src/utils/responsive.ts` `BREAKPOINTS.md` to 769 and confirm the test FAILS (proves the test is sensitive to drift). Revert the edit.

## 2. Refactor Re-Exports

- [x] 2.1 Edit `src/utils/responsive.ts`: replace literal numeric `BREAKPOINTS` object with one that imports values from `@/constants/layout` (preserve lowercase Tailwind keys `sm/md/lg/xl/2xl`). Add JSDoc `@see src/constants/layout.ts` on the export.
- [x] 2.2 Edit `src/utils/responsive.ts`: replace literal `MIN_TOUCH_TARGET = 44` with `import { TOUCH } from '@/constants/layout'; export const MIN_TOUCH_TARGET = TOUCH.MIN_TARGET_SIZE;`. Add `@see` JSDoc.
- [x] 2.3 Edit `src/hooks/useDeviceType.ts`: replace private `BREAKPOINTS = { mobile: 768, tablet: 1024 }` with `import { BREAKPOINTS as LAYOUT_BREAKPOINTS } from '@/constants/layout';` and derive `mobile: LAYOUT_BREAKPOINTS.MD` / `tablet: LAYOUT_BREAKPOINTS.LG`.
- [x] 2.4 Edit `src/hooks/useTouchTarget.ts`: replace `DEFAULT_MIN_SIZE = 44` with `import { TOUCH } from '@/constants/layout'; const DEFAULT_MIN_SIZE = TOUCH.MIN_TARGET_SIZE;`.
- [x] 2.5 Add documentation comment at the top of `src/constants/layout.ts` `BREAKPOINTS` export explicitly stating it is canonical and that `responsive.ts` and `useDeviceType.ts` derive from it.

## 3. Verification

- [x] 3.1 Re-run `src/__tests__/constants/responsive-constants-sot.test.ts` — must PASS.
- [x] 3.2 Run `npm run typecheck` — must pass with zero errors. Pay particular attention to literal-type narrowing on `BREAKPOINTS` (the `as const` assertion must still produce literal types).
- [x] 3.3 Run `npm test` — full suite must pass. Existing tests `src/__tests__/responsive.test.tsx` and `src/__tests__/hooks/useTouchTarget.test.ts` must pass without modification.
- [x] 3.4 Run `npm run build` — production build must succeed.
- [x] 3.5 Grep verification: `grep -r "BREAKPOINTS = {" src/` must return ONLY hits in `src/constants/layout.ts` (canonical) and `src/utils/responsive.ts` / `src/hooks/useDeviceType.ts` (derived re-exports). No other module may declare a fresh `BREAKPOINTS = {` literal.
- [x] 3.6 Grep verification: `grep -rn "= 44" src/hooks/ src/utils/` must NOT show any line where `44` is a hardcoded literal for touch-target sizing (it is allowed in tests and CSS class strings like `min-h-[44px]`, which is a separate concern out of scope here).

## 4. Spec Sync (Done at Archive Time)

- [x] 4.1 At archive time, OpenSpec sync will merge the ADDED Requirement "Single Source of Truth for Responsive Constants" from this change's delta spec into `openspec/specs/mobile-interaction-patterns/spec.md`. No manual sync needed during apply phase.

## 5. PR

- [x] 5.1 Branch: `chore/consolidate-responsive-constants`. Commit messages follow conventional-commits style. Single PR targeting `main`.
- [x] 5.2 PR description references the OMO Council session findings and links to the new global skill `~/.claude/skills/adaptive-ui-capabilities/SKILL.md`.
- [x] 5.3 Wait for CI green: `Lint and Test`, `Build Test / win/mac/linux` (3 platforms), and the new `responsive-constants-sot` test must all pass.
- [x] 5.4 Merge via squash. After merge, run `/opsx:archive consolidate-responsive-constants`.
