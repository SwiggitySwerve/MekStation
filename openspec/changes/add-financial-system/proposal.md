# Change: Financial System Expansion

## Why
MekStation's current financial system uses flat daily costs (50 C-bills/person, 100 C-bills/unit), which lacks the economic depth and strategic pressure of MekHQ's comprehensive financial model. Without role-based salaries, loans, taxes, and price multipliers, campaigns lack realistic financial management and meaningful economic consequences.

## What Changes
- Implement role-based salary system with XP multipliers (10 roles × 6 experience levels)
- Add monthly cost processing (salaries, overhead, food/housing) via day pipeline
- Implement loan system with standard amortization formula
- Add tax calculation on campaign profits
- Implement price multipliers by tech base (Clan/IS/Mixed) and condition (New/Used/Damaged)
- Extend TransactionType enum with 10 new financial transaction types
- Add financial day processor with monthly processing on 1st of month
- Gate existing dailyCostsProcessor to prevent double-deduction when role-based salaries enabled
- Add 14 new financial configuration options to ICampaignOptions
- Create financial dashboard UI with salary breakdown and loan management

## Impact
- Affected specs: `campaign-management` (MODIFIED), `day-progression` (MODIFIED), `financial-management` (ADDED)
- Affected code:
  - `src/lib/finances/salaryService.ts` (NEW) - Role-based salary calculations
  - `src/lib/finances/loanService.ts` (NEW) - Loan amortization
  - `src/lib/finances/taxService.ts` (NEW) - Tax calculations
  - `src/lib/finances/priceService.ts` (NEW) - Price multipliers
  - `src/lib/campaign/processors/financialProcessor.ts` (NEW) - Monthly financial processing
  - `src/lib/campaign/processors/dailyCostsProcessor.ts` (MODIFIED) - Add gate for role-based salaries
  - `src/types/campaign/Transaction.ts` (MODIFIED) - Extend TransactionType enum
  - `src/types/campaign/Loan.ts` (NEW) - Loan interface
  - `src/types/campaign/IFinancialSummary.ts` (NEW) - Financial summary interface
  - `src/types/campaign/Campaign.ts` (MODIFIED) - Add 14 financial options
  - `src/components/campaign/FinancialSummaryPanel.tsx` (NEW) - Financial dashboard
  - `src/components/campaign/LoanDialog.tsx` (NEW) - Loan management UI
- Dependencies: Requires Plan 7 (skills for XP levels), Plan 13 (CampaignPersonnelRole enum)
- Breaking changes: None (new feature, backward compatible, existing dailyCostsProcessor remains as fallback)
- **CRITICAL**: Uses existing `useLoanSystem` field in ICampaignOptions (does NOT re-declare)
- **CRITICAL**: Gates dailyCostsProcessor when `useRoleBasedSalaries=true` to prevent double-deduction
