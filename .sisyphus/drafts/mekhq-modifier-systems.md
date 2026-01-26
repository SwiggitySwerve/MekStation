# MekHQ Modifier Systems — Complete Calculation Pipeline Reference

> **Status**: COMPLETE — All 9 modifier pipelines traced to code level
> **Date**: January 2026
> **Scope**: Every modifier formula, calculation pipeline, and system interaction in MekHQ

This document traces the **actual implementation code** in MekHQ to understand how all options, modifiers, and calculations interact. This is the companion to `mekhq-vs-mekstation-analysis.md`.

---

## Table of Contents

1. [Day Advancement Pipeline (Master Orchestrator)](#1-day-advancement-pipeline)
2. [Turnover/Retention Modifiers](#2-turnoverretention-modifiers)
3. [Repair/Maintenance Modifiers](#3-repairmaintenance-modifiers)
4. [Acquisition/Supply Chain Modifiers](#4-acquisitionsupply-chain-modifiers)
5. [Financial Modifiers](#5-financial-modifiers)
6. [Combat/Scenario Modifiers](#6-combatscenario-modifiers)
7. [Medical/Healing Modifiers](#7-medicalhealing-modifiers)
8. [Personnel Progression Modifiers](#8-personnel-progression-modifiers)
9. [Faction Standing Modifiers](#9-faction-standing-modifiers)
10. [Cross-System Interaction Map](#10-cross-system-interaction-map)

---

## 1. Day Advancement Pipeline

**File**: `CampaignNewDayManager.java` (Lines 234-502)

The day advancement pipeline is the **central orchestrator** that ties all modifier systems together. It runs 24 phases in strict order.

### Execution Order (24 Phases)

| Phase | What | When | Option Gate |
|-------|------|------|-------------|
| 0 | Pre-setup (clear nags, refill pools, autosave) | Daily | Always |
| 1 | Advance date, celebrations, location checks | Daily | Always |
| 2 | Facility updates (field kitchen, MASH capacity) | Daily | `useFatigue`, `useMASHTheatres` |
| 3 | **Personnel processing** (MASSIVE — medical, relationships, XP, fatigue, compulsions) | Daily/Weekly/Monthly | Multiple |
| 4 | Disease & bioweapon checks | Daily/Monday | `useRandomDiseases`, `useAlternativeAdvancedMedical` |
| 5 | Market refreshes (personnel, unit) | Daily | Always |
| 6 | **AtB processing** (contracts, scenarios, morale, resupply, batchalls) | Daily/Monday/Monthly | `useAtB` |
| 7 | Reputation changes | Monday/Monthly | Always |
| 8 | Education processing | Daily | `useEducationModule` |
| 9 | Auto awards | Monthly | `enableAutoAwards` |
| 10 | Prisoner events | Monday/Monthly | Always |
| 11 | Facility rental payments | Monday/Monthly | Always |
| 12 | Tech minutes reset | Daily | Always |
| 13 | **Unit processing** (maintenance, parts, refits, MRMS) | Daily | Always |
| 14 | Force processing (formation levels, combat teams, icons) | Daily | Always |
| 15 | Procurement/shopping list | Daily | Conditional |
| 16 | **Financial processing** (taxes, contracts, salaries, overhead, loans) | Monthly/Daily | Multiple |
| 17 | Personnel cleanup | Monthly | `usePersonnelRemoval` |
| 18 | Turnover report duplication | Daily | Always |
| 19 | Weekly parts stock-up | Monday | Conditional |
| 20 | Random events (Gray Monday) | Conditional | Date-based |
| 21 | **Faction standing checks** (ultimatums, climate regard, accolades, censures) | Monthly/Yearly | `trackFactionStanding` |
| 22 | War & peace notifications | Daily | Always |
| 23 | Trigger NewDayEvent | Daily | Always |
| 24 | Return success | Daily | Always |

### Frequency Summary

- **Every Day**: Medical, parts transit, maintenance, facility updates
- **Monday**: Edge reset, fatigue recovery, scenario generation, disease checks, relationship events, compulsions
- **1st of Month**: Financial processing (salaries, overhead, taxes), market updates, vocational XP, auto awards, faction standing
- **2nd of Month**: Resupply processing
- **1st of Year**: Regard degradation, news reload, fiscal year processing

---

## 2. Turnover/Retention Modifiers

**File**: `RetirementDefectionTracker.java` (Lines 135-432)

### The Formula

```
Roll 2d6. If roll < targetNumber, person LEAVES.

targetNumber = BASE + 19 additive modifiers
```

### Modifier Stack (All Additive, Applied in Order)

| # | Modifier | Value Range | Condition | Effect |
|---|----------|-------------|-----------|--------|
| 1 | Base target | 3 (default) | Always | `turnoverFixedTargetNumber` |
| 2 | Founder | -2 | `person.isFounder()` | Founders harder to lose |
| 3 | Service contract | -N | Breaking contract early | `serviceContractModifier` |
| 4 | Skill desirability | -2 to +2 | `useSkillModifiers`, age < 50 | Skilled = harder to lose |
| 5 | Recent promotion | -1 | Promoted within 6 months | Loyalty from promotion |
| 6 | Fatigue | 0 to +3 | `useFatigue` + `useFatigueModifiers` | `((fatigue-1)/4)-1` clamped |
| 7 | HR strain | 0 to +10 | `useHRStrain` | `personnel / (hrCapacity × adminSkill)` |
| 8 | Management skill | varies | `useManagementSkill` | Commander leadership bonus |
| 9 | Shares | 0 to -X | `useShareSystem` | `-max(0, (sharesPct/10)-2)` |
| 10 | Unit rating | -1 to +2 | `useUnitRatingModifiers` | Based on Dragoon rating |
| 11 | Hostile territory | -2 | `useHostileTerritoryModifiers` | In combat contract zone |
| 12 | Mission status | -1 to +2 | `useMissionStatusModifiers` | Success=-1, Failure=+1, Breach=+2 |
| 13 | Loyalty | -2 to +2 | `useLoyaltyModifiers` | Based on loyalty score |
| 14 | Faction (campaign) | -2 to +4 | `useFactionModifiers` | At war=+4, ComStar match=-2 |
| 15 | Faction (origin) | -2 to +1 | `useFactionModifiers` | Pirate=+1, Clan=-2 |
| 16 | Age | -1 to +8 | `useAgeModifiers` | Young=-1, 50+=+3 to +8 |
| 17 | Family | -1 per | `useFamilyModifiers` | -1 spouse in unit, -1 children |
| 18 | Injuries | +1 per | Always | Per permanent injury |
| 19 | Officer status | -1 | Always | Officers harder to lose |

### Trigger: When does the check run?
- **Frequency-based**: Weekly (Monday), Monthly, Quarterly, Annually, or Never
- **Post-combat**: After scenario resolution if retirees exist
- **Manual**: Player can invoke from menu

### Outcome: What happens on failure?
- Person leaves campaign
- Payout: `salary × payoutRetirementMultiplier` (12× default)
- Infantry: If commander leaves, all non-founder soldiers follow
- Defectors: 0 C-bills payout

---

## 3. Repair/Maintenance Modifiers

**Files**: `Campaign.java:7574`, `Part.java:953`, `Maintenance.java:267-496`

### Repair Target Number Formula

```
TN = techSkillValue + modePenalty + qualityMod + unitQuirks + techSpecialties + eraMod + overtimeMod + shorthandedMod + planetaryMod
```

| Component | Range | Source |
|-----------|-------|--------|
| Tech skill value | 2-12+ | Tech's skill level |
| Mode penalty | -1 to +1 | Normal=0, Rush=+1, Extra Time=-1 |
| Quality mod | -2 to +3 | A=+3, B=+2, C=+1, D=0, E=-1, F=-2 |
| Unit quirks | -1 to +2 | Easy to Maintain=-1, Difficult=+1, Prototype TSM=+2 |
| Tech specialties | -1 each | Weapon/Armor/Internal Specialist |
| Era mod | varies | `faction.getEraMod(year)` if `useEraMods` |
| Overtime | +3 | If tech working overtime |
| Shorthanded | varies | Based on available AsTech support |
| Planetary | -1 to +4 | Gravity, atmosphere, temperature |

### Repair Time Formula

```
actualTime = baseTime × modeMultiplier × (prototypesTSM ? 2 : 1)
```

- Normal: 1.0×, Rush Job: 0.5×, Extra Time: 2.0×/3.0×/4.0×

### Maintenance Failure Cascade

Roll 2d6 vs TN. Margin = Roll - TN.

**Quality A (worst)**: Margin ≥ 4 → improve to B. Margin < -6 → 4 damage (destroyed). Margin < -4 → 3 damage.
**Quality D (default)**: Margin < -3 → reduce to E. Margin ≥ 5 → improve to C.
**Quality F (best)**: Margin < -2 → reduce to E.

Each quality level shifts repair difficulty by 1 point, creating a **feedback loop**: bad quality → harder maintenance → more failures → worse quality.

### MRMS Priority Order
1. Same-day assigned techs
2. Same-day unassigned techs  
3. Overflow assigned techs
4. Overflow unassigned techs

MRMS optimizes worktime (rush/extra time) to hit preferred target number per part type.

---

## 4. Acquisition/Supply Chain Modifiers

**Files**: `Procurement.java:161-188`, `Campaign.java:7780-7862`, `Planet.java:659-738`

### Acquisition Roll Formula

```
TN = baseTarget + negotiatorMod + clanPenalty + contractMod + grayMondayMod
```

| Availability | Base TN | Consumable TN |
|-------------|---------|---------------|
| A | 3 | 0 |
| B | 4 | 1 |
| C | 6 | 2 |
| D | 8 | 4 |
| E | 10 | 6 |
| F | 11 | 8 |
| X | 13 | Impossible |

**Negotiator Modifier**: None=+4, Ultra Green=+3, Green/Regular=0, Veteran=-2, Elite+=-3

### Planetary Acquisition Stack

```
planetaryMods = factionMod + techSophisticationMod + industryMod + outputMod
```

| Planet Rating | Tech Mod | Industry Mod | Output Mod |
|--------------|----------|-------------|------------|
| A | -2 | -3 | -3 |
| B | -1 | -2 | -2 |
| C | 0 | -1 | -1 |
| D | +1 | 0 | 0 |
| E | +2 | +1 | +1 |
| F | +8 | IMPOSSIBLE | IMPOSSIBLE |

### Delivery Time Formula

```
transitMonths = max(1, (7 + 1d6 + availability) / 4)
```

### Auto-Logistics Percentages

Each equipment type has a configurable stock target:
- Armor: 100%, Ammunition: 100%, Actuators: 100%
- Heat Sinks: 50%, Jump Jets: 50%, Weapons: 50%
- Mek Head: 40%, Mek Location: 25%, Engines: 0%

---

## 5. Financial Modifiers

**Files**: `Finances.java`, `Accountant.java`, `Loan.java`, `Contract.java`

### Contract Payment Formula

```
monthlyPayout = (totalAmount + support + overhead + transport - fees + signing - advance) / months
```

**Force Value** (alternate payment model unit values):
- BattleMek Light: 3M, Medium: 6M, Heavy: 9M, Assault: 12M
- Aerospace: 3M/6M/9M by weight
- Combat Vehicle: 500K-2M by weight
- Infantry: 1.2M-2.8M by type

**Diminishing Returns** (if enabled):
```
multiplier = max(0.1, 1.0 - (0.1233 × (unitIndex - start)²))
```

### Salary Formula

```
salary = roleBaseSalaries[role] × xpMultiplier[skillLevel] × specialMultipliers × rankMultiplier
```

- Anti-Mek multiplier: 1.5× (configurable)
- Specialist infantry multiplier: 1.28× (configurable)
- Secondary role: half base salary (can be disabled)

### Monthly Costs

```
totalCost = salaries + overhead(5%) + maintenance + peacetimeCost + foodAndHousing + loanPayments
```

**Food/Housing per person per month**:
- Officer: 780 housing + 480 food = 1,260
- Enlisted: 312 housing + 240 food = 552
- Prisoner/Dependent: 228 housing + 120 food = 348

### Tax Formula

```
taxes = max(0, profits) × taxPercentage / 100
profits = currentBalance - startingCapital - carryover
```

### Loan Amortization

```
payment = principal × (rate × (1+rate)^N) / ((1+rate)^N - 1)
where rate = annualRate / 100 / paymentsPerYear
```

### Price Multipliers

```
price = basePrice × techMultiplier × conditionMultiplier
```

| Tech | Unit Mult | Part Mult |
|------|-----------|-----------|
| Common | 1.0× | 1.0× |
| Inner Sphere | configurable | configurable |
| Clan | configurable | configurable |
| Mixed | configurable | — |

| Condition | Multiplier |
|-----------|-----------|
| Damaged | 0.33× |
| Unrepairable | 0.1× |
| Used (by grade) | 0.1× to 0.9× |
| Cancelled order refund | 0.5× |

---

## 6. Combat/Scenario Modifiers

**Files**: `CombatTeam.java`, `AtBDynamicScenarioFactory.java`, `ResolveScenarioTracker.java`

### Battle Chance Formula

```
if (random(100) > atbBattleChance[role]) → no battle

battleTypeMod = 1 + (STALEMATE_level - currentMorale) × 5
```

| Role | Base Chance |
|------|-------------|
| Maneuver | 40% |
| Patrol | 60% |
| Frontline | 20% |
| Training | 10% |
| Cadre | 10% |

### OpFor BV Formula

```
opForBV = playerBV × difficultyMultiplier × forceMultiplier × (scenarioModBV / 100)
targetBV = opForBV × (85-120%)  // random variation
```

Allows 10% BV overage before culling units.

### Scenario Conditions

**Weather/Light/Planetary** conditions are applied if enabled, and affect force composition:
- Low pressure → no tanks
- Toxic atmosphere → no conventional infantry, no tanks
- Low gravity (≤0.2) → no tanks
- Tornado F4 → no tanks, no battle armor

### XP Award Formula

```
totalXP = scenarioXP + (killCount / killsForXP) × killXPAward + missionXP
```

| Mission Outcome | XP |
|----------------|-----|
| Fail | 1 |
| Success | 3 |
| Outstanding | 5 |

### Morale Effects

Each morale level (7 levels from Routed to Overwhelming) shifts scenario type roll by ±5.

---

## 7. Medical/Healing Modifiers

**Files**: `MedicalController.java`, `InjuryUtil.java`, `AdvancedMedicalAlternateHealing.java`, `Inoculations.java`

### Three Medical Systems

MekHQ has **three** medical systems (configurable):

#### Standard Medical
```
healCheck = SkillCheck(doctor.Surgery, modifiers)
modifiers = shorthandedMod + tougherHealingMod + patientMods
tougherHealingMod = max(0, hits - 2)  // if tougherHealing enabled
```
- Success: Heal 1 hit, wait `healWaitingPeriod` days
- Failure: Wait `healWaitingPeriod` days
- Natural healing (no doctor): Wait `naturalHealingWaitingPeriod` days

#### Advanced Medical
- Roll d100 vs doctor's Surgery skill
- Fumble/Crit thresholds per skill level (e.g., Green fumbles on <50, Elite on <5)
- Fumble: Injury worsens +20% or +5 days
- Critical success: -10% healing time
- Untreated: 30% chance injury worsens per day

#### Alternate Advanced Medical
```
marginOfSuccess = AttributeCheck(patient.BODY or doctor.Surgery, penalty)
penalty = max(0, totalInjurySeverity - toughness) + prostheticPenalty(4)
```
- MoS ≥ 0: Heals
- -6 < MoS < 0: Extended healing time
- MoS ≤ -6: Becomes **permanent** (Edge reroll available)
- SPA modifiers: Fit=-1, Toughness=-1

### Healing Time Formula

```
time = round(baseRecoveryTime × randomVariation(80-120%) × abilityTimeModifier / 10000)
```

### Doctor Capacity

```
capacity = baseBedCount + (adminSkillLevel × baseBedCount × 0.2)  // if doctorsUseAdministration
```

### MASH Capacity

```
mashCount = dropships×1 + warships×2 + spaceStations×3 + explicitMASHEquipment
totalBeds = mashCount × mashTheatreCapacity + rentedHospitalBeds
```

### Disease System

```
newDiseaseChance = 1/1000 per person per month
spreadChance = 1/50 per contact per month
superSpreader: 3× spread rate
```

---

## 8. Personnel Progression Modifiers

**Files**: `Person.java:5563-5589`, `Aging.java`, `SingleSpecialAbilityGenerator.java`

### XP Sources (8 types)

| Source | Default | When |
|--------|---------|------|
| Scenario participation | 1 | Per scenario |
| Kill award | varies | When kill count hits threshold |
| Task completion | 1 | Per tech/medical task |
| Vocational training | 1 | Monthly roll vs TN 7 |
| Contract negotiation | 0 | Per negotiation |
| Admin tasks | 0 | Per admin period |
| Mission completion | 1/3/5 | Fail/Success/Outstanding |
| Education | varies | Per academy day |

### Skill Cost Formula

```
cost = baseCost[nextLevel] × xpCostMultiplier × reasoningMultiplier × traitModifiers

reasoningMultiplier = 1 - (reasoningScore × 0.025)
```

| Trait | Effect |
|-------|--------|
| Slow Learner (flaw) | +20% cost |
| Fast Learner | -20% cost |
| Gremlins (tech skills) | +10% cost |
| Tech Empathy (tech skills) | -10% cost |
| Reasoning +4 | -10% cost |
| Reasoning -4 | +10% cost |

### Aging Effects

| Age | Attribute Modifiers |
|-----|-------------------|
| < 25 | None |
| 25-34 | First milestone (minor) |
| 35-44 | Second milestone + may gain Glass Jaw flaw |
| 45-54 | Third milestone + may gain Slow Learner flaw |
| 55-64 | Fourth milestone |
| 65+ | Elder milestone |

### SPA Acquisition

- **Veterancy**: On reaching Veteran+ skill level, auto-roll one SPA
- **Coming of Age**: At age 16, roll one SPA (if enabled)
- **Purchase**: Spend XP to buy specific SPAs (prerequisites checked)
- **Conflicts**: Some SPAs remove conflicting abilities when acquired

---

## 9. Faction Standing Modifiers

**Files**: `FactionStandings.java`, `FactionStandingLevel.java`, `FactionStandingUtilities.java`

### Regard Formula

```
totalRegard = factionRegard + climateRegard
adjustedDelta = delta × regardMultiplier
newRegard = clamp(regard + adjustedDelta, -60, +60)
```

### Standing Levels (9 levels)

| Level | Regard Range | Negotiation | Contract Pay | Barracks Cost | Recruitment | Unit Market | Outlawed |
|-------|-------------|-------------|-------------|---------------|-------------|-------------|----------|
| 0 | -60 to -50 | -4 | 0.6× | 3.0× | 0 tickets | -2 rarity | YES |
| 1 | -50 to -40 | -3 | — | — | — | — | YES |
| 2 | -40 to -25 | -2 | — | — | — | — | NO |
| 3 | -25 to -10 | -1 | — | — | — | — | NO |
| 4 | -10 to +10 | 0 | 1.0× | 1.0× | baseline | 0 | NO |
| 5 | +10 to +25 | +1 | — | — | — | — | NO |
| 6 | +25 to +40 | +2 | — | — | — | — | NO |
| 7 | +40 to +50 | +3 | — | — | — | Command Circuit | NO |
| 8 | +50 to +60 | +4 | 1.2× | 0.75× | max tickets | +3 rarity | NO |

### 11 Gameplay Effects (Each Toggleable)

1. **Negotiation**: -4 to +4 on contract negotiation rolls
2. **Resupply Weight**: 0.0× to 2.0× resupply availability
3. **Command Circuit**: Access at Level 7+ only
4. **Outlawed**: Blocks system entry at Level 0-1
5. **Batchall**: Clan challenges disabled at Level 0-1
6. **Recruitment**: 0 to 15 recruitment tickets, 0.0× to 2.0× rolls modifier
7. **Barracks Costs**: 3.0× to 0.75× daily housing/food costs
8. **Unit Market**: -2 to +3 rarity modifier
9. **Contract Pay**: 0.6× to 1.2× payment multiplier
10. **Support Points (Start)**: -3 to +3 at contract start
11. **Support Points (Periodic)**: -4 to +3 ongoing

### Regard Deltas

| Event | Delta |
|-------|-------|
| Contract Success | +1.875 |
| Contract Partial | +0.625 |
| Contract Failure | -1.875 |
| Contract Breach | -5.156 |
| Accept Enemy Contract | -1.875 |
| Refuse Batchall | -10.3125 |
| Daily Degradation | ±0.375 toward zero |

### Accolade/Censure Escalation

**Accolades** (at regard ≥ Level 5): Taking Notice → Press Recognition → Cash Bonus → Adoption → Statue
**Censures** (at regard < 0): Formal Warning → News Article → Commander Retirement → Leadership Replacement → Disband

---

## 10. Cross-System Interaction Map

### How Systems Feed Into Each Other

```
                    ┌──────────────────────────────┐
                    │     DAY ADVANCEMENT           │
                    │   (CampaignNewDayManager)     │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼────┐              ┌─────▼─────┐             ┌──────▼──────┐
   │PERSONNEL│              │   UNITS   │             │  FINANCES   │
   │Processing│              │Processing │             │ Processing  │
   └────┬────┘              └─────┬─────┘             └──────┬──────┘
        │                         │                          │
   ┌────▼────┐              ┌─────▼─────┐             ┌──────▼──────┐
   │ Medical │◄────────────►│Maintenance│────────────►│  Costs &    │
   │ Healing │   injuries   │ & Repair  │  repair $   │  Payments   │
   └────┬────┘              └─────┬─────┘             └──────┬──────┘
        │                         │                          │
        │ fatigue                  │ parts                    │ salary fail
        ▼                         ▼                          ▼
   ┌─────────┐              ┌───────────┐             ┌──────────────┐
   │Turnover/│◄─────────────│Acquisition│◄────────────│   Loyalty    │
   │Retention│   HR strain  │Supply Chain│  can afford │  Modifiers   │
   └────┬────┘              └─────┬─────┘             └──────────────┘
        │                         │
        │ mission result          │ planetary
        ▼                         ▼
   ┌─────────┐              ┌───────────┐
   │ Combat/ │◄────────────►│  Faction   │
   │Scenarios│  regard delta│  Standing  │
   └────┬────┘              └─────┬─────┘
        │                         │
        │ morale, XP              │ contract pay mod
        ▼                         ▼
   ┌─────────┐              ┌───────────┐
   │Personnel│              │  Markets   │
   │Progress │              │(Unit/Pers/ │
   │(XP/Skill│              │ Contract)  │
   └─────────┘              └───────────┘
```

### Key Cross-System Dependencies

| System A | Feeds Into | How |
|----------|-----------|-----|
| **Medical** → Turnover | Permanent injuries = +1 turnover modifier per injury |
| **Medical** → Fatigue | `useInjuryFatigue` links injuries to fatigue |
| **Fatigue** → Turnover | Fatigue 5-8=+1, 9-12=+2, 13+=+3 turnover modifier |
| **Salary failure** → Loyalty | Unpaid salary triggers forced loyalty decrease |
| **Loyalty** → Turnover | Loyalty score = -2 to +2 turnover modifier |
| **Mission outcome** → Turnover | Success=-1, Failure=+1, Breach=+2 modifier |
| **Mission outcome** → Morale | Victory/defeat shifts morale level |
| **Mission outcome** → Regard | Success=+1.875, Failure=-1.875 regard delta |
| **Morale** → Scenario generation | Each morale level = ±5 on scenario type roll |
| **Faction standing** → Contract pay | 0.6× to 1.2× payment multiplier |
| **Faction standing** → Negotiation | -4 to +4 on negotiation rolls |
| **Faction standing** → Recruitment | 0 to 15 recruitment tickets |
| **Faction standing** → Barracks costs | 3.0× to 0.75× cost multiplier |
| **Faction standing** → Unit market | -2 to +3 rarity modifier |
| **Planet** → Acquisition | Tech/industry/output bonuses (-3 to +8) |
| **Planet** → Maintenance | Gravity, atmosphere, temperature modifiers |
| **Part quality** → Maintenance | Quality A=+3, F=-2 on maintenance TN |
| **Maintenance failure** → Quality | Failed maintenance degrades quality |
| **HR strain** → Turnover | `personnel / (hrCapacity × adminSkill)` |
| **Unit rating** → Turnover | Poor rating = +2, good rating = -1 |
| **Shares** → Turnover | Higher share % = lower turnover |
| **Family** → Turnover | Spouse=-1, Children=-1 modifier |
| **Age** → Turnover | Age 50+ = +3 to +8 modifier |
| **Age** → Attributes | Aging milestones degrade physical attributes |
| **Reasoning** → XP cost | 2.5% per rank adjustment |
| **Education** → XP | Academy curriculum and faculty XP rates |
| **Personality** → Various | Compulsions, madness, gambling, addiction effects |

### The Feedback Loops

1. **Quality Death Spiral**: Bad quality → harder maintenance → failure → worse quality → harder maintenance...
2. **Financial Spiral**: Unpaid salary → loyalty drop → higher turnover → fewer techs → worse repairs → more costs
3. **Reputation Virtuous Cycle**: Good standing → better pay → more money → better equipment → mission success → more standing
4. **Morale Momentum**: Victory → morale up → easier scenarios → more victories → morale up...
5. **Fatigue Cascade**: High fatigue → higher turnover risk → fewer personnel → more fatigue per person

---

## What This Means for MekStation

### Implementation Priority by Impact

**HIGH IMPACT** (these create the most gameplay depth):
1. **Day advancement pipeline** — The backbone everything hangs on
2. **Turnover/retention** — Creates tension and consequence
3. **Repair quality cascade** — Makes maintenance meaningful
4. **Financial operating costs** — Forces hard choices
5. **Faction standing effects** — Rewards/punishes player behavior

**MEDIUM IMPACT** (significant but can be simplified initially):
6. **Medical system** (start with Standard, defer Advanced)
7. **Acquisition pipeline** (start without planetary modifiers)
8. **Scenario generation** (start with basic battle chance)
9. **Personnel XP/progression** (basic XP sources first)

**LOWER IMPACT** (can be added incrementally):
10. **Personality effects** (compulsions, madness)
11. **Family modifiers** (marriage, children)
12. **Education system** (academies)
13. **Disease system** (diseases, inoculations)

### Key Architecture Decision for MekStation

MekHQ uses **700+ campaign options** as boolean/number toggles because it grew organically over 15 years. MekStation could take a **preset-based approach** instead:

- **Casual Mode**: Minimal modifiers (like MekStation's current 40 options)
- **Standard Mode**: Core modifier stack (turnover, repair, finance, standing)
- **Full Simulation**: All MekHQ-equivalent modifiers
- **Custom**: Pick and choose individual modifiers

This avoids the "700 checkboxes" problem while still supporting the full depth.
