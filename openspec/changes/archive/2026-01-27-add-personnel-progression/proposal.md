# Change: Personnel Progression System

## Why

MekStation currently lacks personnel progression mechanics beyond basic skill improvement. MekHQ implements a comprehensive progression system with 8 XP sources, trait-modified skill costs, aging with attribute decay, special ability acquisition, and vocational training. This change implements the full progression pipeline to enable realistic character development over campaign timelines.

## What Changes

### XP Award System

- **8 XP Sources**: scenario participation, kills, tasks, vocational training, admin work, mission outcomes, education (stub), manual awards
- **Configurable Amounts**: All XP awards configurable via ICampaignOptions
- **Threshold Logic**: Kill and task XP require minimum counts before awarding

### Skill Cost Modifiers

- **Trait Multipliers**: Fast Learner (-20%), Slow Learner (+20%), Gremlins (+10% tech), Tech Empathy (-10% tech)
- **Stacking**: Multiple traits combine multiplicatively
- **Extends Plan 7**: Builds on existing skill improvement system

### Aging System

- **10 Milestones**: Age brackets from <25 to 101+ with distinct attribute modifiers
- **Cumulative Decay**: Attribute modifiers accumulate across milestones
- **Auto-Traits**: Glass Jaw and Slow Learner applied at age 61+ (unless contradictory traits exist)
- **Birthday Processing**: Changes only applied on actual birthday when crossing milestone boundaries

### Special Ability Acquisition

- **Veterancy SPA**: Auto-roll when reaching Veteran experience level
- **Coming-of-Age**: Auto-roll at age 16
- **Purchase**: Direct XP spend for eligible SPAs
- **Representative Catalog**: ~10 SPAs defined (full catalog deferred)

### Day Processors

- **Vocational Training**: Monthly 2d6 vs TN check, awards configurable XP on success
- **Aging Processor**: Birthday check with milestone application

## Impact

### Affected Specs

- **MODIFIED**: `personnel-management` (adds trait fields, XP tracking)
- **MODIFIED**: `day-progression` (adds 2 new processors)
- **ADDED**: `personnel-progression` (new spec for progression mechanics)

### Affected Code

- `src/types/campaign/progression/` - New progression types
- `src/lib/campaign/progression/` - XP awards, skill costs, aging, SPA logic
- `src/lib/campaign/processors/` - Vocational and aging processors
- `src/types/campaign/Person.ts` - Add trait fields
- `src/types/campaign/Campaign.ts` - Add 14 new options

### Breaking Changes

None - all new fields are optional, backward compatible with existing campaigns.

### Migration Notes

- Existing personnel default to no traits (all undefined)
- Existing campaigns use default XP amounts (1 for most sources)
- Aging effects can be disabled via `useAgingEffects: false`
