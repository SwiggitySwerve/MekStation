# Tasks: Document Undocumented Features

## Overview

This change documents existing implementations that were merged without corresponding spec updates. All code is already implemented - these tasks verify spec accuracy against implementation.

## 1. Equipment Tray Delete Confirmation

- [x] 1.1 Verify click-to-confirm pattern in GlobalLoadoutTray.tsx (lines 244-298)
- [x] 1.2 Verify 3-second auto-reset timeout
- [x] 1.3 Verify confirmation visual (? indicator)
- [x] 1.4 Verify fixed OmniMech equipment is non-removable

**Implementation**: `src/components/customizer/equipment/GlobalLoadoutTray.tsx`
**Test**: `src/__tests__/components/customizer/equipment/GlobalLoadoutTray.test.tsx`

## 2. Equipment Browser Range Brackets

- [x] 2.1 Verify range column in EquipmentRow.tsx (formatRange function)
- [x] 2.2 Verify S/M/L format display
- [x] 2.3 Verify dash for non-weapons
- [x] 2.4 Verify mobile range column in MobileEquipmentRow

**Implementation**: `src/components/customizer/equipment/EquipmentRow.tsx`
**Mobile**: `src/components/customizer/mobile/MobileEquipmentRow.tsx`

## 3. Toast Notifications System

- [x] 3.1 Verify ToastProvider in Toast.tsx
- [x] 3.2 Verify four variants (success, error, warning, info)
- [x] 3.3 Verify auto-dismiss with 3000ms default
- [x] 3.4 Verify action button support
- [x] 3.5 Verify stacking behavior
- [x] 3.6 Verify accessibility attributes

**Implementation**: `src/components/shared/Toast.tsx`
**Provider**: Mounted in `src/pages/_app.tsx`
**Stories**: `src/components/shared/Toast.stories.tsx`

## 4. Archive

After approval, update main specs and archive this change.

- [x] 4.1 Merge equipment-tray delta into specs/equipment-tray/spec.md
- [x] 4.2 Merge equipment-browser delta into specs/equipment-browser/spec.md
- [x] 4.3 Create specs/toast-notifications/spec.md from delta
- [x] 4.4 Archive to changes/archive/2026-01-14-document-undocumented-features/
