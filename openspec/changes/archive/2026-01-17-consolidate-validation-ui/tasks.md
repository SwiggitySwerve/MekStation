## 1. Implementation

- [x] 1.1 Remove ValidationPanel import from UnitEditorWithRouting.tsx
- [x] 1.2 Remove ValidationPanel JSX from UnitEditorWithRouting.tsx render
- [x] 1.3 Remove unused validation-related props if any become orphaned
- [x] 1.4 Verify ValidationSummary in UnitInfoBanner still works correctly
- [x] 1.5 Verify ValidationTabBadge on tabs still works correctly
- [x] 1.6 Run tests to ensure no regressions
- [x] 1.7 Update any tests that reference ValidationPanel in UnitEditorWithRouting context

## 2. Cleanup (Optional)

- [ ] 2.1 Consider deleting ValidationPanel.tsx if no longer needed elsewhere
- [ ] 2.2 Remove ValidationPanel tests if component is deleted

## 3. Verification

- [x] 3.1 Build passes
- [x] 3.2 All validation tests pass
- [x] 3.3 Manual verification: validation errors show in badge dropdown
- [x] 3.4 Manual verification: clicking errors navigates to correct tab
