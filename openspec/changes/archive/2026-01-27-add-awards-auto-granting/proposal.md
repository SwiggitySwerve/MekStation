# Change: Awards Auto-Granting System

## Why

MekStation has 54 awards in 5 categories with manual granting. MekHQ's auto-award system automatically checks personnel against award criteria on configurable triggers (monthly, post-mission, post-scenario) and grants qualifying awards. This eliminates manual award tracking and ensures consistent recognition of achievements.

## What Changes

- **Auto-Award Engine**: Processes all eligible personnel against enabled award categories
- **13 Award Categories**: Contract, faction hunter, injury, kill, scenario kill, rank, scenario, skill, theatre of war, time, training, misc
- **Multi-Trigger Support**: Monthly (1st of month), post-mission, post-scenario, post-promotion, post-graduation
- **Configuration Options**: Enable/disable per category, "Best Award Only" mode per category
- **Expanded Award Catalog**: ~30 new awards across expanded categories
- **Monthly Processor**: Day processor that runs auto-checks on the 1st of each month
- **Event Generation**: Auto-granted awards appear in day report

## Impact

- Affected specs: `awards`, `day-progression`
- Affected code: New `src/lib/campaign/awards/` directory, new `autoAwardsProcessor`
- Backward compatible: Existing manual award granting still works, auto-awards are opt-in per category
- Migration: No changes needed for existing campaigns (new options default to disabled)
- Some categories stubbed: Theatre of War (needs conflict database), Training/Graduation (no academy system), Formation-level kills (complex tracking)
