## 1. Implementation

- [ ] 1.1 Remove ValidationPanel import from UnitEditorWithRouting.tsx
- [ ] 1.2 Remove ValidationPanel JSX from UnitEditorWithRouting.tsx render
- [ ] 1.3 Remove unused validation-related props if any become orphaned
- [ ] 1.4 Verify ValidationSummary in UnitInfoBanner still works correctly
- [ ] 1.5 Verify ValidationTabBadge on tabs still works correctly
- [ ] 1.6 Run tests to ensure no regressions
- [ ] 1.7 Update any tests that reference ValidationPanel in UnitEditorWithRouting context

## 2. Cleanup (Optional)

- [ ] 2.1 Consider deleting ValidationPanel.tsx if no longer needed elsewhere
- [ ] 2.2 Remove ValidationPanel tests if component is deleted

## 3. Verification

- [ ] 3.1 Build passes
- [ ] 3.2 All validation tests pass
- [ ] 3.3 Manual verification: validation errors show in badge dropdown
- [ ] 3.4 Manual verification: clicking errors navigates to correct tab
