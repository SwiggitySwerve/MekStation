# Change: Markets System

## Why

MekStation needs a comprehensive market system to simulate the mercenary economy. MekHQ includes three distinct markets: Unit Market (monthly refresh with 7 rarity levels and 6 market types), Personnel Market (daily refresh with experience-based expiration), and Contract Market (monthly refresh with negotiation). These markets are affected by faction standing and provide strategic resource acquisition choices.

Without market systems, campaigns lack:
- Unit acquisition beyond initial force creation
- Personnel recruitment and roster expansion
- Contract selection and negotiation
- Economic simulation and resource scarcity
- Faction standing gameplay effects

## What Changes

- **NEW**: Unit market with 7 rarity levels (Mythic to Ubiquitous) and 6 market types
- **NEW**: Personnel market with MekHQ-style daily generation and experience-based expiration
- **NEW**: Market day processors (unit: monthly, personnel: daily, contract: monthly)
- **NEW**: Purchase/hire functions with transaction integration
- **NEW**: Faction standing integration stubs for all markets
- **MODIFIED**: ICampaignOptions extended with 3 market configuration options
- **MODIFIED**: ICampaign extended with market offer arrays
- **MODIFIED**: Day progression pipeline includes market processors
- **MODIFIED**: Contract market enhanced with faction standing modifiers

## Impact

### Affected Specs
- `markets-system` (NEW) - Market types, generation logic, purchase/hire functions
- `day-progression` (MODIFIED) - Market processors registration
- `campaign-management` (MODIFIED) - Market options and offer storage

### Affected Code
- `src/types/campaign/markets/marketTypes.ts` - Market enums and offer interfaces
- `src/lib/campaign/markets/unitMarket.ts` - Unit market generation with rarity/quality
- `src/lib/campaign/markets/personnelMarket.ts` - Personnel market with role-weighted generation
- `src/lib/campaign/markets/marketStandingIntegration.ts` - Faction standing stubs
- `src/lib/campaign/processors/marketProcessors.ts` - Day processors for all three markets
- `src/lib/campaign/contractMarket.ts` - Enhanced with standing modifiers
- `src/components/campaign/markets/` - Market UI components
- `src/types/campaign/Campaign.ts` - ICampaignOptions and ICampaign extended

### Breaking Changes
None. All market options default to disabled (opt-in), and the system is purely additive.

### Migration Notes
- New `unitMarketMethod` on ICampaignOptions defaults to 'none' (opt-in)
- New `personnelMarketStyle` defaults to 'disabled' (opt-in)
- New `contractMarketMethod` defaults to 'atb_monthly' (existing behavior)
- New `unitMarketOffers` and `personnelMarketOffers` arrays on ICampaign default to empty
- Existing contractMarket.ts functionality preserved (extended, not replaced)
- Faction standing stubs return neutral values until Plan 5 built
- Market offers are ephemeral — not saved between sessions unless campaign saved
- No migration needed — markets are purely additive
