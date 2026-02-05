# Change: Personnel Status & Role Expansion

## Why

MekStation currently has only 10 personnel statuses and 10 roles. Campaign systems need MekHQ-level granularity (37 statuses, ~45 roles) to properly model personnel lifecycle, salary eligibility, absence tracking, death causes, and role-based salary calculations. Without this expansion, other campaign features (turnover, financial, medical) cannot accurately determine personnel state and compensation.

## What Changes

- Expand PersonnelStatus from 10 → 37 values grouped into: Active/Employed (6), Absent (3), Departed (9), Dead (14 causes), Other (1)
- Add status behavioral helpers: isAbsent(), isSalaryEligible(), isDead(), isDepartedUnit(), getNotificationSeverity()
- Add status transition validation with side effects (clear assignments, set dates, trigger events)
- Expand CampaignPersonnelRole from 10 → ~45 values: 14 combat, 11 support, ~20 civilian roles
- Add role category helpers: isCombatRole(), isSupportRole(), isCivilianRole()
- Add base salary mapping per role for financial system integration
- Maintain backward compatibility with existing 10 statuses/roles

## Impact

- Affected specs: `personnel-management` (MODIFIED), `personnel-status-roles` (ADDED)
- Affected code:
  - `src/types/campaign/enums/PersonnelStatus.ts` (expand enum)
  - `src/types/campaign/enums/CampaignPersonnelRole.ts` (expand enum)
  - `src/lib/campaign/personnel/statusRules.ts` (NEW)
  - `src/lib/campaign/personnel/statusTransitions.ts` (NEW)
  - `src/lib/campaign/personnel/roleSalaries.ts` (NEW)
- Dependencies: Required by Plans 2 (Turnover), 4 (Financial), 8 (Medical), 15 (Ranks)
- Breaking changes: None (existing 10 statuses/roles remain valid, new values are additive)
