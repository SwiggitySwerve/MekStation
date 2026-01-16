# Tasks

## 1. Core Implementation
- [x] 1.1 Create `useBalancedGrid` hook with column calculation algorithm
- [x] 1.2 Implement balanced column scoring (prefers perfect division over fewer rows)
- [x] 1.3 Add `requestAnimationFrame` for accurate post-paint container measurement
- [x] 1.4 Add `ResizeObserver` for responsive width updates

## 2. BalancedGrid Component
- [x] 2.1 Create `BalancedGrid` component wrapping the hook
- [x] 2.2 Use `Children.toArray()` for accurate child counting (excludes false/null/undefined)
- [x] 2.3 Implement fallback grid template for SSR/initial render
- [x] 2.4 Support configurable `minItemWidth`, `gap`, and `fallbackColumns` props

## 3. Integration
- [x] 3.1 Refactor `UnitInfoBanner` to use BalancedGrid (10 items → 5+5)
- [x] 3.2 Refactor `CompactFilterBar` to use BalancedGrid (8 items → 4+4)
- [x] 3.3 Remove duplicated grid calculation boilerplate from both components

## 4. Testing
- [x] 4.1 Add unit tests for `useBalancedGrid` hook algorithm
- [x] 4.2 Add unit tests for `BalancedGrid` component rendering
- [x] 4.3 Add tests for conditional children patterns (`{condition && <Child/>}`)
- [x] 4.4 Add integration tests matching UnitInfoBanner patterns
- [x] 4.5 Add `requestAnimationFrame` mock for synchronous test execution

## 5. Validation
- [x] 5.1 Verify TypeScript compilation passes
- [x] 5.2 Verify all 41 tests pass
- [x] 5.3 Visual verification of 5+5 layout in UnitInfoBanner
- [x] 5.4 Visual verification of 4+4 layout in CompactFilterBar
