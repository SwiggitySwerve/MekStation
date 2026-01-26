# Acquisition & Supply Chain

## Context

### Original Request
Implement MekHQ's acquisition system: availability ratings (A through X), acquisition rolls (2d6 vs target number), planetary modifiers (tech/industry/output), delivery time calculation, and a shopping list / auto-logistics queue that processes daily through the day advancement pipeline.

### Interview Summary
**Key Discussions**:
- Availability ratings A–X map to target numbers for 2d6 rolls (A=easy, X=impossible)
- Two TN tables: regular parts vs consumables (consumables are easier)
- Planetary modifier stack: tech sophistication + industry + output ratings
- Delivery time: `max(1, (7 + 1d6 + availability) / 4)` in configurable units
- Negotiator skill modifier from Plan 7 (stub if not built)
- Clan parts penalty (+3 TN during 3050–3070)
- Auto-logistics scans units for needed parts and auto-queues acquisition requests
- Injectable RandomFn for testing, TDD approach

**Research Findings**:
- `Procurement.java` (lines 226–270): Availability → TN mapping for regular and consumable parts
- `Campaign.java` (lines 7780–7862): Full target roll calculation with all modifiers
- `Campaign.java` (lines 9289–9331): Delivery time formula (BASE_MODIFIER=7 from CamOps p51)
- `PartsAcquisitionService.java`: Auto-logistics with stock target percentages
- `ShoppingList.java`: Queue management with cooldown/retry logic
- `Planet.java` (lines 659–738): Planetary socio-industrial modifiers (tech/industry/output)
- Impossible conditions: Industry F, Output F, or Regressed tech block all acquisitions
- Extinction handling: hard extinction → X rating; soft extinction within 10 years → 50% chance X

### Metis Review
**Identified Gaps** (addressed):
- No planetary database in MekStation yet — use simplified IPlanetaryRatings on campaign location or contract system
- Parts inventory system doesn't exist — acquisition results need somewhere to land (stub IPartsInventory)
- Auto-logistics needs unit maintenance state to know what parts are needed — use existing IRepairJob
- Clan parts penalty is era-specific — need era/year context from campaign date
- Negotiator assignment: which person performs acquisition? Use best-skilled admin or explicit quartermaster

---

## Work Objectives

### Core Objective
Build a complete acquisition pipeline: availability rating lookup → target number calculation with modifier stack → 2d6 roll → delivery time → shopping list queue, all processing daily through the day advancement pipeline.

### Concrete Deliverables
- `src/types/campaign/acquisition/acquisitionTypes.ts` — Availability ratings, request/result interfaces
- `src/lib/campaign/acquisition/acquisitionRoll.ts` — TN calculation and roll logic
- `src/lib/campaign/acquisition/planetaryModifiers.ts` — Planetary tech/industry/output modifiers
- `src/lib/campaign/acquisition/deliveryTime.ts` — Delivery time calculation
- `src/lib/campaign/acquisition/shoppingList.ts` — Shopping list queue management
- `src/lib/campaign/processors/acquisitionProcessor.ts` — Day processor for acquisitions and deliveries

### Definition of Done
- [ ] Availability ratings A–X with TN lookup for regular and consumable parts
- [ ] Acquisition roll: 2d6 vs TN with full modifier stack (negotiator, planetary, clan penalty, contract)
- [ ] Planetary modifiers from tech/industry/output ratings
- [ ] Delivery time calculated per MekHQ formula
- [ ] Shopping list queue with add/remove/retry logic
- [ ] Day processor attempts pending acquisitions and delivers arrived items
- [ ] Auto-logistics scan generates acquisition requests for needed parts

### Must Have
- AvailabilityRating enum (A–X) with TN tables (regular and consumable)
- Full modifier stack: negotiator skill, planetary, clan penalty, contract availability
- Delivery time: `max(1, (7 + 1d6 + availability) / 4)` in configurable transit units
- Shopping list with retry/cooldown
- Day processor registered in pipeline
- Injectable RandomFn for all rolls

### Must NOT Have (Guardrails)
- Full planetary database (simplified ratings on campaign/contract location)
- Parts manufacturing or crafting
- Detailed inventory management beyond delivery tracking
- Faction-level trade embargoes (defer)
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
9.1 (Types) → 9.2 (Roll calc) → 9.3 (Planetary mods) → 9.4 (Delivery time) → 9.5 (Shopping list) → 9.6 (Day processor) → 9.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 9.1 | Foundation — all others depend on types |
| B | 9.2, 9.3, 9.4 | Roll, planetary, delivery are independent once types exist |

| Task | Depends On | Reason |
|------|------------|--------|
| 9.2 | 9.1 | Roll needs availability types |
| 9.3 | 9.1 | Planetary needs rating types |
| 9.4 | 9.1 | Delivery needs availability index |
| 9.5 | 9.2, 9.4 | Shopping list needs roll + delivery |
| 9.6 | 9.5 | Processor orchestrates shopping list |
| 9.7 | 9.6 | UI needs everything |

---

## TODOs

- [x] 9.1 Define Acquisition Types and Availability Ratings

  **What to do**:
  - Create `src/types/campaign/acquisition/acquisitionTypes.ts`:
    ```typescript
    export enum AvailabilityRating {
      A = 'A', B = 'B', C = 'C', D = 'D', E = 'E', F = 'F', X = 'X',
    }

    // Regular parts TN table (MekHQ Procurement.java lines 226-270)
    export const REGULAR_PART_TN: Record<AvailabilityRating, number> = {
      A: 3, B: 4, C: 6, D: 8, E: 10, F: 11, X: 13,
    };

    // Consumable/ammo TN table (easier to acquire)
    export const CONSUMABLE_TN: Record<AvailabilityRating, number> = {
      A: 2, B: 3, C: 4, D: 6, E: 8, F: 10, X: 13,
    };

    export type AcquisitionStatus = 'pending' | 'rolling' | 'in_transit' | 'delivered' | 'failed';

    export interface IAcquisitionRequest {
      readonly id: string;
      readonly partId: string;
      readonly partName: string;
      readonly quantity: number;
      readonly availability: AvailabilityRating;
      readonly isConsumable: boolean;
      readonly status: AcquisitionStatus;
      readonly orderedDate?: string;       // ISO date when roll succeeded
      readonly deliveryDate?: string;      // ISO date when part arrives
      readonly attempts: number;           // number of roll attempts
      readonly lastAttemptDate?: string;   // cooldown tracking
    }

    export interface IAcquisitionResult {
      readonly requestId: string;
      readonly success: boolean;
      readonly roll: number;               // 2d6 result
      readonly targetNumber: number;       // TN to beat
      readonly margin: number;             // roll - TN
      readonly transitDays: number;        // 0 if failed
      readonly modifiers: readonly { name: string; value: number }[];
    }

    export interface IShoppingList {
      readonly items: readonly IAcquisitionRequest[];
    }
    ```
  - Add to ICampaignOptions (all optional):
    - `useAcquisitionSystem?: boolean` (default false)
    - `usePlanetaryModifiers?: boolean` (default true)
    - `acquisitionTransitUnit?: 'day' | 'week' | 'month'` (default 'month')
    - `clanPartsPenalty?: boolean` (default true)

  **Must NOT do**:
  - Create a full parts catalog (parts come from repair system)
  - Define unit acquisition (that's Plan 17 Markets)

  **Parallelizable**: YES (foundation task)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaignOptions
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\procurement\Procurement.java:226-270` — TN tables

  **Acceptance Criteria**:
  - [ ] RED: Test AvailabilityRating has 7 values (A–X)
  - [ ] RED: Test REGULAR_PART_TN[D] === 8
  - [ ] RED: Test CONSUMABLE_TN[D] === 6
  - [ ] RED: Test IAcquisitionRequest has all required fields
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define acquisition types and availability ratings`
  - Files: `src/types/campaign/acquisition/acquisitionTypes.ts`

---

- [x] 9.2 Implement Acquisition Roll Calculator

  **What to do**:
  - Create `src/lib/campaign/acquisition/acquisitionRoll.ts`:
    ```typescript
    export interface IAcquisitionModifier {
      readonly name: string;
      readonly value: number;
    }

    export function calculateAcquisitionTN(
      availability: AvailabilityRating,
      isConsumable: boolean,
      modifiers: readonly IAcquisitionModifier[]
    ): number {
      const baseTN = isConsumable ? CONSUMABLE_TN[availability] : REGULAR_PART_TN[availability];
      const totalMod = modifiers.reduce((sum, m) => sum + m.value, 0);
      return baseTN + totalMod;
    }

    export function getAcquisitionModifiers(
      campaign: ICampaign,
      request: IAcquisitionRequest
    ): IAcquisitionModifier[] {
      const mods: IAcquisitionModifier[] = [];

      // Negotiator skill modifier (Plan 7 stub)
      const negotiator = getBestNegotiator(campaign);
      mods.push({ name: 'Negotiator', value: getNegotiatorModifier(negotiator) });

      // Planetary modifiers (Plan 9.3)
      if (campaign.options.usePlanetaryModifiers) {
        mods.push(...getPlanetaryModifiers(campaign));
      }

      // Clan parts penalty (3050-3070 for non-Clan factions)
      if (campaign.options.clanPartsPenalty && isClanPart(request) && !isClanFaction(campaign) && isInClanPenaltyEra(campaign)) {
        mods.push({ name: 'Clan Parts', value: 3 });
      }

      // Contract availability modifier
      const contract = getActiveContract(campaign);
      if (contract) {
        mods.push({ name: 'Contract', value: getContractAvailabilityMod(contract) });
      }

      return mods;
    }

    /** @stub Returns +4 (no negotiator). Plan 7 replaces with actual skill check. */
    function getNegotiatorModifier(person: IPerson | null): number {
      if (!person) return 4; // No negotiator penalty
      return 0; // Default: regular skill
    }

    export function performAcquisitionRoll(
      campaign: ICampaign,
      request: IAcquisitionRequest,
      random: RandomFn
    ): IAcquisitionResult;
    ```

  **Must NOT do**:
  - Implement extinction logic (defer)
  - Allow roll without availability rating

  **Parallelizable**: YES (with 9.3, 9.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\procurement\Procurement.java:138-150` — Roll logic
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Campaign.java:7780-7862` — Target roll calculation
  - `E:\Projects\MekStation\src\lib\campaign\contractMarket.ts:114` — RandomFn pattern

  **Acceptance Criteria**:
  - [ ] RED: Test availability D regular part → baseTN 8
  - [ ] RED: Test no negotiator adds +4 modifier
  - [ ] RED: Test Clan parts in 3055 adds +3
  - [ ] RED: Test success when roll >= TN
  - [ ] RED: Test failure when roll < TN
  - [ ] RED: Test deterministic with seeded random
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement acquisition roll with modifier stack`
  - Files: `src/lib/campaign/acquisition/acquisitionRoll.ts`

---

- [ ] 9.3 Implement Planetary Modifier System

  **What to do**:
  - Create `src/lib/campaign/acquisition/planetaryModifiers.ts`:
    ```typescript
    export enum PlanetaryRating {
      A = 'A', B = 'B', C = 'C', D = 'D', E = 'E', F = 'F',
    }

    export interface IPlanetaryRatings {
      readonly tech: PlanetaryRating;      // Technology sophistication
      readonly industry: PlanetaryRating;  // Industrial capacity
      readonly output: PlanetaryRating;    // Manufacturing output
    }

    // Tech sophistication modifier (MekHQ Planet.java lines 729-734)
    export const TECH_MODIFIER: Record<PlanetaryRating, number> = {
      A: -2, B: -1, C: 0, D: 1, E: 2, F: 8,
    };

    export const INDUSTRY_MODIFIER: Record<PlanetaryRating, number | 'IMPOSSIBLE'> = {
      A: -3, B: -2, C: -1, D: 0, E: 1, F: 'IMPOSSIBLE',
    };

    export const OUTPUT_MODIFIER: Record<PlanetaryRating, number | 'IMPOSSIBLE'> = {
      A: -3, B: -2, C: -1, D: 0, E: 1, F: 'IMPOSSIBLE',
    };

    export function getPlanetaryModifiers(campaign: ICampaign): IAcquisitionModifier[] {
      const ratings = campaign.options.planetaryRatings ?? DEFAULT_RATINGS;
      const mods: IAcquisitionModifier[] = [];

      mods.push({ name: 'Tech', value: TECH_MODIFIER[ratings.tech] });

      const indMod = INDUSTRY_MODIFIER[ratings.industry];
      if (indMod === 'IMPOSSIBLE') return [{ name: 'Industry F', value: 99 }]; // Auto-fail
      mods.push({ name: 'Industry', value: indMod });

      const outMod = OUTPUT_MODIFIER[ratings.output];
      if (outMod === 'IMPOSSIBLE') return [{ name: 'Output F', value: 99 }];
      mods.push({ name: 'Output', value: outMod });

      return mods;
    }

    export const DEFAULT_RATINGS: IPlanetaryRatings = { tech: 'C', industry: 'C', output: 'C' };
    ```
  - Add `planetaryRatings?: IPlanetaryRatings` to ICampaignOptions

  **Must NOT do**:
  - Build a full planetary database (use simplified per-campaign ratings)
  - USILR rating system (agriculture/raw materials not needed for acquisition)

  **Parallelizable**: YES (with 9.2, 9.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\universe\Planet.java:659-738` — Planetary modifiers
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\universe\SocioIndustrialData.java` — USILR ratings

  **Acceptance Criteria**:
  - [ ] RED: Test default ratings (C/C/C) give total modifier of -2 (0 + -1 + -1)
  - [ ] RED: Test tech A gives -2 modifier
  - [ ] RED: Test industry F returns IMPOSSIBLE (auto-fail)
  - [ ] RED: Test output F returns IMPOSSIBLE (auto-fail)
  - [ ] RED: Test best case (A/A/A) gives -8 total modifier
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement planetary acquisition modifiers`
  - Files: `src/lib/campaign/acquisition/planetaryModifiers.ts`

---

- [ ] 9.4 Implement Delivery Time Calculation

  **What to do**:
  - Create `src/lib/campaign/acquisition/deliveryTime.ts`:
    ```typescript
    const BASE_MODIFIER = 7; // CamOps p51

    export function calculateDeliveryTime(
      availability: AvailabilityRating,
      transitUnit: 'day' | 'week' | 'month',
      random: RandomFn
    ): number {
      const availIndex = Object.values(AvailabilityRating).indexOf(availability);
      const roll = Math.floor(random() * 6) + 1; // 1d6
      const total = Math.max(1, Math.floor((BASE_MODIFIER + roll + availIndex) / 4));
      return total; // in transit units
    }

    export function calculateDeliveryDate(
      orderDate: string,       // ISO date
      transitUnits: number,
      transitUnit: 'day' | 'week' | 'month'
    ): string {
      const date = new Date(orderDate);
      switch (transitUnit) {
        case 'day': date.setDate(date.getDate() + transitUnits); break;
        case 'week': date.setDate(date.getDate() + transitUnits * 7); break;
        case 'month': date.setMonth(date.getMonth() + transitUnits); break;
      }
      return date.toISOString();
    }

    export function hasDeliveryArrived(request: IAcquisitionRequest, currentDate: string): boolean {
      if (!request.deliveryDate) return false;
      return new Date(currentDate) >= new Date(request.deliveryDate);
    }
    ```

  **Must NOT do**:
  - Interplanetary jump calculations (simplify to flat transit)
  - HPG communication delays

  **Parallelizable**: YES (with 9.2, 9.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Campaign.java:9289-9331` — Transit time formula

  **Acceptance Criteria**:
  - [ ] RED: Test availability A + roll 1 → max(1, (7+1+0)/4) = 2 months
  - [ ] RED: Test availability D + roll 4 → max(1, (7+4+3)/4) = 3 months
  - [ ] RED: Test minimum delivery is 1 unit
  - [ ] RED: Test delivery date calculation for days/weeks/months
  - [ ] RED: Test hasDeliveryArrived returns true when date passed
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement acquisition delivery time calculation`
  - Files: `src/lib/campaign/acquisition/deliveryTime.ts`

---

- [ ] 9.5 Implement Shopping List and Auto-Logistics

  **What to do**:
  - Create `src/lib/campaign/acquisition/shoppingList.ts`:
    ```typescript
    export function addToShoppingList(
      shoppingList: IShoppingList,
      partId: string,
      partName: string,
      quantity: number,
      availability: AvailabilityRating,
      isConsumable: boolean
    ): IShoppingList;

    export function removeFromShoppingList(
      shoppingList: IShoppingList,
      requestId: string
    ): IShoppingList;

    export function getPendingRequests(shoppingList: IShoppingList): IAcquisitionRequest[];
    export function getInTransitRequests(shoppingList: IShoppingList): IAcquisitionRequest[];

    // Auto-logistics: scan units for needed parts based on stock targets
    export const AUTO_LOGISTICS_TARGETS: Record<string, number> = {
      armor: 1.0,       // 100% stock target
      ammunition: 1.0,
      actuator: 1.0,
      heatSink: 0.5,    // 50%
      jumpJet: 0.5,
      weapon: 0.5,
      mekHead: 0.4,     // 40%
      mekLocation: 0.25, // 25%
      engine: 0.0,       // Don't auto-order
    };

    /** @stub Scans campaign units for needed parts. Plan 3 (Repair) provides actual part data. */
    export function scanForNeededParts(campaign: ICampaign): IAcquisitionRequest[] {
      // Stub: returns empty array until repair system provides part needs
      return [];
    }

    export function processAutoLogistics(campaign: ICampaign): IShoppingList;
    ```

  **Must NOT do**:
  - Build inventory management system
  - Track individual part instances
  - Implement part refit logic

  **Parallelizable**: NO (depends on 9.2, 9.4)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\service\PartsAcquisitionService.java` — Auto-logistics
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\ShoppingList.java` — Queue management

  **Acceptance Criteria**:
  - [ ] RED: Test addToShoppingList creates pending request
  - [ ] RED: Test removeFromShoppingList removes by ID
  - [ ] RED: Test getPendingRequests filters status=pending
  - [ ] RED: Test getInTransitRequests filters status=in_transit
  - [ ] RED: Test auto-logistics targets are correct percentages
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement acquisition shopping list and auto-logistics`
  - Files: `src/lib/campaign/acquisition/shoppingList.ts`

---

- [ ] 9.6 Create Acquisition Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/acquisitionProcessor.ts`:
    ```typescript
    export function processAcquisitions(
      campaign: ICampaign,
      random: RandomFn
    ): { updatedCampaign: ICampaign; events: IAcquisitionEvent[] } {
      const events: IAcquisitionEvent[] = [];

      // 1. Process deliveries — check in-transit items that have arrived
      for (const request of getInTransitRequests(campaign.shoppingList)) {
        if (hasDeliveryArrived(request, campaign.currentDate)) {
          // Mark as delivered, add to inventory
          events.push({ type: 'delivery', request, ... });
        }
      }

      // 2. Attempt acquisition rolls for pending items (one attempt per item per day)
      for (const request of getPendingRequests(campaign.shoppingList)) {
        if (isOnCooldown(request, campaign.currentDate)) continue;
        const result = performAcquisitionRoll(campaign, request, random);
        if (result.success) {
          // Calculate delivery date and mark in-transit
          const transitUnits = calculateDeliveryTime(request.availability, campaign.options.acquisitionTransitUnit ?? 'month', random);
          events.push({ type: 'acquisition_success', request, result, transitUnits });
        } else {
          events.push({ type: 'acquisition_failure', request, result });
        }
      }

      // 3. Auto-logistics: scan for needed parts (if enabled)
      if (campaign.options.useAutoLogistics) {
        const needed = scanForNeededParts(campaign);
        for (const req of needed) {
          events.push({ type: 'auto_queue', request: req });
        }
      }

      return { updatedCampaign, events };
    }
    ```

  **Must NOT do**:
  - Process more than one roll per item per day
  - Auto-purchase without player confirmation (except auto-logistics queue)

  **Parallelizable**: NO (depends on 9.5)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts` — Current processors
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor (Plan 1)

  **Acceptance Criteria**:
  - [ ] RED: Test delivery arrives when date reached
  - [ ] RED: Test pending items get acquisition roll
  - [ ] RED: Test successful roll sets in-transit with delivery date
  - [ ] RED: Test failed roll increments attempts and sets cooldown
  - [ ] RED: Test cooldown prevents re-roll same day
  - [ ] RED: Test auto-logistics queues needed parts
  - [ ] GREEN: All tests pass
  - [ ] Existing dayAdvancement tests still pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add acquisition day processor for rolls and deliveries`
  - Files: `src/lib/campaign/processors/acquisitionProcessor.ts`

---

- [ ] 9.7 Create Acquisition UI

  **What to do**:
  - Create `src/components/campaign/AcquisitionPanel.tsx`:
    - Shopping list view with status indicators (pending/rolling/in-transit/delivered)
    - Manual acquisition: select part, show TN breakdown, roll button
    - Delivery tracker: timeline of incoming parts with ETA
    - Planetary modifier display (current ratings and their effects)
    - Auto-logistics toggle and stock target configuration
  - Integrate into campaign dashboard

  **Must NOT do**:
  - Parts catalog browser (defer)
  - Drag-and-drop shopping list reordering

  **Parallelizable**: NO (depends on 9.6)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] Shopping list shows all requests with status
  - [ ] Manual acquisition shows TN breakdown before rolling
  - [ ] Delivery tracker shows incoming parts with dates
  - [ ] Planetary ratings displayed with modifier breakdown
  - [ ] Manual verification: dev server → acquisition panel → add part → roll → verify

  **Commit**: YES
  - Message: `feat(ui): add acquisition panel with shopping list and delivery tracker`
  - Files: `src/components/campaign/AcquisitionPanel.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 9.1 | `feat(campaign): define acquisition types and availability ratings` | `npm test` |
| 9.2 | `feat(campaign): implement acquisition roll with modifier stack` | `npm test` |
| 9.3 | `feat(campaign): implement planetary acquisition modifiers` | `npm test` |
| 9.4 | `feat(campaign): implement delivery time calculation` | `npm test` |
| 9.5 | `feat(campaign): implement shopping list and auto-logistics` | `npm test` |
| 9.6 | `feat(campaign): add acquisition day processor` | `npm test` |
| 9.7 | `feat(ui): add acquisition panel` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] Availability ratings A–X with correct TN tables
- [ ] Acquisition roll with full modifier stack (negotiator, planetary, clan, contract)
- [ ] Planetary modifiers with impossible conditions (Industry/Output F)
- [ ] Delivery time per MekHQ formula
- [ ] Shopping list with add/remove/retry
- [ ] Day processor handles rolls and deliveries
- [ ] Auto-logistics stub ready for Plan 3 integration

---

## Registration Snippet

```typescript
registry.register({
  id: 'acquisition-processor',
  name: 'Acquisition & Deliveries',
  phase: 'logistics',
  frequency: 'daily',
  process: processAcquisitions,
  optionGate: (opts) => opts.useAcquisitionSystem === true,
});
```

---

## Migration Notes

- New `useAcquisitionSystem` option on ICampaignOptions defaults to false (opt-in)
- New `planetaryRatings` option defaults to C/C/C (neutral modifiers)
- New `acquisitionTransitUnit` option defaults to 'month'
- Shopping list stored as optional field on ICampaign — existing campaigns have no shopping list
- Negotiator modifier stubbed at +4 (no negotiator) until Plan 7 built
- Auto-logistics `scanForNeededParts()` stubbed empty until Plan 3 provides part data
- No migration needed for saved campaigns — acquisition system is purely additive

---

*Plan generated by Prometheus. Execute with `/start-work`.*
