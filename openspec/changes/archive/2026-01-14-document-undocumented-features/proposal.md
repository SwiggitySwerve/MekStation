# Change: Document Undocumented Features from Recent Merges

## Why

Several features implemented in recent merges (PRs #58-#68) are not documented in OpenSpec specifications. This creates a gap between implementation and spec, making it harder to maintain consistency and onboard new contributors.

## What Changes

1. **equipment-tray**: Add delete confirmation behavior for desktop tray
   - Click-to-confirm pattern replaces double-click removal
   - Auto-reset after 3 seconds if not confirmed

2. **equipment-browser**: Add range brackets column documentation
   - Weapons display Short/Medium/Long range in S/M/L format
   - Non-weapons display dash

3. **toast-notifications**: New spec for toast notification system
   - Provider/context architecture
   - Four variants: success, error, warning, info
   - Auto-dismiss with configurable duration
   - Optional action buttons

## Impact

- Affected specs: `equipment-tray`, `equipment-browser`
- New spec: `toast-notifications`
- Affected code: Already implemented, this is documentation catch-up
- No breaking changes (documenting existing behavior)

## Commits Covered

- `3669a3dd` feat(loadout): add delete confirmation to desktop equipment loadout tray (#68)
- `1f0ebb4a` feat: add range brackets column to equipment table
- `fdd04322` feat(mobile): add range brackets column and fix header alignment
- `838b320c` chore: code review cleanup - fix TODOs, add toast notifications, integrate validation (#65)
