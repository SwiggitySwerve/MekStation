# Change: Add Unit Card View

## Why

Users need a quick reference view of unit capabilities without navigating through the full customizer. This "unit card" provides an at-a-glance summary of a unit's stats, weapons, equipment, and key metrics — useful for browsing, comparing builds, and sharing.

## What Changes

- Add Unit Card component showing key stats at a glance
- Add weapons summary with damage/range/heat
- Add movement summary (walk/run/jump)
- Add armor/structure summary
- Add BV, tonnage, and rules level display
- Add quick actions (export, share, edit, duplicate)

## Dependencies

- **Requires**: None (uses existing unit data model)
- **Required By**: `add-pilot-mech-card`, `add-vault-sharing` (preview in share dialogs)

## Unit Card Content

```
┌─────────────────────────────────────────────┐
│ ATLAS AS7-D                    [IS] [3025]  │
│ Assault • 100 tons • BV: 1,897             │
├─────────────────────────────────────────────┤
│ MOVEMENT        │ ARMOR/STRUCTURE           │
│ Walk: 3         │ Total Armor: 304          │
│ Run:  5         │ Max Armor: 304            │
│ Jump: 0         │ Structure: Standard       │
├─────────────────────────────────────────────┤
│ WEAPONS                                     │
│ AC/20         • 20 dmg • 3/6/9  • 7 heat   │
│ LRM 20        • 1/rack • 6/12/18 • 6 heat  │
│ Medium Laser  • 5 dmg  • 3/6/9  • 3 heat   │
│ Medium Laser  • 5 dmg  • 3/6/9  • 3 heat   │
│ SRM 6         • 2/msl  • 3/6/9  • 4 heat   │
├─────────────────────────────────────────────┤
│ HEAT: 23 generated / 20 dissipated (+3)    │
├─────────────────────────────────────────────┤
│ [Export] [Share] [Edit] [Duplicate]         │
└─────────────────────────────────────────────┘
```

## Card Variants

| Variant  | Use Case                   | Content                                   |
| -------- | -------------------------- | ----------------------------------------- |
| Compact  | List views, search results | Name, tonnage, BV, movement only          |
| Standard | Browsing, comparing        | Full card as shown above                  |
| Expanded | Detail view                | All above + equipment list, quirks, notes |

## Impact

- Affected specs: None (new capability)
- New specs: `unit-card-view`
- Affected code: New `src/components/unit-card/` directory
- New pages: None (component used in existing pages)
