# Change: Add Multi-Unit Type Construction Support

## Why

MekStation currently only supports BattleMech construction. BattleTech includes many other unit types (Combat Vehicles, Aerospace Fighters, VTOLs, Infantry, etc.) that users need to build and use in gameplay. This proposal extends the construction system to support these additional unit types.

## What Changes

- Add Vehicle construction (tracked, wheeled, hover, VTOL)
- Add Aerospace construction (conventional fighters, aerospace fighters)
- Add Infantry/Battle Armor construction
- Add Support Vehicle construction
- Extend unit entity model to accommodate type-specific attributes
- Update equipment compatibility rules per unit type

## Dependencies

- **Requires**: None (extends existing construction system)
- **Required By**: `add-game-session-core`, `add-combat-resolution`

## Unit Types to Support

### Phase 1A: Combat Vehicles
| Type | Configuration | Notes |
|------|---------------|-------|
| Tracked | Turret optional | Most common ground vehicle |
| Wheeled | Turret optional | Faster, less armor |
| Hover | Turret optional | Water-capable |
| VTOL | No turret | Vertical flight |

### Phase 1B: Aerospace
| Type | Configuration | Notes |
|------|---------------|-------|
| Conventional Fighter | Atmospheric only | Simpler construction |
| Aerospace Fighter | Space + atmosphere | Full aerospace rules |
| Small Craft | 100-200 tons | Larger aerospace |

### Phase 1C: Infantry
| Type | Configuration | Notes |
|------|---------------|-------|
| Foot Infantry | Platoon-based | Basic infantry |
| Motorized Infantry | Vehicle transport | Faster deployment |
| Jump Infantry | Jump packs | Terrain mobility |
| Battle Armor | Individual suits | Heavy infantry |

## Impact

- Affected specs: `unit-entity-model`, `construction-rules-core`, `equipment-database`
- New specs: `vehicle-construction`, `aerospace-construction`, `infantry-construction`
- Affected code: `src/types/unit/`, `src/services/construction/`
- Database: Extended unit schema for type-specific fields
