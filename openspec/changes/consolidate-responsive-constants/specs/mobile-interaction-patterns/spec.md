## ADDED Requirements

### Requirement: Single Source of Truth for Responsive Constants

The system SHALL define `BREAKPOINTS` and `MIN_TOUCH_TARGET` numeric values in exactly one canonical module (`src/constants/layout.ts`). All other modules that expose breakpoint or touch-target constants under different shapes (e.g., Tailwind-keyed lowercase, mobile/tablet domain keys) SHALL derive their values from the canonical module via import or re-export.

#### Scenario: Canonical module is the only place numeric values are written

- **WHEN** any source file under `src/` declares a `BREAKPOINTS` constant or a `MIN_TOUCH_TARGET` / `MIN_TARGET_SIZE` / `DEFAULT_MIN_SIZE` constant
- **THEN** the constant SHALL either be defined in `src/constants/layout.ts`, OR derive its numeric value(s) by importing from `src/constants/layout.ts`
- **AND** no source file SHALL hardcode the numeric values 640, 768, 1024, 1280, 1536 (breakpoint values) or 44 (touch target value) as a constant declaration outside `src/constants/layout.ts`

#### Scenario: Re-exported breakpoints preserve numeric equivalence

- **WHEN** a module re-exports `BREAKPOINTS` under a different key shape (e.g., Tailwind-keyed `sm/md/lg/xl/2xl` or domain-keyed `mobile/tablet`)
- **THEN** the re-exported numeric values SHALL be byte-equivalent to the canonical `src/constants/layout.ts` `BREAKPOINTS.SM/MD/LG/XL/XXL` values
- **AND** the re-export SHALL include a JSDoc `@see src/constants/layout.ts` pointer marking the canonical source

#### Scenario: Touch target minimum is derived from canonical module

- **WHEN** a hook or utility uses the WCAG 2.5.5 minimum touch target size (44px)
- **THEN** the value SHALL be derived from `src/constants/layout.ts` `TOUCH.MIN_TARGET_SIZE`
- **AND** the value SHALL NOT be hardcoded in the hook or utility module

#### Scenario: Invariant test prevents re-fragmentation

- **WHEN** the test suite runs (`npm test`)
- **THEN** an invariant test SHALL assert that `BREAKPOINTS` numeric values are equal across all current re-export sites (`src/utils/responsive.ts`, `src/hooks/useDeviceType.ts` private constant, `src/constants/layout.ts`)
- **AND** the test SHALL assert that `MIN_TOUCH_TARGET` numeric values are equal across all current sites (`src/utils/responsive.ts`, `src/hooks/useTouchTarget.ts` private constant, `src/constants/layout.ts` `TOUCH.MIN_TARGET_SIZE`)
- **AND** the test SHALL fail if any future PR introduces a new module-local hardcoded definition that diverges from the canonical values

#### Scenario: Public API surface is preserved

- **WHEN** a consumer imports `BREAKPOINTS` or `MIN_TOUCH_TARGET` from `src/utils/responsive.ts`, or imports `useDeviceType`, `useTouchTarget`, or any of the `useIsMobile`/`useIsTablet`/`useIsDesktop` hooks
- **THEN** the import SHALL resolve to the same exported names with the same shape they had before this consolidation
- **AND** no consumer code SHALL require modification as a result of this change
