# Change: Turnover & Retention System

## Why
MekStation needs personnel turnover mechanics to create campaign tension and meaningful consequences for management decisions. Without turnover, personnel never leave voluntarily, removing a key source of strategic challenge and realism from campaign gameplay.

## What Changes
- Implement 19-modifier turnover check system matching MekHQ exactly
  - 9 real modifiers (using existing systems: skills, status, roles, injuries)
  - 10 stubbed modifiers (fatigue, loyalty, shares, morale, etc.) returning neutral (0)
- 2d6 roll vs target number composed of additive modifiers
- Personnel who fail check leave campaign (status transition to RETIRED or DESERTED)
- Day pipeline processor for configurable check frequency (weekly/monthly/quarterly/annually)
- Turnover report UI with modifier breakdown
- Payout calculation on departure (salary × configurable multiplier)

## Impact
- Affected specs: `personnel-management` (MODIFIED), `day-progression` (MODIFIED), `turnover-retention` (ADDED)
- Affected code:
  - `src/lib/campaign/turnover/` (NEW) - Core turnover logic
  - `src/lib/campaign/turnover/modifiers/` (NEW) - 19 modifier functions
  - `src/lib/campaign/processors/turnoverProcessor.ts` (NEW) - Day pipeline integration
  - `src/types/campaign/Person.ts` (MODIFIED) - Add loyalty, serviceContract fields
  - `src/types/campaign/Campaign.ts` (MODIFIED) - Add turnover configuration options
  - `src/components/campaign/TurnoverReportPanel.tsx` (NEW) - UI component
- Dependencies: Requires Plan 7 (skills for skill modifiers), Plan 13 (status transitions)
- Breaking changes: None (new feature, backward compatible, stubbed modifiers allow future expansion)
