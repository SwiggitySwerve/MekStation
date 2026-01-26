# Change: Faction Standing System

## Why
MekStation lacks faction relationship tracking, removing a key strategic layer from campaign gameplay. Without faction standing, player actions have no diplomatic consequences, contracts have no reputation impact, and there's no incentive to maintain good relationships with employers. MekHQ's faction standing system creates meaningful long-term consequences through a 9-level regard system with 11 gameplay effects.

## What Changes
- Implement per-faction regard tracking system with 9 standing levels (Outlawed to Honored)
- Add regard range from -60 to +60 with exact MekHQ thresholds
- Implement 11 gameplay effect modifiers (negotiation, contract pay, recruitment, barracks cost, unit market, support points, command circuit access, outlaw status, batchall, resupply weight)
- Add contract outcome regard deltas (success +1.875, failure -1.875, breach -5.156)
- Implement daily regard decay toward neutral (0.375 per day)
- Add accolade/censure escalation system with 5 levels each
- Create faction standing day processor for decay and escalation checks
- Store standings as `Record<string, IFactionStanding>` on campaign (JSON-serializable)
- Add 11 effect toggle options to ICampaignOptions
- Create faction standing UI with regard bars and effect displays

## Impact
- Affected specs: `campaign-management` (MODIFIED), `faction-standing` (ADDED)
- Affected code:
  - `src/types/campaign/factionStanding/` (NEW) - Standing types, levels, effects
  - `src/lib/campaign/factionStanding/standingService.ts` (NEW) - Standing calculations
  - `src/lib/campaign/factionStanding/standingEffects.ts` (NEW) - 11 effect modifiers
  - `src/lib/campaign/factionStanding/escalation.ts` (NEW) - Accolade/censure logic
  - `src/lib/campaign/processors/factionStandingProcessor.ts` (NEW) - Day pipeline integration
  - `src/types/campaign/Campaign.ts` (MODIFIED) - Add factionStandings field and 11 options
  - `src/components/campaign/FactionStandingPanel.tsx` (NEW) - Standing display UI
  - `src/components/campaign/FactionStandingDetail.tsx` (NEW) - Detailed faction view
- Dependencies: Requires Plan 1 (day processor system)
- Breaking changes: None (new feature, backward compatible, optional field on campaign)
