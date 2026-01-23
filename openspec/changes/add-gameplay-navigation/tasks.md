# Tasks: Add Gameplay Navigation Items

## 1. Icons

- [x] 1.1 Add `ForceIcon` to NavigationIcons.tsx (users group icon)
- [x] 1.2 Add `CampaignIcon` to NavigationIcons.tsx (flag icon)
- [x] 1.3 Add `EncounterIcon` to NavigationIcons.tsx (crosshairs/target icon)
- [x] 1.4 Add `GameIcon` to NavigationIcons.tsx (play button icon)

## 2. Navigation Items

- [x] 2.1 Update `gameplayItems` array in Sidebar.tsx:
  - Pilots (existing, `/gameplay/pilots`)
  - Forces (`/gameplay/forces`)
  - Campaigns (`/gameplay/campaigns`)
  - Encounters (`/gameplay/encounters`)
  - Games (`/gameplay/games`)

## 3. Verification

- [x] 3.1 Verify each navigation link works correctly
- [x] 3.2 Verify active state highlighting for each route
- [x] 3.3 Verify collapsed sidebar tooltip shows all items
- [ ] 3.4 Test mobile drawer navigation

## 4. Testing

- [ ] 4.1 Update Sidebar Storybook stories if needed
- [ ] 4.2 Add/update E2E tests for navigation
