# Change: Add Physical Weapons to Equipment Browser

## Why
Physical weapons (Sword, Lance, Talons, Retractable Blade, Wrecking Ball, etc.) were defined in `PHYSICAL_WEAPON_DEFINITIONS` but never added to the `getAllEquipmentItems()` function, causing them to be missing from the Equipment Browser's "Physical" category filter.

## What Changes
- Add physical weapons from `PHYSICAL_WEAPON_DEFINITIONS` to `getAllEquipmentItems()` for browser UI
- Add physical weapons from `PHYSICAL_WEAPON_DEFINITIONS` to `getAllEquipmentItemsForLookup()` for conversion/lookup
- Physical weapons have variable weight/slots based on mech tonnage (displayed as 0 in browser)
- 9 physical weapons now available: Hatchet, Sword, Claws, Mace, Lance, Talons, Retractable Blade, Flail, Wrecking Ball

## Impact
- Affected specs:
  - `equipment-browser` - Add Equipment Categories requirement for physical weapons
- Affected code:
  - `src/types/equipment/index.ts` - Add physical weapons to equipment item functions

