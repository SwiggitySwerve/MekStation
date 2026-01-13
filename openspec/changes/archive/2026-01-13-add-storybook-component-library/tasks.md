# Tasks: Add Storybook Component Library

## 1. Setup and Configuration

- [x] 1.1 Install Storybook dependencies
  - Installed: storybook, @storybook/react-vite, @storybook/addon-essentials, @storybook/addon-a11y, @storybook/addon-interactions, @storybook/blocks, @storybook/test, @tailwindcss/vite
- [x] 1.2 Configure `.storybook/main.ts` with stories glob and addons
- [x] 1.3 Configure `.storybook/preview.ts` with Tailwind import and theme backgrounds
- [x] 1.4 Update `tailwind.config.ts` to include `.storybook` in content paths
- [x] 1.5 Add npm scripts to `package.json`: `storybook`, `storybook:build`
- [x] 1.6 Verify Storybook builds without errors: `npm run storybook:build`

## 2. Core UI Component Stories (P0)

- [x] 2.1 Create `src/components/ui/Button.stories.tsx`
- [x] 2.2 Create `src/components/ui/Card.stories.tsx`
- [x] 2.3 Create `src/components/ui/Badge.stories.tsx`
- [x] 2.4 Create `src/components/ui/Input.stories.tsx`
- [x] 2.5 Create `src/components/ui/PageLayout.stories.tsx`
- [x] 2.6 Create `src/components/ui/StatDisplay.stories.tsx`
- [x] 2.7 Create `src/components/ui/CategoryCard.stories.tsx`
- [x] 2.8 Create `src/components/ui/ViewModeToggle.stories.tsx`

## 3. Context Decorators & Mocking Infrastructure

- [x] 3.1 Create `.storybook/decorators/ThemeDecorator.tsx` for CSS variable injection
- [x] 3.2 Create `.storybook/decorators/ZustandDecorator.tsx` for store mocking
- [x] 3.3 Create `.storybook/decorators/DndDecorator.tsx` for react-dnd context
- [x] 3.4 Create `.storybook/decorators/NextRouterDecorator.tsx` for Next.js router mocking
- [x] 3.5 Create `.storybook/decorators/DeviceCapabilitiesDecorator.tsx` for mobile device mocking
- [x] 3.6 Create `.storybook/decorators/ElectronDecorator.tsx` for Electron API mocking
- [x] 3.7 Create `.storybook/mocks/next-link.tsx` for Next.js Link component mock
- [x] 3.8 Create `.storybook/mocks/next-head.tsx` for Next.js Head component mock
- [x] 3.9 Create `.storybook/mocks/next-router.tsx` for Next.js router hooks mock
- [x] 3.10 Create `.storybook/mocks/useDeviceCapabilities.tsx` for device capabilities mock
- [x] 3.11 Create `.storybook/mocks/useElectron.tsx` for Electron API mock
- [x] 3.12 Register decorators in `preview.ts` and configure aliases in `main.ts`

## 4. Common Component Stories (P0)

- [x] 4.1 Create `src/components/common/Pagination.stories.tsx`
- [x] 4.2 Create `src/components/common/SkeletonLoader.stories.tsx`
- [x] 4.3 Create `src/components/common/CustomDropdown.stories.tsx`
- [x] 4.4 Create `src/components/common/ControlledInput.stories.tsx`
- [x] 4.5 Create `src/components/common/ErrorBoundary.stories.tsx`
- [x] 4.6 Create `src/components/common/CategoryNavigation.stories.tsx`
- [x] 4.7 Create `src/components/common/Layout.stories.tsx`
- [x] 4.8 Create `src/components/common/Sidebar.stories.tsx`

## 5. Domain Component Stories (P1)

### 5.1 Armor Components
- [x] 5.1.1 Create `src/components/customizer/armor/ArmorDiagram.stories.tsx`
- [x] 5.1.2 Create `src/components/armor/ArmorLocation.stories.tsx`
- [x] 5.1.3 Create `src/components/armor/ArmorDiagramModeSwitch.stories.tsx`

### 5.2 Customizer Components
- [x] 5.2.1 Create `src/components/customizer/tabs/TabBar.stories.tsx`
- [x] 5.2.2 Create `src/components/customizer/tabs/UnitTab.stories.tsx`
- [x] 5.2.3 Create `src/components/customizer/dialogs/ModalOverlay.stories.tsx`
- [x] 5.2.4 Create `src/components/customizer/dialogs/UnsavedChangesDialog.stories.tsx`
- [x] 5.2.5 Create `src/components/customizer/dialogs/ResetConfirmationDialog.stories.tsx`
- [x] 5.2.6 Create `src/components/customizer/dialogs/SaveUnitDialog.stories.tsx`
- [x] 5.2.7 Create `src/components/customizer/dialogs/ImportUnitDialog.stories.tsx`
- [x] 5.2.8 Create `src/components/customizer/dialogs/VersionHistoryDialog.stories.tsx`
- [x] 5.2.9 Create `src/components/customizer/dialogs/OverwriteConfirmDialog.stories.tsx`
- [x] 5.2.10 Create `src/components/customizer/dialogs/UnitLoadDialog.stories.tsx`
- [x] 5.2.11 Create `src/components/customizer/shared/StatCell.stories.tsx`
- [x] 5.2.12 Create `src/components/customizer/shared/ValidationBadge.stories.tsx`
- [x] 5.2.13 Create `src/components/customizer/shared/ColorLegend.stories.tsx`
- [x] 5.2.14 Create `src/components/customizer/equipment/CategoryToggleBar.stories.tsx`

### 5.3 Equipment Components
- [x] 5.3.1 Create `src/components/equipment/EquipmentDetail.stories.tsx`

### 5.4 Critical Slots Components
- [x] 5.4.1 Create `src/components/critical-slots/CriticalSlot.stories.tsx`

## 6. Additional Component Stories (P2)

### 6.1 Gameplay Components
- [x] 6.1.1 Create `src/components/gameplay/AmmoCounter.stories.tsx`
- [x] 6.1.2 Create `src/components/gameplay/HeatTracker.stories.tsx`
- [x] 6.1.3 Create `src/components/gameplay/ArmorPip.stories.tsx`

### 6.2 Mobile Components
- [x] 6.2.1 Create `src/components/mobile/BottomNavBar.stories.tsx`

### 6.3 Settings Components
- [x] 6.3.1 Create `src/components/settings/DesktopSettingsDialog.stories.tsx`

### 6.4 Shared Components
- [x] 6.4.1 Create `src/components/shared/Toast.stories.tsx`
- [x] 6.4.2 Create `src/components/shared/ActionSheet.stories.tsx`

## 7. Design System Documentation

- [x] 7.1 Create `src/docs/Colors.mdx` documenting color tokens
- [x] 7.2 Create `src/docs/Typography.mdx` documenting text styles
- [x] 7.3 Create `src/docs/Spacing.mdx` documenting spacing scale
- [x] 7.4 Create `src/docs/Introduction.mdx` as landing page

## 8. CI Integration

- [x] 8.1 Add Storybook build step to CI workflow (`.github/workflows/pr-checks.yml`)
- [x] 8.2 Verify CI build passes (local build verified)

## 9. Documentation

- [x] 9.1 Update `docs/development/getting-started.md` with Storybook instructions
- [x] 9.2 Add Storybook section to README.md

---

## Completion Summary

### Completed (44 story files + infrastructure)

**Infrastructure:**
- Complete mocking system for Next.js (Link, Head, router hooks)
- ZustandDecorator for store state management in stories
- DeviceCapabilitiesDecorator for mobile component testing
- ElectronDecorator for desktop settings dialog testing
- All decorators registered globally in preview.ts

**Story Files:**
- 8 UI component stories (Button, Card, Badge, Input, StatDisplay, CategoryCard, ViewModeToggle, PageLayout)
- 8 common component stories (Pagination, SkeletonLoader, CustomDropdown, ControlledInput, ErrorBoundary, CategoryNavigation, Layout, Sidebar)
- 3 armor component stories (ArmorDiagram, ArmorLocation, ArmorDiagramModeSwitch)
- 3 gameplay component stories (AmmoCounter, HeatTracker, ArmorPip)
- 2 shared component stories (Toast, ActionSheet)
- 10 customizer dialog stories (ModalOverlay, UnsavedChangesDialog, ResetConfirmationDialog, SaveUnitDialog, ImportUnitDialog, VersionHistoryDialog, OverwriteConfirmDialog, UnitLoadDialog, plus TabBar and UnitTab)
- 3 customizer shared component stories (StatCell, ValidationBadge, ColorLegend)
- 1 customizer equipment story (CategoryToggleBar)
- 1 equipment component story (EquipmentDetail)
- 1 critical-slots component story (CriticalSlot)
- 1 mobile component story (BottomNavBar)
- 1 settings component story (DesktopSettingsDialog)
- 4 design system documentation pages (Introduction, Colors, Typography, Spacing)

## Verification Criteria

- [x] `npm run storybook` starts without errors
- [x] `npm run storybook:build` produces static output (~15s build time)
- [x] All implemented stories render correctly
- [x] Design system pages render correctly
- [x] CI build step added to pr-checks.yml
- [x] Next.js mocks working (Link, Head, router with dynamic pathname)
- [x] Zustand store mocking working
- [x] Device capabilities mocking working for mobile stories
- [x] Electron API mocking working for desktop settings stories

## Story Count Summary

| Category | Story Files | Components |
|----------|-------------|------------|
| UI | 8 | Button, Card, Badge, Input, StatDisplay, CategoryCard, ViewModeToggle, PageLayout |
| Common | 8 | Pagination, SkeletonLoader, CustomDropdown, ControlledInput, ErrorBoundary, CategoryNavigation, Layout, Sidebar |
| Armor | 3 | ArmorDiagram, ArmorLocation, ArmorDiagramModeSwitch |
| Gameplay | 3 | AmmoCounter, HeatTracker, ArmorPip |
| Shared | 2 | Toast, ActionSheet |
| Customizer/Tabs | 2 | TabBar, UnitTab |
| Customizer/Dialogs | 8 | ModalOverlay, UnsavedChangesDialog, ResetConfirmationDialog, SaveUnitDialog, ImportUnitDialog, VersionHistoryDialog, OverwriteConfirmDialog, UnitLoadDialog |
| Customizer/Shared | 3 | StatCell, ValidationBadge, ColorLegend |
| Customizer/Equipment | 1 | CategoryToggleBar |
| Equipment | 1 | EquipmentDetail |
| Critical-Slots | 1 | CriticalSlot |
| Mobile | 1 | BottomNavBar |
| Settings | 1 | DesktopSettingsDialog |
| Design System | 4 | Introduction, Colors, Typography, Spacing (MDX) |
| **Total** | **44 story files** | **40 components + 4 docs** |

## Infrastructure Files Created

| File | Purpose |
|------|---------|
| `.storybook/decorators/ZustandDecorator.tsx` | Mock Zustand store state |
| `.storybook/decorators/NextRouterDecorator.tsx` | Mock Next.js router context |
| `.storybook/decorators/DeviceCapabilitiesDecorator.tsx` | Mock device capabilities |
| `.storybook/decorators/ElectronDecorator.tsx` | Mock Electron APIs |
| `.storybook/mocks/next-link.tsx` | Mock Next.js Link component |
| `.storybook/mocks/next-head.tsx` | Mock Next.js Head component |
| `.storybook/mocks/next-router.tsx` | Mock Next.js router hooks |
| `.storybook/mocks/useDeviceCapabilities.tsx` | Mock useDeviceCapabilities hook |
| `.storybook/mocks/useElectron.tsx` | Mock Electron API |
