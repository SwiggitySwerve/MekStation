# Implementation Tasks: Markets System

## 1. Foundation - Market Types and Structures
- [ ] 1.1 Define UnitMarketRarity enum (7 levels: MYTHIC to UBIQUITOUS)
- [ ] 1.2 Define UnitMarketType enum (6 types: OPEN, EMPLOYER, MERCENARY, FACTORY, BLACK_MARKET, CIVILIAN)
- [ ] 1.3 Define PersonnelMarketStyle enum (4 styles: DISABLED, MEKHQ, CAM_OPS_REVISED, CAM_OPS_STRICT)
- [ ] 1.4 Define IUnitMarketOffer interface
- [ ] 1.5 Define IPersonnelMarketOffer interface
- [ ] 1.6 Define RARITY_VALUES constant (rarity → numeric value mapping)
- [ ] 1.7 Define MARKET_TYPE_QUALITY constant (market type → quality grade mapping)
- [ ] 1.8 Add 3 market options to ICampaignOptions

## 2. Unit Market Implementation
- [ ] 2.1 Implement calculateItemCount (d6 + rarity_value - 3)
- [ ] 2.2 Implement calculatePricePercent (2d6 → price modifier 85-115%)
- [ ] 2.3 Implement getMarketTypeQuality (BLACK_MARKET 50/50 A/F, others fixed)
- [ ] 2.4 Implement selectRandomUnit (filter by market type and rarity)
- [ ] 2.5 Implement generateUnitOffers (monthly generation for all market type/rarity pairs)
- [ ] 2.6 Implement purchaseUnit (deduct cost, add unit to campaign)
- [ ] 2.7 Implement getEndOfMonth date helper

## 3. Personnel Market Implementation
- [ ] 3.1 Implement calculateDailyRecruits (based on market style)
- [ ] 3.2 Implement selectRandomRole (role-weighted selection)
- [ ] 3.3 Implement selectExperienceLevel (experience distribution)
- [ ] 3.4 Implement generateDefaultSkills (role + experience → skill levels)
- [ ] 3.5 Implement calculateHireCost (role + experience → C-bills)
- [ ] 3.6 Implement getExpirationDays (Elite=3, Veteran=7, Regular=14, Green=30)
- [ ] 3.7 Implement generatePersonnelForDay (daily generation)
- [ ] 3.8 Implement removeExpiredOffers (filter by expiration date)
- [ ] 3.9 Implement hirePerson (deduct cost, create IPerson, add to roster)

## 4. Faction Standing Integration
- [ ] 4.1 Implement getUnitMarketRarityModifier stub (returns 0)
- [ ] 4.2 Implement getRecruitmentTickets stub (returns 5)
- [ ] 4.3 Implement getRecruitmentRollsModifier stub (returns 0)
- [ ] 4.4 Implement getContractPayMultiplier stub (returns 1.0)
- [ ] 4.5 Implement getContractNegotiationModifier stub (returns 0)
- [ ] 4.6 Document Plan 5 dependency

## 5. Market Day Processors
- [ ] 5.1 Create processUnitMarket (monthly refresh on 1st)
- [ ] 5.2 Create processPersonnelMarket (daily refresh + expiration)
- [ ] 5.3 Create processContractMarket (monthly refresh, delegates to contractMarket.ts)
- [ ] 5.4 Register unit market processor with day pipeline
- [ ] 5.5 Register personnel market processor with day pipeline
- [ ] 5.6 Register contract market processor with day pipeline
- [ ] 5.7 Emit market refresh events

## 6. Contract Market Enhancement
- [ ] 6.1 Integrate faction standing negotiation modifier
- [ ] 6.2 Apply contract pay multiplier from faction standing
- [ ] 6.3 Add followup contract generation after mission completion
- [ ] 6.4 Ensure existing contract generation still works
- [ ] 6.5 Document Plan 12 integration (19 contract types)

## 7. Campaign Integration
- [ ] 7.1 Add unitMarketOffers array to ICampaign
- [ ] 7.2 Add personnelMarketOffers array to ICampaign
- [ ] 7.3 Update createCampaign() to initialize empty offer arrays
- [ ] 7.4 Update createCampaignWithData() to accept offer arrays
- [ ] 7.5 Update SerializedCampaignState to include offer arrays
- [ ] 7.6 Update test helpers to include offer arrays

## 8. Markets UI
- [ ] 8.1 Create UnitMarketPage component (browse, filter, purchase)
- [ ] 8.2 Create PersonnelMarketPage component (browse, filter, hire)
- [ ] 8.3 Create EnhancedContractMarketPage component (negotiate, view all types)
- [ ] 8.4 Add rarity badges and quality indicators
- [ ] 8.5 Add expiration countdown for personnel
- [ ] 8.6 Add "Refreshes in N days" indicator for unit market
- [ ] 8.7 Add purchase/hire confirmation dialogs
- [ ] 8.8 Integrate with campaign navigation

## 9. Testing
- [ ] 9.1 Test unit market generation (item count, price, quality)
- [ ] 9.2 Test personnel market generation (daily, expiration)
- [ ] 9.3 Test faction standing stubs (neutral defaults)
- [ ] 9.4 Test market processors (frequency, refresh logic)
- [ ] 9.5 Test purchase/hire functions (transactions, state updates)
- [ ] 9.6 Test contract market enhancement (standing modifiers)
- [ ] 9.7 Test UI components (rendering, interactions)

## 10. Documentation
- [ ] 10.1 Update markets-system spec with implementation details
- [ ] 10.2 Document unit market formulas (item count, price)
- [ ] 10.3 Document personnel market expiration mechanics
- [ ] 10.4 Document faction standing integration points
- [ ] 10.5 Add examples to spec
