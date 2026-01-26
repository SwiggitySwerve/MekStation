# Tasks: Skills Expansion

## 1. Skill Catalog Definition

- [ ] 1.1 Create `src/types/campaign/skills/skillCatalog.ts` with 40+ skill types
  - Define SKILL_CATALOG object using existing ISkillType interface
  - Include all combat, technical, medical, administrative, physical, and knowledge skills
  - Ensure each skill has: id, name, description, targetNumber, costs[10], linkedAttribute
  - Export helper functions: getSkillType(), getSkillsByCategory(), getAllSkillTypes()
  - Export SKILL_CATEGORIES constant

- [ ] 1.2 Write tests for skill catalog
  - RED: Test catalog has 40+ skill types
  - RED: Test every skill type has valid costs[10] array
  - RED: Test every skill type has valid linkedAttribute
  - RED: Test getSkillType('gunnery') returns correct definition
  - RED: Test getSkillsByCategory('combat') returns 11 skills
  - GREEN: All tests pass

- [ ] 1.3 Verify npm test passes
  - Run `npm test` and confirm all catalog tests pass
  - Commit: `feat(campaign): define 40+ skill types in skill catalog`

## 2. Skill Check Resolution

- [ ] 2.1 Create `src/lib/campaign/skills/skillCheck.ts`
  - Define RandomFn type: `() => number`
  - Define SkillCheckResult interface with: roll, targetNumber, margin, success, criticalSuccess, criticalFailure, modifiers
  - Implement performSkillCheck() function
  - Implement getEffectiveSkillTN() function
  - Logic: Look up skill on person, apply unskilled penalty (+4 if missing), calculate TN, roll 2d6

- [ ] 2.2 Write tests for skill check
  - RED: Test skilled person (gunnery 4) has lower TN than unskilled
  - RED: Test unskilled penalty adds +4 to base TN
  - RED: Test modifiers add/subtract from TN
  - RED: Test critical success at margin >= 4
  - RED: Test deterministic with seeded random
  - GREEN: All tests pass

- [ ] 2.3 Verify npm test passes
  - Run `npm test` and confirm all skill check tests pass
  - Commit: `feat(campaign): implement skill check resolution with 2d6 vs TN`

## 3. Skill Progression and XP Costs

- [ ] 3.1 Create `src/lib/campaign/skills/skillProgression.ts`
  - Implement getSkillImprovementCost() function
  - Implement canImproveSkill() function
  - Implement improveSkill() function
  - Implement addSkill() function
  - Logic: Use skillType.costs[currentLevel + 1], apply xpMultiplier, adjust by attribute modifier

- [ ] 3.2 Write tests for skill progression
  - RED: Test gunnery level 3→4 costs 16 XP (from catalog)
  - RED: Test high attribute reduces cost (DEX 8 for piloting)
  - RED: Test can't improve beyond level 10
  - RED: Test can't improve without enough XP
  - RED: Test improveSkill deducts XP and increments level
  - GREEN: All tests pass

- [ ] 3.3 Verify npm test passes
  - Run `npm test` and confirm all skill progression tests pass
  - Commit: `feat(campaign): implement skill progression with XP costs`

## 4. Default Skills by Role and Experience Level

- [ ] 4.1 Create `src/lib/campaign/skills/defaultSkills.ts`
  - Define IDefaultSkillSet interface
  - Define DEFAULT_SKILLS_BY_ROLE object for all 10 CampaignPersonnelRole values
  - Define EXPERIENCE_SKILL_MODIFIER object for all ExperienceLevel values
  - Implement createDefaultSkills() function

- [ ] 4.2 Write tests for default skills
  - RED: Test PILOT gets gunnery + piloting at default levels
  - RED: Test TECH gets tech-mech skill
  - RED: Test GREEN experience adds +1 to skill values
  - RED: Test ELITE experience subtracts -2 from skill values
  - GREEN: All tests pass

- [ ] 4.3 Verify npm test passes
  - Run `npm test` and confirm all default skills tests pass
  - Commit: `feat(campaign): define default skills by role and experience level`

## 5. Skill Helper Functions

- [ ] 5.1 Create `src/lib/campaign/skills/skillHelpers.ts`
  - Implement getSkillDesirabilityModifier() for Plan 2 (Turnover)
  - Implement getTechSkillValue() for Plan 3 (Repair)
  - Implement getAdminSkillValue() for Plan 4 (Financial)
  - Implement getMedicineSkillValue() for Plan 8 (Medical)
  - Implement getNegotiationModifier() for Plan 9 (Acquisition)
  - Implement getLeadershipSkillValue() for Plan 15 (Ranks)
  - Implement hasSkill(), getPersonSkillLevel(), getPersonBestCombatSkill()

- [ ] 5.2 Write tests for skill helpers
  - RED: Test getTechSkillValue returns skill value for person with Tech skill
  - RED: Test getTechSkillValue returns 10 (unskilled) for person without Tech
  - RED: Test hasSkill returns true/false correctly
  - RED: Test getPersonBestCombatSkill finds highest combat skill
  - GREEN: All tests pass

- [ ] 5.3 Verify npm test passes
  - Run `npm test` and confirm all skill helper tests pass
  - Commit: `feat(campaign): add skill helper functions for cross-plan integration`

## 6. Skills Management UI

- [ ] 6.1 Create `src/components/campaign/SkillsPanel.tsx`
  - Display all person's skills with level, TN, XP to next level
  - Group skills by category (combat, technical, medical, etc.)
  - Add "Improve" button to spend XP and level up
  - Add "Add Skill" dropdown to learn new skills

- [ ] 6.2 Create `src/components/campaign/SkillCheckDialog.tsx`
  - Allow selecting a skill
  - Allow adding modifiers
  - Show roll result with margin and critical success/failure
  - Display all modifiers applied

- [ ] 6.3 Integrate into personnel detail page
  - Add SkillsPanel to personnel detail view
  - Add SkillCheckDialog accessible from skills panel
  - Manual verification: dev server → personnel → skills → improve → verify

- [ ] 6.4 Verify manual testing
  - Skills panel shows all person's skills with levels
  - Improve button deducts XP and shows new level
  - Add skill dropdown shows available skills
  - Skill check dialog shows roll result with modifiers
  - Commit: `feat(ui): add skills management panel and check dialog`

## Verification

- [ ] All npm test passes
- [ ] npm run build succeeds
- [ ] No TypeScript errors in changed files
- [ ] All checkboxes marked complete
