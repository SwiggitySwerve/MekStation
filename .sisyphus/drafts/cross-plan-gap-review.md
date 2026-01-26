# Cross-Plan Gap Review — 17 MekStation Campaign System Plans

> **Date**: January 26, 2026
> **Status**: COMPLETE
> **Scope**: All 17 implementation plans cross-referenced for dependencies, conflicts, and gaps

---

## Table of Contents

1. [Cross-Plan Dependency Matrix](#1-cross-plan-dependency-matrix)
2. [Execution Order Recommendations](#2-execution-order-recommendations)
3. [Shared Type Conflicts](#3-shared-type-conflicts)
4. [Stub Inventory](#4-stub-inventory)
5. [Formula Verification](#5-formula-verification)
6. [Missing Elements](#6-missing-elements)
7. [ICampaignOptions Field Count Projection](#7-icampaignoptions-field-count-projection)
8. [Day Processor Registry](#8-day-processor-registry)

---

## 1. Cross-Plan Dependency Matrix

### Forward Dependencies (Plan X needs Plan Y)

| Plan | Depends On | For What |
|------|-----------|----------|
| **2 (Turnover)** | **1 (Day Advancement)** | IDayProcessor, DayPhase.PERSONNEL, pipeline registration |
| **2 (Turnover)** | **7 (Skills)** | getSkillDesirabilityModifier() for modifier #4 |
| **2 (Turnover)** | **4 (Financial)** | getPersonMonthlySalary() for payout (stubs own version) |
| **3 (Repair Quality)** | **1 (Day Advancement)** | IDayProcessor, DayPhase.UNITS, pipeline registration |
| **3 (Repair Quality)** | **7 (Skills)** | getTechSkillValue() (stubs own TECH_SKILL_TYPE) |
| **4 (Financial)** | **1 (Day Advancement)** | IDayProcessor, DayPhase.FINANCES, isFirstOfMonth() |
| **4 (Financial)** | **13 (Status/Roles)** | isSalaryEligible(), expanded roles for salary lookup |
| **5 (Faction Standing)** | **1 (Day Advancement)** | IDayProcessor, DayPhase.EVENTS, isFirstOfMonth() |
| **6 (Presets)** | ALL plans | References option fields added by Plans 1-5, 7-17 |
| **8 (Medical)** | **1 (Day Advancement)** | Extends existing healing processor |
| **8 (Medical)** | **7 (Skills)** | getMedicineSkillValue() (stubs if not built) |
| **9 (Acquisition)** | **1 (Day Advancement)** | IDayProcessor for daily acquisition processing |
| **9 (Acquisition)** | **7 (Skills)** | getNegotiationModifier() (stubs) |
| **9 (Acquisition)** | **3 (Repair Quality)** | scanForNeededParts() needs repair job data (stubs) |
| **10 (Progression)** | **1 (Day Advancement)** | Two day processors (aging, vocational) |
| **10 (Progression)** | **7 (Skills)** | getSkillImprovementCost() base function to wrap |
| **11 (Scenario/Combat)** | **1 (Day Advancement)** | IDayProcessor for weekly scenario generation |
| **11 (Scenario/Combat)** | **12 (Contract Types)** | AtBContractType for contract-aware scenario gen |
| **12 (Contract Types)** | **7 (Skills)** | getNegotiationModifier() for clause negotiation |
| **12 (Contract Types)** | **5 (Faction Standing)** | getNegotiationModifier() from standing effects |
| **12 (Contract Types)** | **11 (Scenario/Combat)** | CombatRole enum for default combat role per type |
| **14 (Awards)** | **1 (Day Advancement)** | IDayProcessor, monthly auto-check |
| **14 (Awards)** | **13 (Status/Roles)** | isDead(), isCivilianRole() for eligibility |
| **15 (Ranks)** | **4 (Financial)** | Salary calculation to add rank pay multiplier |
| **15 (Ranks)** | **2 (Turnover)** | Officer modifier for turnover |
| **15 (Ranks)** | **13 (Status/Roles)** | mapRoleToProfession() needs expanded roles |
| **16 (Random Events)** | **1 (Day Advancement)** | IDayProcessor with frequency routing |
| **16 (Random Events)** | **12 (Contract Types)** | Contract event types referenced |
| **17 (Markets)** | **1 (Day Advancement)** | Three day processors (unit/personnel/contract) |
| **17 (Markets)** | **5 (Faction Standing)** | Market modifiers (stubs) |
| **17 (Markets)** | **7 (Skills)** | Default skills for generated personnel |
| **17 (Markets)** | **12 (Contract Types)** | 19 contract types for contract market |

### Circular Dependency Check

**⚠️ CIRCULAR: Plans 11 ↔ 12**
- Plan 11 (Scenario) needs CombatRole from Plan 11's own types, but also references contract types from Plan 12
- Plan 12 (Contract Types) references CombatRole from Plan 11 for `defaultCombatRole`

**Resolution**: CombatRole should be defined as a standalone type in Plan 11's types file (11.1), which Plan 12 imports. Contract type definitions reference the CombatRole enum. This is a compile-time dependency on types only — no runtime circular dependency. Plan 11 types (11.1) should be implemented before Plan 12 types (12.1).

**No other circular dependencies found.** All other relationships are strictly forward-pointing.

### Reverse Dependencies (How many plans depend on Plan X)

| Plan | Dependents | Count |
|------|-----------|-------|
| **1 (Day Advancement)** | Plans 2,3,4,5,8,9,10,11,14,16,17 | **11** |
| **7 (Skills)** | Plans 2,3,8,9,10,12,17 | **7** |
| **13 (Status/Roles)** | Plans 4,14,15 | **3** |
| **5 (Faction Standing)** | Plans 12,17 | **2** |
| **12 (Contract Types)** | Plans 11,16,17 | **3** |
| **4 (Financial)** | Plans 2,15 | **2** |
| **11 (Scenario/Combat)** | Plan 12 | **1** |
| **3 (Repair Quality)** | Plan 9 | **1** |

---

## 2. Execution Order Recommendations

### Tier 0: Foundation (MUST be first)
| Plan | Reason |
|------|--------|
| **1 (Day Advancement Pipeline)** | Backbone — 11 other plans depend on it |

### Tier 1: Core Infrastructure (Build next, any order within tier)
| Plan | Reason |
|------|--------|
| **7 (Skills Expansion)** | 7 plans depend on skill helpers |
| **13 (Status/Role Expansion)** | 3 plans need expanded statuses and roles |

### Tier 2: Core Systems (Build after Tier 1, any order within tier)
| Plan | Reason |
|------|--------|
| **2 (Turnover)** | Needs Plan 1 + optional Plan 7 skills (can stub) |
| **3 (Repair Quality)** | Needs Plan 1 + optional Plan 7 tech skill (can stub) |
| **4 (Financial)** | Needs Plan 1 + optional Plan 13 statuses (can stub) |
| **5 (Faction Standing)** | Needs Plan 1 only |
| **8 (Medical)** | Needs Plan 1 + optional Plan 7 medicine skill (can stub) |

### Tier 3: Dependent Systems (Build after Tier 2)
| Plan | Reason |
|------|--------|
| **9 (Acquisition)** | Needs Plan 1, optional Plans 3, 7 |
| **10 (Progression)** | Needs Plan 1 + Plan 7 skill costs |
| **11 (Scenario/Combat)** | Needs Plan 1, creates types for Plan 12 |
| **12 (Contract Types)** | Needs Plan 11 types, optional Plans 5, 7 |
| **14 (Awards)** | Needs Plan 1, optional Plan 13 |
| **15 (Ranks)** | Needs Plan 13 roles, optional Plans 2, 4 |
| **16 (Random Events)** | Needs Plan 1, optional Plan 12 |
| **17 (Markets)** | Needs Plan 1, optional Plans 5, 7, 12 |

### Tier 4: Meta/Organization (Build anytime after Tier 2)
| Plan | Reason |
|------|--------|
| **6 (Campaign Options/Presets)** | References options from ALL plans — build last or iteratively |

### Natural Build Groups (Parallelizable within group)

| Group | Plans | Rationale |
|-------|-------|-----------|
| **A: Personnel Systems** | 2 (Turnover) + 10 (Progression) + 15 (Ranks) | All personnel lifecycle |
| **B: Equipment/Logistics** | 3 (Repair) + 9 (Acquisition) + 17 (Markets) | All equipment/supply chain |
| **C: Mission/Contract** | 11 (Scenario) + 12 (Contracts) + 5 (Standing) | All mission/faction |
| **D: Support Systems** | 8 (Medical) + 14 (Awards) + 16 (Events) | Support/auxiliary |

---

## 3. Shared Type Conflicts

### ICampaignOptions — New Fields by Plan

| Plan | New Fields | Count |
|------|-----------|-------|
| **1 (Day Advancement)** | enableDayReportNotifications | 1 |
| **2 (Turnover)** | useTurnover, turnoverFixedTargetNumber, turnoverCheckFrequency, turnoverCommanderImmune, turnoverPayoutMultiplier, turnoverUseSkillModifiers, turnoverUseAgeModifiers, turnoverUseMissionStatusModifiers | 8 |
| **3 (Repair Quality)** | useQualityGrades, maintenanceCycleDays (already exists!), qualityStartingGrade | 2 (net) |
| **4 (Financial)** | useRoleBasedSalaries, payForSecondaryRole, overheadPercent, useLoanSystem (already exists!), maxLoanPercent, defaultLoanRate, useTaxes, taxRate, taxFrequency, useFoodAndHousing, clanPriceMultiplier, mixedTechPriceMultiplier, usedEquipmentMultiplier, damagedEquipmentMultiplier | 13 (net) |
| **5 (Faction Standing)** | trackFactionStanding, factionStandingRegardMultiplier, factionStandingDecayEnabled, factionStandingDecayRate, + 11 effect toggles | 15 |
| **6 (Presets)** | campaignType (on ICampaign, not options), activePreset (on ICampaign) | 0 (on options) |
| **7 (Skills)** | xpCostMultiplier | 1 |
| **8 (Medical)** | medicalSystem, doctorsUseAdministration, tougherHealing | 3 |
| **9 (Acquisition)** | useAcquisitionSystem, usePlanetaryModifiers, acquisitionTransitUnit, clanPartsPenalty, planetaryRatings, useAutoLogistics | 6 |
| **10 (Progression)** | scenarioXP, killXPAward, killsForXP, taskXP, nTasksXP, vocationalXP, vocationalXPTargetNumber, vocationalXPCheckFrequency, adminXP, adminXPPeriod, missionFailXP, missionSuccessXP, missionOutstandingXP, useAgingEffects | 14 |
| **11 (Scenario/Combat)** | useAtBScenarios, difficultyMultiplier | 2 |
| **12 (Contract Types)** | (extends IContract, not ICampaignOptions) | 0 |
| **13 (Status/Roles)** | (extends enums, not ICampaignOptions) | 0 |
| **14 (Awards)** | autoAwardConfig (object with sub-fields) | 1 (compound) |
| **15 (Ranks)** | rankSystemCode | 1 |
| **16 (Random Events)** | useRandomEvents (already exists!), usePrisonerEvents, useLifeEvents, useContractEvents, simulateGrayMonday | 4 (net) |
| **17 (Markets)** | unitMarketMethod, personnelMarketStyle, contractMarketMethod | 3 |

**⚠️ DUPLICATE/CONFLICTING FIELDS:**

1. **`maintenanceCycleDays`** — Already exists in current ICampaignOptions (line 117). Plan 3 re-declares it. **Resolution**: Plan 3 should USE the existing field, not redeclare.

2. **`useLoanSystem`** — Already exists in current ICampaignOptions (line 120). Plan 4 re-declares it. **Resolution**: Plan 4 should USE the existing field, not redeclare.

3. **`useRandomEvents`** — Already exists in current ICampaignOptions (line 192). Plan 16 re-declares it. **Resolution**: Plan 16 should USE the existing field, not redeclare.

4. **`xpPerMission` vs `missionSuccessXP`** — Current ICampaignOptions has `xpPerMission` (line 77). Plan 10 adds `missionSuccessXP`, `missionFailXP`, `missionOutstandingXP` which are outcome-specific. **Resolution**: Plan 10's fields supersede `xpPerMission`. Deprecate `xpPerMission` or map it as fallback.

5. **`xpPerKill` vs `killXPAward`** — Current ICampaignOptions has `xpPerKill` (line 80). Plan 10 adds `killXPAward` + `killsForXP`. **Resolution**: Same as above — Plan 10's fields supersede. Deprecate `xpPerKill`.

### IPerson — New Fields by Plan

| Plan | New Fields |
|------|-----------|
| **2 (Turnover)** | lastPromotionDate, serviceContractEndDate, departureDate, departureReason |
| **3 (Repair Quality)** | (quality on units, not IPerson) |
| **5 (Faction Standing)** | (standings on ICampaign, not IPerson) |
| **8 (Medical)** | hasProsthetic on IInjury (not IPerson directly) |
| **10 (Progression)** | traits (IPersonTraits: fastLearner, slowLearner, gremlins, techEmpathy, toughness, glassJaw, hasGainedVeterancySPA, vocationalXPTimer), specialAbilities (string[]) |
| **15 (Ranks)** | rankIndex |

**No naming conflicts found.** All new IPerson fields use distinct names.

### IContract — Extensions by Plan

| Plan | New Fields |
|------|-----------|
| **5 (Faction Standing)** | (no direct IContract changes — uses employerId) |
| **11 (Scenario/Combat)** | moraleLevel (AtBMoraleLevel) |
| **12 (Contract Types)** | atbContractType (AtBContractType), contractClauses (IContractClause[]) |

**No naming conflicts.** All additive.

### IScenario — Extensions by Plan

| Plan | New Fields |
|------|-----------|
| **11 (Scenario/Combat)** | conditions (IScenarioConditions) |
| **16 (Random Events)** | (uses IRandomEvent, not IScenario) |

**No conflicts.**

### ICampaign — Extensions by Plan

| Plan | New Fields |
|------|-----------|
| **5 (Faction Standing)** | factionStandings (Record<string, IFactionStanding>) |
| **6 (Presets)** | campaignType (CampaignType — REQUIRED), activePreset (CampaignPreset) |
| **9 (Acquisition)** | shoppingList (IShoppingList) |
| **11 (Scenario/Combat)** | combatTeams (ICombatTeam[]) |
| **17 (Markets)** | unitMarketOffers (IUnitMarketOffer[]), personnelMarketOffers (IPersonnelMarketOffer[]) |

**⚠️ CONCERN: `campaignType` as REQUIRED field (Plan 6)**
Plan 6 adds `campaignType: CampaignType` as a REQUIRED field on ICampaign. This is a breaking change for existing campaigns. **Resolution**: Default to `CampaignType.MERCENARY` for existing campaigns during deserialization.

---

## 4. Stub Inventory

### Stubs Declared by Plan

| Plan | Stub Function | Returns | Unstubbed By |
|------|--------------|---------|-------------|
| **2** | getPersonMonthlySalary() | Money(1000) | **Plan 4** (salaryService) |
| **2** | getFatigueModifier() | 0 | **NEVER** ⚠️ (no fatigue plan) |
| **2** | getHRStrainModifier() | 0 | **NEVER** ⚠️ (needs admin tracking) |
| **2** | getManagementSkillModifier() | 0 | **NEVER** ⚠️ (needs leadership) |
| **2** | getSharesModifier() | 0 | **NEVER** ⚠️ (no shares plan) |
| **2** | getUnitRatingModifier() | 0 | **NEVER** ⚠️ (no Dragoon rating plan) |
| **2** | getHostileTerritoryModifier() | 0 | **NEVER** ⚠️ (no territory plan) |
| **2** | getLoyaltyModifier() | 0 | **NEVER** ⚠️ (no loyalty plan) |
| **2** | getFactionCampaignModifier() | 0 | Partially by **Plan 5** (faction standing) |
| **2** | getFactionOriginModifier() | 0 | **NEVER** ⚠️ (no faction origin plan) |
| **2** | getFamilyModifier() | 0 | **NEVER** ⚠️ (no family plan) |
| **3** | getEraModifier() | 0 | **NEVER** ⚠️ (no era plan) |
| **3** | getPlanetaryModifier() | 0 | Partially by **Plan 9** (planetary ratings) |
| **3** | getTechSpecialtiesModifier() | 0 | **NEVER** ⚠️ (no tech spec plan) |
| **3** | getTechSkillValue() (via TECH_SKILL_TYPE) | 10 (unskilled) | **Plan 7** (skills, getTechSkillValue helper) |
| **8** | getMedicineSkillValue() | 7 | **Plan 7** (skills, getMedicineSkillValue helper) |
| **9** | getNegotiatorModifier() | +4 (no negotiator) | **Plan 7** (skills, getNegotiationModifier helper) |
| **9** | scanForNeededParts() | [] | **Plan 3** (repair system) |
| **9** | getContractAvailabilityMod() | 0 | **Plan 12** (contract type partsAvailabilityMod) |
| **12** | getNegotiationModifier (from skill) | 0 | **Plan 7** (skills) |
| **12** | getFactionStandingNegotiationMod() | 0 | **Plan 5** (faction standing) |
| **14** | checkContractAwards() | [] | **Plan 12** (contract types) |
| **14** | checkFactionHunterAwards() | [] | **NEVER** ⚠️ (no faction kill tracking) |
| **14** | checkTheatreOfWarAwards() | [] | **NEVER** ⚠️ (no conflict data) |
| **14** | checkTrainingAwards() | [] | **NEVER** ⚠️ (no academy system) |
| **17** | getUnitMarketRarityModifier() | 0 | **Plan 5** (faction standing) |
| **17** | getRecruitmentTickets() | 5 | **Plan 5** (faction standing) |
| **17** | getRecruitmentRollsModifier() | 0 | **Plan 5** (faction standing) |
| **17** | getContractPayMultiplier() | 1.0 | **Plan 5** (faction standing) |
| **17** | getContractNegotiationModifier() | 0 | **Plan 5** (faction standing) |

### ⚠️ PERMANENTLY STUBBED (No Plan Unstubs Them)

These 14 stubs will remain at neutral defaults unless future plans are created:

1. **getFatigueModifier()** — No fatigue system planned
2. **getHRStrainModifier()** — Needs admin capacity tracking
3. **getManagementSkillModifier()** — Needs leadership skill integration
4. **getSharesModifier()** — No shares system planned
5. **getUnitRatingModifier()** — No Dragoon rating system planned
6. **getHostileTerritoryModifier()** — No territory tracking planned
7. **getLoyaltyModifier()** — No loyalty system planned
8. **getFactionOriginModifier()** — No faction origin tracking planned
9. **getFamilyModifier()** — No family/genealogy system planned
10. **getEraModifier()** — No era-specific tech modifier planned
11. **getTechSpecialtiesModifier()** — No tech specialization planned
12. **checkFactionHunterAwards()** — No faction kill tracking planned
13. **checkTheatreOfWarAwards()** — No active conflict data planned
14. **checkTrainingAwards()** — No academy system planned

**Impact**: Plan 2 (Turnover) has **10 of 19 modifiers stubbed** (returning 0). The turnover system will work but be less nuanced than MekHQ. This is acceptable — stubs allow future expansion. The 9 real modifiers already create meaningful tension.

---

## 5. Formula Verification

Cross-referencing plan formulas against `mekhq-modifier-systems.md`:

### Turnover (Plan 2) ✅ MATCHES
- Base TN: 3 ✅ (modifier doc line 88: `turnoverFixedTargetNumber` default 3)
- Founder: -2 ✅ (modifier doc line 89)
- Age modifiers: <20:-1, 50-54:+3, 55-59:+5, 60-64:+6, 65+:+8 ✅ (modifier doc lines 96-97)
- Injury: +1 per permanent ✅
- Officer: -1 ✅
- Mission status: SUCCESS=-1, FAILED=+1, BREACH=+2 ✅ (modifier doc line 99)
- Roll < TN → leaves ✅
- Deserted vs Retired threshold: roll < TN-4 → deserted ✅

### Repair Quality (Plan 3) ✅ MATCHES
- Quality grades A(worst) to F(best) ✅ (modifier doc lines 122-135)
- TN modifiers: A=+3, B=+2, C=+1, D=0, E=-1, F=-2 ✅
- Maintenance cascade: failure degrades, margin≥4 improves ✅
- Degrade toward A, improve toward F ✅

### Medical Systems (Plan 8) ✅ MATCHES
- Standard: 2d6 skill check, success heals ✅ (modifier doc lines 364-372)
- Advanced: d100 with fumble/crit thresholds ✅ (modifier doc lines 374-379)
- Alternate: attribute-based with margin of success ✅ (modifier doc lines 381-389)
- Doctor capacity: 25 default + admin skill bonus ✅ (modifier doc lines 397-401)

### Acquisition Rolls (Plan 9) ✅ MATCHES
- Availability A-X TN tables ✅ (regular: A=3, B=4, C=6, D=8, E=10, F=11, X=13)
- Delivery time: `max(1, (7 + 1d6 + availIndex) / 4)` ✅ (modifier doc)
- Planetary modifiers: tech/industry/output with IMPOSSIBLE for F ratings ✅
- Clan parts penalty: +3 TN ✅

### Skill Costs (Plan 7 + Plan 10) ✅ MATCHES
- Base cost from 10-element array per skill type ✅
- Attribute modifier: `(1 - attrMod × 0.05)` ✅ (modifier doc lines 437-452)
- Trait multipliers: Slow Learner +20%, Fast Learner -20%, Gremlins +10% (tech), Tech Empathy -10% (tech) ✅

### Aging Milestones (Plan 10) ⚠️ PARTIAL MATCH
- 10 milestones at ages 0-24, 25-30, 31-40, 41-50, 51-60, 61-70, 71-80, 81-90, 91-100, 101+ ✅
- Attribute modifiers per milestone ✅
- Glass Jaw at 61+ (unless Toughness) ✅
- Slow Learner at 61+ (unless Fast Learner) ✅
- **⚠️ NOTE**: Plan 10 shows aging modifiers as direct values (e.g., STR: -1.0). MekHQ's AgingMilestone.java divides values by 100 (i.e., stores as integer 100 = 1.0 modifier). Plan 10's notation is clearer and functionally equivalent. No issue.

### Faction Standing (Plan 5) ✅ MATCHES
- 9 levels from -60 to +60 ✅ (modifier doc lines 476-530)
- Regard deltas: SUCCESS=+1.875, BREACH=-5.156 ✅
- Daily decay: 0.375 toward zero ✅
- 11 gameplay effects ✅

### Financial (Plan 4) ✅ MATCHES
- Loan amortization: `P × r(1+r)^n / ((1+r)^n - 1)` ✅ (modifier doc lines 274-277)
- Overhead: 5% of salary ✅ (modifier doc)
- Food/housing: Officer 1260, Enlisted 552, Prisoner/Dependent 348 ✅ (modifier doc lines 256-270)
- Tax: flat rate on profits ✅

---

## 6. Missing Elements

### Blocking Issues

1. **Plan 3 (Repair Quality) stubs `TECH_SKILL_TYPE` inline** — Plan 7 defines the same skill ID as `tech-general` in the catalog. Plan 3's Task 3.3 creates a separate `TECH_SKILL_TYPE` constant. **Potential conflict**: Two definitions of the Tech skill type.
   - **Resolution**: Plan 3 should define specialized tech skills (tech-mech, tech-aero, etc.) but use Plan 7's catalog as the source of truth. The `getTechSkillValue()` helper in Plan 7.5 already handles this by looking up the person's tech skill. Plan 3.3's standalone `TECH_SKILL_TYPE` should be removed in favor of referencing Plan 7's catalog. If Plan 7 isn't built yet, Plan 3 stubs with `return 10` (unskilled default).

2. **Plan 11 ↔ Plan 12 circular type reference** — See Section 1. CombatRole must be defined first.

3. **Plan 4's `calculateFoodAndHousing()` iterates `campaign.personnel.values()`** — But ICampaign.personnel is `Map<string, IPerson>`. The plan's code sample uses a for-of loop which is correct for Map values. ✅ No issue.

4. **Plan 9's `IPlanetaryRatings` on ICampaignOptions** — This is a nested object type on campaign options. Most options are primitives. This works but adds complexity to the preset system (Plan 6).
   - **Resolution**: Acceptable. Presets can include nested objects in their overrides.

5. **Plan 6 adds `campaignType` as REQUIRED on ICampaign** — All other new fields across all plans are OPTIONAL. This is the only breaking change.
   - **Resolution**: Migration must default existing campaigns to `CampaignType.MERCENARY`.

### Non-Blocking Gaps

1. **No `IPartsInventory` defined anywhere** — Plan 9 mentions acquisition results need somewhere to land, stubs `scanForNeededParts()`. Parts delivered from acquisition have no destination type.
   - **Impact**: Low. Delivered parts can be tracked as simple counts or integrated with the existing repair system.

2. **Plan 17 (Markets) unit selection** — `selectRandomUnit()` needs to access the canonical 4200+ unit database. Plan 17 doesn't specify how this integration works.
   - **Impact**: Medium. The unit market needs a helper that queries the existing unit data store. This is an implementation detail, not a plan gap.

3. **Plan 6 `OPTION_META` must track ALL options** — Plan 6.2 says "define metadata for all existing 40 options." By the time Plan 6 is built, there could be 120+ options. Plan 6 should be built last or maintained incrementally.

4. **Day processor registration order within same phase** — Multiple processors share `DayPhase.PERSONNEL` (Plans 2, 10, 14) and `DayPhase.EVENTS` (Plans 5, 16). Plan 1 specifies "order by registration" for same-phase processors. The registration order determines execution order.
   - **Impact**: Low. Within-phase ordering shouldn't matter for these systems (turnover before/after aging doesn't change outcomes significantly). But document the expected order.

---

## 7. ICampaignOptions Field Count Projection

### Current: 40 fields

### New fields by plan:

| Plan | Net New Fields |
|------|---------------|
| 1 | 1 |
| 2 | 8 |
| 3 | 2 |
| 4 | 13 |
| 5 | 15 |
| 6 | 0 (adds to ICampaign, not options) |
| 7 | 1 |
| 8 | 3 |
| 9 | 6 |
| 10 | 14 |
| 11 | 2 |
| 12 | 0 |
| 13 | 0 |
| 14 | 1 |
| 15 | 1 |
| 16 | 4 |
| 17 | 3 |
| **Total new** | **74** |

### **Projected total: ~114 fields** (40 existing + 74 new)

**⚠️ CONCERN**: 114 fields is large but manageable with Plan 6's option group system. MekHQ has 700+ options across 15 GUI tabs. 114 is reasonable for "MekHQ-lite."

**Recommendation**: Plan 6's `OPTION_META` and `OptionGroupId` system is essential for organizing this. Build Plan 6 iteratively — add metadata as each plan's options are implemented.

---

## 8. Day Processor Registry

### Complete Processor Inventory

| Processor ID | Plan | Phase | Effective Frequency | Option Gate |
|-------------|------|-------|-------------------|-------------|
| `healing` | 1 (builtin) | PERSONNEL (100) | Daily | Always |
| `contracts` | 1 (builtin) | MISSIONS (400) | Daily | Always |
| `dailyCosts` | 1 (builtin) | FINANCES (700) | Daily | `!useRoleBasedSalaries` (gated by Plan 4) |
| `turnover` | 2 | PERSONNEL (100) | Weekly/Monthly (configurable) | `useTurnover` |
| `maintenance` | 3 | UNITS (500) | Every N days (configurable) | `useQualityGrades` |
| `financial` | 4 | FINANCES (700) | Monthly (1st) + Daily (maintenance) | `useRoleBasedSalaries` |
| `faction-standing` | 5 | EVENTS (800) | Daily (decay) + Monthly (escalation) | `trackFactionStanding` |
| `acquisition-processor` | 9 | MARKETS (300) | Daily | `useAcquisitionSystem` |
| `aging-processor` | 10 | PERSONNEL (100) | Daily (checks birthday internally) | `useAgingEffects` |
| `vocational-training-processor` | 10 | PERSONNEL (100) | Daily (timer-based internally) | `vocationalXP > 0` |
| `scenario-generation-processor` | 11 | MISSIONS (400)* | Weekly (Monday) | `useAtBScenarios` |
| `auto-awards-processor` | 14 | PERSONNEL (100)* | Monthly (1st) | `autoAwardConfig.enableAutoAwards` |
| `random-events-processor` | 16 | EVENTS (800) | Daily (routes internally) | `useRandomEvents` |
| `unit-market-processor` | 17 | MARKETS (300) | Monthly (1st internally) | `unitMarketMethod !== 'none'` |
| `personnel-market-processor` | 17 | MARKETS (300) | Daily | `personnelMarketStyle !== 'disabled'` |
| `contract-market-processor` | 17 | MARKETS (300) | Monthly (1st internally) | `contractMarketMethod !== 'none'` |

**Total: 16 processors**

### ID Conflict Check
**✅ No ID conflicts.** All processor IDs are unique.

### Phase Assignment Issues

1. **⚠️ Plan 11 (scenario-generation)**: Uses `phase: 'combat'` in registration snippet but DayPhase enum has no `COMBAT` phase. Closest is `MISSIONS (400)`.
   - **Resolution**: Use `DayPhase.MISSIONS` for scenario generation.

2. **⚠️ Plan 9 (acquisition)**: Uses `phase: 'logistics'` in registration snippet but DayPhase enum has no `LOGISTICS` phase. Closest is `MARKETS (300)`.
   - **Resolution**: Use `DayPhase.MARKETS` for acquisition processing.

3. **⚠️ Plan 14 (auto-awards)**: Registration snippet uses `phase: 'personnel'` but Plan 1 defines phases as DayPhase enum values (PERSONNEL = 100). Must use the enum, not string.
   - **Resolution**: All registration snippets should use `DayPhase.PERSONNEL`, `DayPhase.MARKETS`, etc. — not string values.

### Phase Ordering Validation

Within each phase, processors execute in registration order. Expected execution:

**PERSONNEL (100)**: healing → turnover → aging → vocational → auto-awards
- ✅ Healing before turnover: Healed person shouldn't leave same day (acceptable)
- ✅ Aging before vocational: Age-based trait changes (Slow Learner) affect XP costs correctly
- ✅ Auto-awards after all personnel changes: Awards check final state

**MARKETS (300)**: acquisition → unit-market → personnel-market → contract-market
- ✅ Order doesn't matter significantly for market processors

**MISSIONS (400)**: contracts → scenario-generation
- ✅ Contract processing before scenario generation: Contract state (morale) affects scenarios

**UNITS (500)**: maintenance
- ✅ Single processor, no ordering issue

**FINANCES (700)**: dailyCosts OR financial (mutually exclusive via option gate)
- ✅ Only one runs based on `useRoleBasedSalaries` flag
- **⚠️ IMPORTANT**: Plan 4 must add the gate to `dailyCosts` processor: `if (campaign.options.useRoleBasedSalaries) return { events: [], campaign };`

**EVENTS (800)**: faction-standing → random-events
- ✅ Standing changes before random events: Standing may affect event probabilities (future)

### Frequency Consistency

All processors are registered as `frequency: 'daily'` and handle their own internal frequency checks (isMonday, isFirstOfMonth, timer-based). This is consistent with Plan 1's design — the pipeline runs all processors every day, and each processor decides whether to actually process.

✅ **No frequency consistency issues.**

---

## Summary of Critical Findings

### Must Fix Before Implementation

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `maintenanceCycleDays` already exists — Plan 3 re-declares | LOW | Use existing field |
| 2 | `useLoanSystem` already exists — Plan 4 re-declares | LOW | Use existing field |
| 3 | `useRandomEvents` already exists — Plan 16 re-declares | LOW | Use existing field |
| 4 | `xpPerMission`/`xpPerKill` vs Plan 10's new XP fields | MEDIUM | Deprecate old fields, map as fallback |
| 5 | Plan 11 ↔ 12 circular type dependency | MEDIUM | Define CombatRole in Plan 11.1 first |
| 6 | Plan 6 `campaignType` as REQUIRED field | MEDIUM | Default to MERCENARY in migration |
| 7 | Registration snippet phase values use strings, not DayPhase enum | LOW | Use enum values |
| 8 | Plan 3 duplicate Tech skill type definition | MEDIUM | Use Plan 7 catalog, stub if not built |
| 9 | Plan 4 dailyCosts/financial mutual exclusion gate | HIGH | Add option gate to dailyCosts processor |

### Accepted Limitations

- 14 turnover modifiers permanently stubbed (no plans for fatigue, loyalty, shares, etc.)
- 4 auto-award categories permanently stubbed (no plans for faction kills, theatre, training)
- No parts inventory system (acquisitions deliver to abstract state)
- 114 projected options is large but manageable with Plan 6's grouping system

---

*Gap review complete. All 17 plans analyzed, cross-referenced, and validated.*
