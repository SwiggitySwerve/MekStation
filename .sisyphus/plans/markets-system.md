# Markets System

## Context

### Original Request
Implement MekHQ's three market systems: Unit Market (monthly refresh with 7 rarity levels, 6 market types), Personnel Market (daily refresh with 4 styles), and enhanced Contract Market (monthly refresh with negotiation). Each market is affected by faction standing and processes through the day advancement pipeline.

### Interview Summary
**Key Discussions**:
- Three distinct markets: Unit, Personnel, Contract — each with its own refresh schedule
- Unit Market: 7 rarity levels (Mythic–Ubiquitous), 6 market types (Open/Employer/Mercenary/Factory/Black Market/Civilian)
- Unit item count: `d6(1) + rarity_value + rarity_modifier - 3`
- Unit price: `100 + (price_modifier × 5)` percent of base cost
- Personnel Market: 4 styles (Disabled, MekHQ, CamOps Revised, CamOps Strict), daily generation
- Contract Market: extend existing contractMarket.ts (Plan 12 adds 19 types)
- Faction standing affects all three markets via modifier stubs (Plan 5)
- Each market has its own day processor with different frequencies

**Research Findings**:
- `UnitMarketRarity.java`: 7 levels with rarity values (MYTHIC=-1 to UBIQUITOUS=10)
- `UnitMarketType.java`: 6 types with quality (OPEN=C, EMPLOYER=B, FACTORY=F, BLACK_MARKET=A/F 50/50)
- `AtBMonthlyUnitMarket.java`: Monthly generation with faction standing integration
- `PersonnelMarketMekHQ.java`: MekHQ classic style with population multipliers
- `PersonnelMarketStyle.java`: 4 styles (DISABLED, MEKHQ, CAM_OPS_REVISED, CAM_OPS_STRICT)
- `AtbMonthlyContractMarket.java`: Monthly contract market with followup contracts
- Faction standing effects: unit rarity modifier, recruitment tickets, contract pay multiplier

### Metis Review
**Identified Gaps** (addressed):
- No unit market in MekStation — need IUnitMarketOffer interface
- No personnel market — need IPersonnelMarketOffer with person template
- Unit market needs access to canonical unit database — use existing 4200+ units
- Personnel market daily generation + experience-based removal (better recruits leave faster)
- Contract market enhanced by Plan 12 — this plan adds market infrastructure
- Market data stored on ICampaign (offers arrays)
- Gray Monday modifier (-4 to rarity) for unit market during that era

---

## Work Objectives

### Core Objective
Build three market systems with typed offers, generation logic, faction standing integration, and day processors that refresh markets on configurable schedules.

### Concrete Deliverables
- `src/types/campaign/markets/marketTypes.ts` — Market types, rarity, offers
- `src/lib/campaign/markets/unitMarket.ts` — Unit market generation with rarity/quality
- `src/lib/campaign/markets/personnelMarket.ts` — Personnel market with role-weighted generation
- `src/lib/campaign/markets/marketStandingIntegration.ts` — Faction standing stubs for all markets
- `src/lib/campaign/processors/marketProcessors.ts` — Day processors for all three markets

### Definition of Done
- [ ] Unit market with 7 rarity levels, 6 market types, monthly refresh
- [ ] Personnel market with MekHQ-style generation, daily refresh
- [ ] Contract market enhanced with Plan 12 types and monthly refresh
- [ ] Faction standing modifiers stubbed for all markets
- [ ] Three day processors registered with appropriate frequencies
- [ ] Purchase functions for unit and personnel hiring

### Must Have
- UnitMarketRarity enum (7 levels)
- UnitMarketType enum (6 types)
- PersonnelMarketStyle enum (4 styles)
- IUnitMarketOffer with rarity, quality, price
- IPersonnelMarketOffer with role, experience, hire cost
- Unit market: monthly generation with item count formula
- Personnel market: daily generation with experience-based removal
- Purchase/hire functions with transaction integration
- Faction standing modifier stubs

### Must NOT Have (Guardrails)
- Full MegaMek unit database integration (use simplified unit references)
- Personnel market CamOps Strict implementation (start with MekHQ style only)
- Ship search system (deprecated in MekHQ)
- Auction mechanics
- Import from `CampaignInterfaces.ts`

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: Jest

---

## Task Flow

```
17.1 (Types) → 17.2 (Unit market) → 17.3 (Personnel market) → 17.4 (Standing integration) → 17.5 (Processors) → 17.6 (Contract market enhance) → 17.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 17.1 | Foundation types |
| B | 17.2, 17.3 | Unit and personnel markets are independent |
| C | 17.4 | Standing integration touches both markets |

| Task | Depends On | Reason |
|------|------------|--------|
| 17.2 | 17.1 | Unit market needs rarity/type enums |
| 17.3 | 17.1 | Personnel market needs style/offer types |
| 17.4 | 17.2, 17.3 | Standing modifiers apply to both markets |
| 17.5 | 17.2, 17.3 | Processors need market generation |
| 17.6 | 17.1 | Contract market enhancement uses types |
| 17.7 | 17.5, 17.6 | UI needs everything |

---

## TODOs

- [ ] 17.1 Define Market Types and Structures

  **What to do**:
  - Create `src/types/campaign/markets/marketTypes.ts`:
    ```typescript
    export enum UnitMarketRarity {
      MYTHIC = 'mythic',           // value: -1
      VERY_RARE = 'very_rare',     // value: 0
      RARE = 'rare',               // value: 1
      UNCOMMON = 'uncommon',       // value: 2
      COMMON = 'common',           // value: 3
      VERY_COMMON = 'very_common', // value: 4
      UBIQUITOUS = 'ubiquitous',   // value: 10
    }

    export const RARITY_VALUES: Record<UnitMarketRarity, number> = {
      mythic: -1, very_rare: 0, rare: 1, uncommon: 2,
      common: 3, very_common: 4, ubiquitous: 10,
    };

    export enum UnitMarketType {
      OPEN = 'open',
      EMPLOYER = 'employer',
      MERCENARY = 'mercenary',
      FACTORY = 'factory',
      BLACK_MARKET = 'black_market',
      CIVILIAN = 'civilian',
    }

    export const MARKET_TYPE_QUALITY: Record<UnitMarketType, string> = {
      open: 'C', employer: 'B', mercenary: 'C',
      factory: 'F', black_market: 'A', civilian: 'F',
    };

    export enum PersonnelMarketStyle {
      DISABLED = 'disabled',
      MEKHQ = 'mekhq',
      CAM_OPS_REVISED = 'cam_ops_revised',
      CAM_OPS_STRICT = 'cam_ops_strict',
    }

    export interface IUnitMarketOffer {
      readonly id: string;
      readonly unitId: string;           // reference to canonical unit
      readonly unitName: string;
      readonly rarity: UnitMarketRarity;
      readonly marketType: UnitMarketType;
      readonly quality: string;           // A-F
      readonly pricePercent: number;       // % of base cost (e.g., 105 = 5% markup)
      readonly baseCost: number;           // base C-bill cost
      readonly expirationDate: string;     // ISO date (end of month)
    }

    export interface IPersonnelMarketOffer {
      readonly id: string;
      readonly name: string;
      readonly role: CampaignPersonnelRole;
      readonly experienceLevel: ExperienceLevel;
      readonly skills: Record<string, number>; // skillId → level
      readonly hireCost: number;              // C-bills to hire
      readonly expirationDate: string;        // better personnel expire faster
    }
    ```
  - Add to ICampaignOptions:
    - `unitMarketMethod?: 'none' | 'atb_monthly'` (default 'none')
    - `personnelMarketStyle?: PersonnelMarketStyle` (default 'disabled')
    - `contractMarketMethod?: 'none' | 'atb_monthly' | 'cam_ops'` (default 'atb_monthly')

  **Parallelizable**: YES (foundation)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaignOptions
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\enums\UnitMarketRarity.java` — 7 levels
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\enums\UnitMarketType.java` — 6 types

  **Acceptance Criteria**:
  - [ ] RED: Test UnitMarketRarity has 7 values with correct rarity values
  - [ ] RED: Test UnitMarketType has 6 values with correct quality mapping
  - [ ] RED: Test PersonnelMarketStyle has 4 values
  - [ ] RED: Test IUnitMarketOffer has all required fields
  - [ ] GREEN: Types compile
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define market types with rarity, quality, and offers`
  - Files: `src/types/campaign/markets/marketTypes.ts`

---

- [ ] 17.2 Implement Unit Market

  **What to do**:
  - Create `src/lib/campaign/markets/unitMarket.ts`:
    ```typescript
    export function generateUnitOffers(
      campaign: ICampaign,
      random: RandomFn
    ): IUnitMarketOffer[] {
      const offers: IUnitMarketOffer[] = [];

      for (const [marketType, rarity] of getMarketTypeRarityPairs()) {
        const itemCount = calculateItemCount(rarity, random);
        for (let i = 0; i < itemCount; i++) {
          const unit = selectRandomUnit(marketType, rarity, random);
          const pricePercent = calculatePricePercent(random);
          const quality = getMarketTypeQuality(marketType, random);
          offers.push({
            id: generateId(),
            unitId: unit.id,
            unitName: unit.name,
            rarity,
            marketType,
            quality,
            pricePercent,
            baseCost: unit.baseCost,
            expirationDate: getEndOfMonth(campaign.currentDate),
          });
        }
      }

      return offers;
    }

    export function calculateItemCount(rarity: UnitMarketRarity, random: RandomFn): number {
      const roll = Math.floor(random() * 6) + 1; // 1d6
      const rarityValue = RARITY_VALUES[rarity];
      return Math.max(0, roll + rarityValue - 3);
    }

    export function calculatePricePercent(random: RandomFn): number {
      const roll = Math.floor(random() * 6) + 1 + Math.floor(random() * 6) + 1; // 2d6
      let modifier = 0;
      if (roll <= 2) modifier = 3;
      else if (roll <= 3) modifier = 2;
      else if (roll <= 5) modifier = 1;
      else if (roll <= 8) modifier = 0;
      else if (roll <= 10) modifier = -1;
      else if (roll <= 11) modifier = -2;
      else modifier = -3;
      return 100 + (modifier * 5);
    }

    export function purchaseUnit(
      campaign: ICampaign,
      offerId: string
    ): { updatedCampaign: ICampaign; success: boolean; reason?: string };
    ```

  **Must NOT do**:
  - Full unit database search (use simplified random selection from available units)
  - Unit refitting market

  **Parallelizable**: YES (with 17.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\unitMarket\AtBMonthlyUnitMarket.java` — Generation logic

  **Acceptance Criteria**:
  - [ ] RED: Test item count = d6 + rarity - 3 (COMMON rarity=3: range 1-6)
  - [ ] RED: Test MYTHIC rarity (-1) produces few/no items
  - [ ] RED: Test UBIQUITOUS rarity (10) produces many items
  - [ ] RED: Test price percent ranges from 85-115%
  - [ ] RED: Test BLACK_MARKET quality is 50/50 A or F
  - [ ] RED: Test deterministic with seeded random
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement unit market with 7 rarity levels and 6 types`
  - Files: `src/lib/campaign/markets/unitMarket.ts`

---

- [ ] 17.3 Implement Personnel Market

  **What to do**:
  - Create `src/lib/campaign/markets/personnelMarket.ts`:
    ```typescript
    export function generatePersonnelForDay(
      campaign: ICampaign,
      random: RandomFn
    ): IPersonnelMarketOffer[] {
      const style = campaign.options.personnelMarketStyle ?? PersonnelMarketStyle.DISABLED;
      if (style === PersonnelMarketStyle.DISABLED) return [];

      const offers: IPersonnelMarketOffer[] = [];
      const numToGenerate = calculateDailyRecruits(campaign, random);

      for (let i = 0; i < numToGenerate; i++) {
        const role = selectRandomRole(random);
        const experience = selectExperienceLevel(random);
        const skills = generateDefaultSkills(role, experience); // Plan 7 default skills
        const hireCost = calculateHireCost(role, experience);
        const daysToExpire = getExpirationDays(experience); // Better = shorter stay

        offers.push({
          id: generateId(),
          name: generateRandomName(random),
          role,
          experienceLevel: experience,
          skills,
          hireCost,
          expirationDate: addDays(campaign.currentDate, daysToExpire),
        });
      }

      return offers;
    }

    // Better experienced personnel leave the market faster
    export function getExpirationDays(experience: ExperienceLevel): number {
      switch (experience) {
        case ExperienceLevel.ELITE: return 3;     // 3 days
        case ExperienceLevel.VETERAN: return 7;   // 1 week
        case ExperienceLevel.REGULAR: return 14;  // 2 weeks
        case ExperienceLevel.GREEN: return 30;    // 1 month
      }
    }

    export function removeExpiredOffers(
      offers: IPersonnelMarketOffer[],
      currentDate: string
    ): IPersonnelMarketOffer[];

    export function hirePerson(
      campaign: ICampaign,
      offerId: string
    ): { updatedCampaign: ICampaign; hiredPerson: IPerson | null; reason?: string };
    ```

  **Must NOT do**:
  - CamOps market implementations (start with MekHQ style only)
  - Detailed population/system status modifiers

  **Parallelizable**: YES (with 17.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\personnelMarket\markets\PersonnelMarketMekHQ.java` — MekHQ style

  **Acceptance Criteria**:
  - [ ] RED: Test disabled style generates no recruits
  - [ ] RED: Test MekHQ style generates role-weighted recruits
  - [ ] RED: Test Elite personnel expire in 3 days
  - [ ] RED: Test Green personnel expire in 30 days
  - [ ] RED: Test removeExpiredOffers removes past-date offers
  - [ ] RED: Test hirePerson creates IPerson from offer
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement personnel market with daily generation`
  - Files: `src/lib/campaign/markets/personnelMarket.ts`

---

- [ ] 17.4 Integrate Faction Standing with Markets

  **What to do**:
  - Create `src/lib/campaign/markets/marketStandingIntegration.ts`:
    ```typescript
    /** @stub Plan 5 provides actual faction standing values */

    export function getUnitMarketRarityModifier(campaign: ICampaign): number {
      // Stub: returns 0 (no modifier) until Plan 5 built
      return 0;
    }

    export function getRecruitmentTickets(campaign: ICampaign): number {
      // Stub: returns 5 (default) until Plan 5 built
      return 5;
    }

    export function getRecruitmentRollsModifier(campaign: ICampaign): number {
      // Stub: returns 0 until Plan 5 built
      return 0;
    }

    export function getContractPayMultiplier(campaign: ICampaign): number {
      // Stub: returns 1.0 until Plan 5 built
      return 1.0;
    }

    export function getContractNegotiationModifier(campaign: ICampaign): number {
      // Stub: returns 0 until Plan 5 built
      return 0;
    }
    ```

  **Parallelizable**: NO (depends on 17.2, 17.3)

  **References**:
  - `.sisyphus/plans/faction-standing-system.md` — Plan 5 faction standing

  **Acceptance Criteria**:
  - [ ] RED: Test all stub functions return neutral defaults
  - [ ] RED: Test stub functions accept ICampaign parameter
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add faction standing market integration stubs`
  - Files: `src/lib/campaign/markets/marketStandingIntegration.ts`

---

- [ ] 17.5 Register Market Day Processors

  **What to do**:
  - Create `src/lib/campaign/processors/marketProcessors.ts`:
    ```typescript
    // Unit market: monthly refresh
    export function processUnitMarket(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IMarketEvent[] } {
      if (!isFirstOfMonth(campaign.currentDate)) return { updatedCampaign: campaign, events: [] };
      const offers = generateUnitOffers(campaign, random);
      return {
        updatedCampaign: { ...campaign, unitMarketOffers: offers },
        events: [{ type: 'market_refresh', market: 'unit', offerCount: offers.length }],
      };
    }

    // Personnel market: daily refresh
    export function processPersonnelMarket(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IMarketEvent[] } {
      // Remove expired offers
      const remaining = removeExpiredOffers(campaign.personnelMarketOffers ?? [], campaign.currentDate);
      // Add new daily recruits
      const newOffers = generatePersonnelForDay(campaign, random);
      return {
        updatedCampaign: { ...campaign, personnelMarketOffers: [...remaining, ...newOffers] },
        events: newOffers.length > 0 ? [{ type: 'market_refresh', market: 'personnel', offerCount: newOffers.length }] : [],
      };
    }

    // Contract market: monthly refresh (delegates to contractMarket.ts)
    export function processContractMarket(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IMarketEvent[] };
    ```

  **Parallelizable**: NO (depends on 17.2, 17.3)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)

  **Acceptance Criteria**:
  - [ ] RED: Test unit market only refreshes on 1st of month
  - [ ] RED: Test personnel market refreshes daily
  - [ ] RED: Test expired personnel offers removed
  - [ ] RED: Test new offers added to campaign state
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): register market day processors`
  - Files: `src/lib/campaign/processors/marketProcessors.ts`

---

- [ ] 17.6 Enhance Contract Market

  **What to do**:
  - Update existing `src/lib/campaign/contractMarket.ts`:
    - Integrate with Plan 12's 19 contract types
    - Add faction standing negotiation modifier (stub from 17.4)
    - Add followup contract generation after mission completion
    - Apply contract pay multiplier from faction standing

  **Must NOT do**:
  - Break existing contract generation
  - Remove existing generateContracts() function (extend it)

  **Parallelizable**: YES (with 17.2, 17.3)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts` — Current contract market
  - `.sisyphus/plans/contract-types-expansion.md` — Plan 12

  **Acceptance Criteria**:
  - [ ] RED: Test contract market uses 19 types (from Plan 12)
  - [ ] RED: Test faction standing modifier applied to negotiations
  - [ ] RED: Test followup contract generation
  - [ ] RED: Test existing contract generation still works
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): enhance contract market with standing and followups`
  - Files: `src/lib/campaign/contractMarket.ts`

---

- [ ] 17.7 Create Markets UI

  **What to do**:
  - **Unit Market Page**: Browse available units with rarity badges, quality indicators, price
    - Filter by rarity, market type, unit type
    - Purchase button with transaction confirmation
    - "Refreshes in N days" indicator
  - **Personnel Market Page**: Browse recruitable personnel with skills, experience, hire cost
    - Filter by role, experience level
    - Hire button with cost confirmation
    - Expiration countdown per recruit
  - **Enhanced Contract Market Page**: negotiate terms, view all 19 types
    - Integrates with Plan 12 contract negotiation UI

  **Parallelizable**: NO (depends on 17.5, 17.6)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] Unit market shows offers with rarity and quality badges
  - [ ] Purchase unit deducts C-bills and adds unit
  - [ ] Personnel market shows recruits with skills and expiration
  - [ ] Hire creates new person in roster
  - [ ] Market refresh indicator shows days until next refresh
  - [ ] Manual verification: dev server → advance to 1st → verify unit market refresh → purchase → verify

  **Commit**: YES
  - Message: `feat(ui): add unit market, personnel market, and enhanced contract market`
  - Files: market UI components

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 17.1 | `feat(campaign): define market types` | `npm test` |
| 17.2 | `feat(campaign): implement unit market` | `npm test` |
| 17.3 | `feat(campaign): implement personnel market` | `npm test` |
| 17.4 | `feat(campaign): add market standing stubs` | `npm test` |
| 17.5 | `feat(campaign): register market processors` | `npm test` |
| 17.6 | `feat(campaign): enhance contract market` | `npm test` |
| 17.7 | `feat(ui): add market pages` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] Unit market: 7 rarity levels, 6 types, monthly refresh
- [ ] Personnel market: daily generation, experience-based expiration
- [ ] Contract market: enhanced with 19 types and standing modifiers
- [ ] Faction standing stubs for all markets
- [ ] Three day processors registered
- [ ] Purchase/hire functions with transactions
- [ ] Existing contract market tests unbroken

---

## Registration Snippets

```typescript
// Unit market (monthly)
registry.register({
  id: 'unit-market-processor',
  name: 'Unit Market Refresh',
  phase: 'markets',
  frequency: 'daily', // checks isFirstOfMonth internally
  process: processUnitMarket,
  optionGate: (opts) => opts.unitMarketMethod !== 'none',
});

// Personnel market (daily)
registry.register({
  id: 'personnel-market-processor',
  name: 'Personnel Market Refresh',
  phase: 'markets',
  frequency: 'daily',
  process: processPersonnelMarket,
  optionGate: (opts) => opts.personnelMarketStyle !== 'disabled',
});

// Contract market (monthly)
registry.register({
  id: 'contract-market-processor',
  name: 'Contract Market Refresh',
  phase: 'markets',
  frequency: 'daily', // checks isFirstOfMonth internally
  process: processContractMarket,
  optionGate: (opts) => opts.contractMarketMethod !== 'none',
});
```

---

## Migration Notes

- New `unitMarketMethod` on ICampaignOptions defaults to 'none' (opt-in)
- New `personnelMarketStyle` defaults to 'disabled' (opt-in)
- New `contractMarketMethod` defaults to 'atb_monthly' (existing behavior)
- New `unitMarketOffers` and `personnelMarketOffers` arrays on ICampaign — default empty
- Existing contractMarket.ts functionality preserved (extended, not replaced)
- Faction standing stubs return neutral values until Plan 5 built
- Market offers are ephemeral — not saved between sessions unless campaign saved
- No migration needed — markets are purely additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
