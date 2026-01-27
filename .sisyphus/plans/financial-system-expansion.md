# Financial System Expansion

## Context

### Original Request
Expand MekStation's financial system from flat daily costs (50 C-bills/person, 100 C-bills/unit) to MekHQ's comprehensive financial model: role-based salaries with XP multipliers, monthly cost processing, loan amortization, taxes, price multipliers by tech/condition, and the shares system.

### Interview Summary
**Key Discussions**:
- Exact MekHQ formula parity
- Current Money class is solid (immutable, cents-based) — keep and extend
- Current 6 TransactionType values — extend, don't replace
- Monthly processing via `isFirstOfMonth()` check inside daily pipeline
- Keep existing `DEFAULT_DAILY_SALARY` / `DEFAULT_DAILY_MAINTENANCE` as fallback
- Loans: single type (fixed-rate amortization), no variable rates
- TDD approach

**Research Findings**:
- `src/types/campaign/Money.ts` — Immutable Money class (171 lines), arithmetic, formatting
- `src/types/campaign/Transaction.ts` — 6 TransactionType values (Income, Expense, Repair, Maintenance, Salvage, Miscellaneous)
- `src/lib/finances/FinanceService.ts` — `recordTransaction()`, `calculateDailyCosts()`, `processContractPayment()`
- `src/types/campaign/PaymentTerms.ts` — Contract payment with outcome-based payouts
- `ICampaignOptions` — `salaryMultiplier`, `maintenanceCostMultiplier`, `payForSalaries`, `payForMaintenance`
- Target: `src/types/campaign/Campaign.ts` ICampaign

### Metis Review
**Identified Gaps** (addressed):
- Monthly vs daily: monthly processor uses `isFirstOfMonth()` in daily pipeline
- 360+ role salaries are lookup constants, not formulas (typed constant object)
- Transaction history grows unbounded — add basic summary/archival (defer pagination)
- Loan default consequences: penalty fee, no asset seizure
- Salary for wounded: full salary (MekHQ behavior)
- Negative balance continues (MekHQ doesn't stop)

---

## Work Objectives

### Core Objective
Transform the financial system from flat per-entity costs to a sophisticated economic model with role-based salaries, periodic cost processing, loans, taxes, and price modifiers that create real financial pressure.

### Concrete Deliverables
- `src/lib/finances/salaryService.ts` — Role-based salary calculations
- `src/lib/finances/loanService.ts` — Loan creation and amortization
- `src/lib/finances/taxService.ts` — Tax calculations
- `src/lib/finances/priceService.ts` — Price multipliers
- `src/lib/campaign/processors/financialProcessor.ts` — Day pipeline processor
- Extended `TransactionType` enum
- Extended `ICampaignOptions` with financial settings
- Financial dashboard UI

### Definition of Done
- [ ] Role-based salaries with XP multipliers replace flat daily costs
- [ ] Monthly cost processing (salaries, overhead, loan payments)
- [ ] Loan system with amortization formula
- [ ] Tax calculation on profits
- [ ] Price multipliers by tech base and condition
- [ ] Extended TransactionType enum
- [ ] Financial day processor registered in pipeline
- [ ] Financial summary UI

### Must Have
- Salary lookup table for all 10 CampaignPersonnelRole values
- XP multiplier per skill level (Green through Elite)
- Monthly salary/overhead processing
- Loan creation with principal, rate, term
- Loan amortization formula (standard fixed-rate)
- Tax calculation (profits × rate)
- Price multipliers (Clan/IS/Mixed/Used/Damaged)
- Extended TransactionType enum

### Must NOT Have (Guardrails)
- Variable-rate loans or refinancing
- Multiple lenders or financial institutions
- Full payroll history (basic transaction log only)
- Tax brackets (single flat rate)
- Stock market or investment system
- Asset tracking beyond unit value
- Import from `CampaignInterfaces.ts`
- Modification of Money class internals

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: Jest

---

## Task Flow

```
4.1 (Salary service) → 4.2 (Extended transactions) → 4.3 (Loan service) → 4.4 (Tax & price) → 4.5 (Financial processor) → 4.6 (Campaign options) → 4.7 (UI)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 4.1, 4.2 | Salary service and transaction types are independent |
| B | 4.3, 4.4 | Loan and tax/price services are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 4.3 | 4.2 | Loan needs Loan transaction type |
| 4.4 | 4.2 | Tax needs Tax transaction type |
| 4.5 | 4.1, 4.3, 4.4 | Processor needs all financial services |
| 4.6 | 4.1 | Options need salary/loan parameters |
| 4.7 | 4.5 | UI needs processor output |

---

## TODOs

- [x] 4.1 Implement Role-Based Salary Service

  **What to do**:
  - Create `src/lib/finances/salaryService.ts`
  - Define salary lookup table (monthly, in C-bills):
    ```typescript
    export const BASE_MONTHLY_SALARY: Record<CampaignPersonnelRole, number> = {
      [CampaignPersonnelRole.PILOT]: 1500,
      [CampaignPersonnelRole.AEROSPACE_PILOT]: 1800,
      [CampaignPersonnelRole.VEHICLE_DRIVER]: 1200,
      [CampaignPersonnelRole.TECH]: 1000,
      [CampaignPersonnelRole.DOCTOR]: 2000,
      [CampaignPersonnelRole.ADMIN]: 800,
      [CampaignPersonnelRole.MEDIC]: 900,
      [CampaignPersonnelRole.SUPPORT]: 600,
      [CampaignPersonnelRole.SOLDIER]: 1000,
      [CampaignPersonnelRole.UNASSIGNED]: 400,
    };

    export const XP_SALARY_MULTIPLIER: Record<string, number> = {
      'ultra_green': 0.6,
      'green': 0.8,
      'regular': 1.0,
      'veteran': 1.2,
      'elite': 1.5,
      'legendary': 2.0,
    };

    export const SPECIAL_MULTIPLIERS = {
      antiMek: 1.5,           // Anti-Mech infantry
      specialistInfantry: 1.28, // Specialist infantry
      secondaryRoleRatio: 0.5,  // Secondary role = 50% of its base
    };
    ```
  - Salary calculation:
    ```typescript
    export function calculatePersonSalary(
      person: IPerson,
      options: ICampaignOptions
    ): Money {
      const baseSalary = BASE_MONTHLY_SALARY[person.primaryRole];
      const xpLevel = getExperienceLevel(person);
      const xpMult = XP_SALARY_MULTIPLIER[xpLevel] ?? 1.0;
      
      let salary = baseSalary * xpMult * options.salaryMultiplier;
      
      // Add secondary role at 50% if applicable
      if (person.secondaryRole && options.payForSecondaryRole) {
        salary += BASE_MONTHLY_SALARY[person.secondaryRole] * 0.5;
      }
      
      return Money.fromAmount(salary);
    }
    ```
  - Calculate total monthly salary:
    ```typescript
    export function calculateTotalMonthlySalary(campaign: ICampaign): SalaryBreakdown {
      // Sum all active personnel salaries
      // Return breakdown by role category
    }
    ```

  **Must NOT do**:
  - Full MekHQ's 360+ role salaries (map to 10 CampaignPersonnelRole values)
  - Individual salary negotiation

  **Parallelizable**: YES (with 4.2)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:246-252` — Salary formula
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Accountant.java` — MekHQ salary calculation
  - `E:\Projects\MekStation\src\types\campaign\enums\CampaignPersonnelRole.ts` — Role enum (10 values)
  - `E:\Projects\MekStation\src\types\campaign\Person.ts` — IPerson with primaryRole, secondaryRole

  **Acceptance Criteria**:
  - [ ] RED: Test pilot at regular = 1500 × 1.0 = 1500
  - [ ] RED: Test pilot at elite = 1500 × 1.5 = 2250
  - [ ] RED: Test secondary role adds 50% of its base
  - [ ] RED: Test salary multiplier option applies
  - [ ] RED: Test total monthly salary sums all personnel
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(finances): implement role-based salary calculations`
  - Files: `src/lib/finances/salaryService.ts`

---

- [x] 4.2 Extend TransactionType Enum and Add Financial Types

  **What to do**:
  - Extend `TransactionType` in `src/types/campaign/Transaction.ts`:
    ```typescript
    export enum TransactionType {
      // Existing
      Income = 'income',
      Expense = 'expense',
      Repair = 'repair',
      Maintenance = 'maintenance',
      Salvage = 'salvage',
      Miscellaneous = 'miscellaneous',
      // New
      Salary = 'salary',
      ContractPayment = 'contract_payment',
      LoanPayment = 'loan_payment',
      LoanDisbursement = 'loan_disbursement',
      Tax = 'tax',
      Overhead = 'overhead',
      FoodAndHousing = 'food_and_housing',
      UnitPurchase = 'unit_purchase',
      PartPurchase = 'part_purchase',
      TurnoverPayout = 'turnover_payout',
    }
    ```
  - Create `src/types/campaign/Loan.ts`:
    ```typescript
    export interface ILoan {
      readonly id: string;
      readonly principal: Money;
      readonly annualRate: number;        // e.g. 0.05 = 5%
      readonly termMonths: number;        // Total months
      readonly monthlyPayment: Money;     // Calculated via amortization
      readonly remainingPrincipal: Money;
      readonly startDate: Date;
      readonly nextPaymentDate: Date;
      readonly paymentsRemaining: number;
      readonly isDefaulted: boolean;
    }
    ```
  - Create `src/types/campaign/IFinancialSummary.ts`:
    ```typescript
    export interface IFinancialSummary {
      readonly totalIncome: Money;
      readonly totalExpenses: Money;
      readonly netProfit: Money;
      readonly salaryTotal: Money;
      readonly maintenanceTotal: Money;
      readonly loanPaymentTotal: Money;
      readonly taxesPaid: Money;
      readonly balance: Money;
    }
    ```

  **Must NOT do**:
  - Remove existing TransactionType values (backward compatible)
  - Multiple loan types

  **Parallelizable**: YES (with 4.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Transaction.ts` — Current TransactionType enum (6 values)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Loan.java` — MekHQ loan type
  - `.sisyphus/drafts/mekhq-modifier-systems.md:270-297` — Loan and price formulas

  **Acceptance Criteria**:
  - [ ] Existing 6 TransactionType values unchanged
  - [ ] 10+ new TransactionType values added
  - [ ] ILoan interface has all amortization fields
  - [ ] IFinancialSummary aggregates key metrics
  - [ ] `npm test` passes (no breaking changes)

  **Commit**: YES
  - Message: `feat(finances): extend transaction types, add Loan and summary types`
  - Files: `src/types/campaign/Transaction.ts`, `src/types/campaign/Loan.ts`, `src/types/campaign/IFinancialSummary.ts`

---

- [x] 4.3 Implement Loan Service

  **What to do**:
  - Create `src/lib/finances/loanService.ts`
  - Amortization formula (exact MekHQ):
    ```typescript
    export function calculateMonthlyPayment(
      principal: Money,
      annualRate: number,
      termMonths: number
    ): Money {
      const rate = annualRate / 12;
      const payment = principal.amount * (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
      return Money.fromAmount(payment);
    }
    ```
  - Loan lifecycle functions:
    ```typescript
    export function createLoan(principal: Money, annualRate: number, termMonths: number, startDate: Date): ILoan;
    export function makePayment(loan: ILoan): { loan: ILoan; payment: Money; interestPortion: Money; principalPortion: Money };
    export function getRemainingBalance(loan: ILoan): Money;
    export function isLoanPaidOff(loan: ILoan): boolean;
    export function getLoanDefaultPenalty(loan: ILoan): Money;  // Penalty for missed payment
    ```
  - Loan limits (optional campaign option):
    ```typescript
    export function calculateMaxLoanAmount(campaign: ICampaign): Money {
      // Based on total asset value (unit values + balance)
      // MekHQ: collateral-based, simplified here
    }
    ```

  **Must NOT do**:
  - Variable rate loans
  - Multiple lender types
  - Refinancing
  - Complex default consequences (just penalty fee)

  **Parallelizable**: YES (with 4.4)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:274-277` — Loan amortization formula
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Loan.java` — MekHQ loan implementation
  - `E:\Projects\MekStation\src\types\campaign\Money.ts` — Money class for calculations

  **Acceptance Criteria**:
  - [ ] RED: Test 100,000 loan at 5% for 12 months = ~8,560.75/month
  - [ ] RED: Test payment splits into interest + principal
  - [ ] RED: Test remaining balance decreases after each payment
  - [ ] RED: Test loan paid off detection
  - [ ] RED: Test default penalty calculation
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(finances): implement loan amortization service`
  - Files: `src/lib/finances/loanService.ts`

---

- [x] 4.4 Implement Tax and Price Multiplier Services

  **What to do**:
  - Create `src/lib/finances/taxService.ts`:
    ```typescript
    export function calculateTaxes(campaign: ICampaign): Money {
      if (!campaign.options.useTaxes) return Money.ZERO;
      const profits = calculateProfits(campaign);
      if (profits.isNegative() || profits.isZero()) return Money.ZERO;
      return profits.multiply(campaign.options.taxRate / 100);
    }

    export function calculateProfits(campaign: ICampaign): Money {
      // MekHQ: profits = currentBalance - startingCapital - carryover
      const startingFunds = Money.fromAmount(campaign.options.startingFunds);
      return campaign.finances.balance.subtract(startingFunds);
    }
    ```
  - Create `src/lib/finances/priceService.ts`:
    ```typescript
    export const TECH_PRICE_MULTIPLIER = {
      common: { unit: 1.0, part: 1.0 },
      innerSphere: { unit: 1.0, part: 1.0 },  // Configurable
      clan: { unit: 2.0, part: 2.0 },          // Configurable
      mixed: { unit: 1.5, part: 1.5 },         // Configurable
    };

    export const CONDITION_MULTIPLIER = {
      new: 1.0,
      used: 0.5,          // By grade: 0.1 to 0.9
      damaged: 0.33,
      unrepairable: 0.1,
      cancelledOrder: 0.5,
    };

    export function calculateUnitPrice(basePrice: Money, techBase: string, condition: string): Money;
    export function calculatePartPrice(basePrice: Money, techBase: string, condition: string): Money;
    ```
  - Monthly costs beyond salary:
    ```typescript
    export function calculateMonthlyOverhead(campaign: ICampaign): Money {
      // MekHQ: 5% of salary total
      const totalSalary = calculateTotalMonthlySalary(campaign).total;
      return totalSalary.multiply(campaign.options.overheadPercent / 100);
    }

    export function calculateFoodAndHousing(campaign: ICampaign): Money {
      // MekHQ per person per month (3 tiers):
      // Officer: 780 housing + 480 food = 1,260 C-bills
      // Enlisted: 312 housing + 240 food = 552 C-bills
      // Prisoner/Dependent: 228 housing + 120 food = 348 C-bills
      const OFFICER_COST = 1260;
      const ENLISTED_COST = 552;
      const PRISONER_DEPENDENT_COST = 348;
      let total = 0;
      for (const person of campaign.personnel.values()) {
        if (!isAlive(person)) continue;
        if (person.status === PersonnelStatus.POW) {
          total += PRISONER_DEPENDENT_COST;
        } else if (person.isCommander || person.isSecondInCommand) {
          total += OFFICER_COST;
        } else {
          total += ENLISTED_COST;
        }
      }
      return Money.fromAmount(total);
    }
    ```

  **Must NOT do**:
  - Tax brackets or progressive taxation
  - Configurable food/housing costs per person
  - Annual tax filing simulation

  **Parallelizable**: YES (with 4.3)

  **References**:
  - `.sisyphus/drafts/mekhq-modifier-systems.md:256-297` — Monthly costs, tax, price multipliers
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Accountant.java` — MekHQ monthly costs
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaignOptions

  **Acceptance Criteria**:
  - [ ] RED: Test tax on 10,000 profit at 10% = 1,000
  - [ ] RED: Test no tax on negative profit
  - [ ] RED: Test Clan equipment = 2.0× price multiplier
  - [ ] RED: Test damaged condition = 0.33× multiplier
  - [ ] RED: Test overhead = 5% of salary total
  - [ ] RED: Test food/housing per person (officer vs enlisted)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(finances): implement tax calculation and price multipliers`
  - Files: `src/lib/finances/taxService.ts`, `src/lib/finances/priceService.ts`

---

- [x] 4.5 Create Financial Day Processor

  **What to do**:
  - Create `src/lib/campaign/processors/financialProcessor.ts`:
    ```typescript
    export const financialProcessor: IDayProcessor = {
      id: 'financial',
      phase: DayPhase.FINANCES,
      displayName: 'Financial Processing',
      process(campaign, date) {
        const events: IDayEvent[] = [];
        let updatedCampaign = campaign;
        
        // Monthly processing (1st of month)
        if (isFirstOfMonth(date)) {
          // 1. Process salaries
          const salaryResult = processMonthlySalaries(updatedCampaign);
          updatedCampaign = salaryResult.campaign;
          events.push(...salaryResult.events);
          
          // 2. Process overhead
          const overheadResult = processOverhead(updatedCampaign);
          updatedCampaign = overheadResult.campaign;
          events.push(...overheadResult.events);
          
          // 3. Process food & housing
          const foodResult = processFoodAndHousing(updatedCampaign);
          updatedCampaign = foodResult.campaign;
          events.push(...foodResult.events);
          
          // 4. Process loan payments
          const loanResult = processLoanPayments(updatedCampaign);
          updatedCampaign = loanResult.campaign;
          events.push(...loanResult.events);
          
          // 5. Process taxes (if fiscal period matches)
          const taxResult = processTaxes(updatedCampaign);
          updatedCampaign = taxResult.campaign;
          events.push(...taxResult.events);
        }
        
        // Daily processing (maintenance costs remain daily)
        // Keep existing daily maintenance cost calculation as fallback
        if (campaign.options.payForMaintenance) {
          const maintenanceResult = processDailyMaintenance(updatedCampaign);
          updatedCampaign = maintenanceResult.campaign;
          events.push(...maintenanceResult.events);
        }
        
        return { events, campaign: updatedCampaign };
      }
    };
    ```
  - **KEY DECISION**: Monthly salary processing REPLACES daily salary costs when `useRoleBasedSalaries` is enabled. Daily maintenance costs continue daily.
  - **CRITICAL — Prevent double-deduction**: The existing `dailyCostsProcessor` (from Plan 1) must be gated:
    - When `useRoleBasedSalaries` is enabled, `dailyCostsProcessor` must skip salary portion (only process daily maintenance)
    - OR: This financial processor unregisters `dailyCostsProcessor` and handles ALL cost processing
    - **Recommended approach**: Add `if (campaign.options.useRoleBasedSalaries) return { events: [], campaign };` to the existing dailyCostsProcessor. This financialProcessor handles everything when enabled.
  - Register as day processor with `DayPhase.FINANCES`
  - This processor replaces the existing `dailyCostsProcessor` when role-based salaries are enabled

  **Must NOT do**:
  - Remove existing daily cost processor (keep as fallback for simple mode)
  - Process loans daily (monthly only)

  **Parallelizable**: NO (depends on 4.1, 4.3, 4.4)

  **References**:
  - `E:\Projects\MekStation\src\lib\campaign\dayPipeline.ts` — IDayProcessor interface (from Plan 1)
  - `E:\Projects\MekStation\src\lib\campaign\dayAdvancement.ts:265-320` — Current `processDailyCosts()`
  - `.sisyphus/drafts/mekhq-modifier-systems.md:256-270` — Monthly cost formula

  **Acceptance Criteria**:
  - [ ] RED: Test monthly salary processed on 1st of month
  - [ ] RED: Test salary NOT processed on other days
  - [ ] RED: Test overhead calculated correctly (5% of salary)
  - [ ] RED: Test loan payment deducted on 1st of month
  - [ ] RED: Test tax calculated on profits
  - [ ] RED: Test daily maintenance continues every day
  - [ ] RED: Test negative balance continues processing (no abort)
  - [ ] RED: Test dailyCostsProcessor is disabled/no-op when useRoleBasedSalaries=true (no double-deduction)
  - [ ] RED: Test dailyCostsProcessor still works when useRoleBasedSalaries=false (fallback mode)
  - [ ] GREEN: All tests pass
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add financial day processor with monthly salary processing`
  - Files: `src/lib/campaign/processors/financialProcessor.ts`, `src/lib/campaign/processors/dailyCostsProcessor.ts` (add gate)

---

- [x] 4.6 Add Financial Campaign Options

  **What to do**:
  - Extend `ICampaignOptions`:
    ```typescript
    // Financial expansion options
    readonly useRoleBasedSalaries: boolean;       // Use role × XP salary (default: true)
    readonly payForSecondaryRole: boolean;         // Pay for secondary role (default: true)
    readonly overheadPercent: number;              // Overhead % of salary (default: 5)
    readonly useLoanSystem: boolean;               // Enable loans (default: true)
    readonly maxLoanPercent: number;               // Max loan as % of assets (default: 50)
    readonly defaultLoanRate: number;              // Default annual rate (default: 5)
    readonly useTaxes: boolean;                    // Enable taxes (default: false)
    readonly taxRate: number;                      // Flat tax rate % (default: 10)
    readonly taxFrequency: 'monthly' | 'quarterly' | 'annually';  // (default: 'annually')
    readonly useFoodAndHousing: boolean;           // Enable food/housing costs (default: true)
    readonly clanPriceMultiplier: number;          // Clan equipment price multiplier (default: 2.0)
    readonly mixedTechPriceMultiplier: number;     // Mixed tech price multiplier (default: 1.5)
    readonly usedEquipmentMultiplier: number;      // Used equipment price multiplier (default: 0.5)
    readonly damagedEquipmentMultiplier: number;   // Damaged equipment price multiplier (default: 0.33)
    ```
  - Update `createDefaultCampaignOptions()` with all new defaults
  - Existing campaigns get defaults on load

  **Parallelizable**: YES (with 4.1 or later)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts:53-193` — Current ICampaignOptions (40 fields)
  - `.sisyphus/drafts/mekhq-modifier-systems.md:279-297` — Price multiplier tables

  **Acceptance Criteria**:
  - [ ] All new options have sensible defaults
  - [ ] Existing campaigns deserialize without error
  - [ ] `createDefaultCampaignOptions()` includes all financial options
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add financial expansion campaign options`
  - Files: `src/types/campaign/Campaign.ts`

---

- [ ] 4.7 Create Financial Dashboard UI

  **What to do**:
  - Create `src/components/campaign/FinancialSummaryPanel.tsx`:
    - Current balance (prominent)
    - Monthly income vs expenses breakdown
    - Salary breakdown by role category
    - Active loans with remaining balance and next payment
    - Year-to-date profit/loss
  - Create `src/components/campaign/LoanDialog.tsx`:
    - Take out new loan (principal, rate, term inputs)
    - Monthly payment preview
    - Loan limit display
  - Update campaign Finances page/tab with new components
  - Show financial events in day report:
    - Monthly salary total
    - Loan payments
    - Tax deductions
    - Negative balance warnings

  **Must NOT do**:
  - Full transaction history browser (defer)
  - Charts or graphs (defer)
  - Multiple loan comparison tool

  **Parallelizable**: NO (depends on 4.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\[id]\index.tsx` — Campaign dashboard

  **Acceptance Criteria**:
  - [ ] Balance displayed prominently
  - [ ] Salary breakdown shows by role
  - [ ] Loan dialog creates new loan with amortization preview
  - [ ] Active loans listed with remaining balance
  - [ ] Financial events in day report
  - [ ] Manual verification: dev server → campaign → take loan → advance month → see payments

  **Commit**: YES
  - Message: `feat(ui): add financial dashboard, loan dialog, and salary breakdown`
  - Files: `src/components/campaign/FinancialSummaryPanel.tsx`, `src/components/campaign/LoanDialog.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 4.1 | `feat(finances): implement role-based salary calculations` | `npm test` |
| 4.2 | `feat(finances): extend transaction types, add Loan types` | `npm test` |
| 4.3 | `feat(finances): implement loan amortization service` | `npm test` |
| 4.4 | `feat(finances): implement tax and price multipliers` | `npm test` |
| 4.5 | `feat(campaign): add financial day processor` | `npm test` |
| 4.6 | `feat(campaign): add financial campaign options` | `npm test` |
| 4.7 | `feat(ui): add financial dashboard and loan dialog` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [ ] Role-based salaries calculate correctly for all 10 roles
- [ ] XP multiplier applied to salaries
- [ ] Monthly processing fires on 1st of month
- [ ] Loan amortization matches standard formula
- [ ] Tax on profits calculated correctly
- [ ] Price multipliers apply by tech base and condition
- [ ] Existing daily cost processor still works as fallback
- [ ] Financial events appear in day reports

---

## Registration Snippet

```typescript
import { registerFinancialProcessor } from '@/lib/campaign/processors/financialProcessor';
registerFinancialProcessor();
```

---

## Migration Notes

- Extended `TransactionType` enum is backward compatible (new values only)
- New `ICampaignOptions` fields have sensible defaults
- Existing daily cost processor remains for `useRoleBasedSalaries: false` (simple mode)
- Loans stored as part of `ICampaign.finances.loans: ILoan[]` (new optional array)
- Existing saved campaigns get empty loan array on load

---

*Plan generated by Prometheus. Execute with `/start-work`.*
