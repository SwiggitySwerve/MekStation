## 1. Infrastructure

- [x] 1.1 Add accent color CSS variables to `globals.css` (`:root` defaults)
- [x] 1.2 Add theme class definitions to `globals.css` (`.theme-default`, `.theme-neon`, etc.)
- [x] 1.3 Create `GlobalStyleProvider.tsx` component
- [x] 1.4 Integrate GlobalStyleProvider in `_app.tsx`

## 2. Toggle Component Fix

- [x] 2.1 Rewrite Toggle component with correct sizing math
- [x] 2.2 Apply rectangular tactical styling (rounded-md, border)
- [x] 2.3 Use CSS variable for checked state color
- [x] 2.4 Verify alignment in all toggle instances on settings page

## 3. Settings Page Updates

- [x] 3.1 Update AccentColorPicker to use `var(--accent-primary)` for selection indicator
- [x] 3.2 Update UIThemePicker to use CSS variable for selection
- [x] 3.3 Update focus rings to use accent variable

## 4. Validation

- [x] 4.1 Test accent color changes apply immediately
- [x] 4.2 Test UI theme changes apply theme class to body
- [x] 4.3 Test font size changes (if wired up)
- [x] 4.4 Test settings persist across page reload
- [x] 4.5 Run lint and build (pre-existing Playwright config issue, not from these changes)
