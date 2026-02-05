# Change: Faction-Specific Rank System

## Why

MekStation tracks personnel rank as a simple string. MekHQ's rank system provides structured faction-specific rank tables with 51 rank slots, profession-variant names (e.g., "Captain" for MekWarriors, "Flight Captain" for Aerospace), pay multipliers, officer status determination, and integration with salary, turnover, and shares systems.

## What Changes

- **Rank Structure**: 51 rank slots (E0-E20 enlisted, WO1-WO10 warrant officers, O1-O20 officers)
- **Faction Rank Systems**: 5 built-in systems (Mercenary, SLDF, Clan, ComStar, Generic House)
- **Profession-Specific Names**: 9 professions (MekWarrior, Aerospace, Vehicle, Naval, Infantry, Tech, Medical, Administrator, Civilian)
- **Officer Status**: Computed from rank index vs officer cut threshold
- **Pay Multipliers**: Per-rank multipliers integrated with salary calculation (Plan 4)
- **Promotion/Demotion Service**: Validation, service logging, time-in-rank tracking
- **Officer Effects**: -1 turnover modifier (Plan 2), additional shares calculation

## Impact

- Affected specs: `personnel-management`
- Affected code: New `src/lib/campaign/ranks/` directory, updates to salary service (Plan 4), turnover modifiers (Plan 2)
- Backward compatible: Existing rank strings preserved, numeric rankIndex added to IPerson
- Migration: Existing personnel get rankIndex = 0 (lowest rank) by default
- Integration: Requires Plan 2 (turnover), Plan 4 (salary), Plan 13 (personnel roles) to be complete
