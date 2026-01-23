# Change: Add Gameplay Navigation Items

## Why

Multiple gameplay pages were added this week (Forces, Campaigns, Encounters, Games) but they are not accessible from the sidebar navigation. Users must know the direct URLs or navigate through in-page links. All gameplay features should be discoverable and accessible from the main navigation.

## What Changes

- Add navigation icons: `ForceIcon`, `CampaignIcon`, `EncounterIcon`, `GameIcon`
- Add gameplay navigation items to the Gameplay expandable section:
  - Pilots (existing)
  - Forces (`/gameplay/forces`)
  - Campaigns (`/gameplay/campaigns`)
  - Encounters (`/gameplay/encounters`)
  - Games (`/gameplay/games`)
- Note: Repair Bay is intentionally excluded as it's accessed contextually from within campaigns

## Impact

- Affected specs: `app-navigation`
- Affected code:
  - `src/components/common/icons/NavigationIcons.tsx`
  - `src/components/common/Sidebar.tsx`

## Dependencies

- `add-expandable-navigation` (provides the expandable section container)

## Sequencing

This proposal should be implemented AFTER `add-expandable-navigation` is complete.
