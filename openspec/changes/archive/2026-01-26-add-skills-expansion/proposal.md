# Change: Skills Expansion

## Why

MekStation currently has only 2 skills (gunnery, piloting) hardcoded in person creation. Campaign systems need 40+ skill types for turnover modifiers, repair quality checks, financial management, medical treatment effectiveness, and personnel progression. Without a comprehensive skill catalog, other campaign features cannot calculate skill-based modifiers.

## What Changes

- Add skill catalog with 40+ skill types organized into 6 categories (combat, technical, medical, administrative, physical, knowledge)
- Implement 2d6 skill check resolution vs target number with modifiers
- Add XP-based skill progression with attribute-adjusted costs
- Define default skills by personnel role (PILOT, TECH, DOCTOR, etc.) and experience level (GREEN, REGULAR, VETERAN, ELITE)
- Provide helper functions for cross-plan skill queries (getTechSkillValue, getAdminSkillValue, etc.)
- Extend existing ISkillType and ISkill interfaces (no breaking changes)

## Impact

- Affected specs: `personnel-management` (MODIFIED), `skills-system` (ADDED)
- Affected code:
  - `src/types/campaign/skills/skillCatalog.ts` (NEW)
  - `src/lib/campaign/skills/skillCheck.ts` (NEW)
  - `src/lib/campaign/skills/skillProgression.ts` (NEW)
  - `src/lib/campaign/skills/defaultSkills.ts` (NEW)
  - `src/lib/campaign/skills/skillHelpers.ts` (NEW)
  - `src/components/campaign/SkillsPanel.tsx` (NEW)
- Dependencies: Required by Plans 2 (Turnover), 3 (Repair), 4 (Financial), 8 (Medical), 9 (Acquisition), 15 (Ranks)
- Breaking changes: None (extends existing interfaces, backward compatible with existing 2-skill personnel)
