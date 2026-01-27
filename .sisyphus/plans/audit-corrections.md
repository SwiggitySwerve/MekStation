# MekHQ Source Audit Corrections — 10 Implementation Plans

## Context

### Original Request
Apply factual corrections to 10 implementation plan files (`.sisyphus/plans/*.md`) that were found to contain errors when audited against the MekHQ Java source code at `E:\Projects\mekhq`. This is a **documentation-only** task — zero code changes.

### Interview Summary
**Key Discussions**:
- All 21 plan files were audited by 19 parallel explore agents against MekHQ source (19 implementation plans + 2 UX audit plans outside audit scope)
- 11 plans were verified as sound or out of scope; 10 plans contain factual errors
- Previous Metis review validated all corrections and identified guardrails
- Corrections align plans to **MekHQ source truth** (the canonical reference), not what MekStation implemented
- Features MekStation adds beyond MekHQ get tagged `[MekStation Enhancement]`
- Commit message text within plan files should be **preserved as-is** (historical record) with inline audit comments

**Research Findings**:
- Corrections range from minor (wrong counts) to critical (wrong formulas, missing systems)
- Cross-plan value propagation is the highest risk — "40+ skills" appears in multiple plans
- All plans are marked ✅ COMPLETED — checkmarks and numbering must be preserved

### Metis Review
**Identified Gaps** (addressed):
- Gap: No structured correction manifest → Resolved: each task includes full correction table
- Gap: 11 sound/out-of-scope plans not explicitly listed → Resolved: DO-NOT-TOUCH list in guardrails
- Gap: Checkmark corruption risk → Resolved: pre/post checkmark count verification
- Gap: Cross-plan value propagation → Resolved: cross-grep verification task at end
- Gap: Commit message text in plans → Resolved: preserve as-is, annotate with HTML comments
- Gap: Intent of corrections → Resolved: align to MekHQ source truth; MekStation extras tagged

---

## Work Objectives

### Core Objective
Correct factual errors in 10 implementation plan files so they accurately reflect the MekHQ Java source code, while preserving all completion markers, task numbering, and plan structure.

### Concrete Deliverables
- 10 corrected `.sisyphus/plans/*.md` files
- Each with `## Audit Corrections` summary section
- Each correction site annotated with `<!-- AUDIT: ... -->` HTML comments
- 1 git commit on `chore/plan-updates-audit` branch

### Definition of Done
- [ ] All 10 plans corrected per their correction manifests
- [ ] Each plan has `## Audit Corrections` section after the ✅ banner
- [ ] Every correction site has an inline `<!-- AUDIT: ... -->` comment
- [ ] `[x]` checkmark counts unchanged in all 10 files
- [ ] Zero old incorrect values remain across all 21 plan files (cross-grep verified)
- [ ] `git diff --stat` shows exactly 10 files changed, all in `.sisyphus/plans/`
- [ ] Single commit: `docs(plans): apply MekHQ source audit corrections to 10 implementation plans`

### Must Have
- Every correction from the manifest applied
- Inline HTML audit comments at every correction site
- `## Audit Corrections` summary in each corrected plan
- `[MekStation Enhancement]` tags on non-MekHQ features
- Cross-plan grep verification for old incorrect values

### Must NOT Have (Guardrails)
- **NO code changes** — only `.sisyphus/plans/*.md` files
- **NO edits to the 11 DO-NOT-TOUCH plans** (listed below)
- **NO changes to `[x]` checkmarks** — preserve all completion markers
- **NO task additions, removals, or renumbering**
- **NO section reordering or structural changes**
- **NO modifications to `> **✅ COMPLETED**` banners**
- **NO changes to `## Task Flow` diagrams**
- **NO editorial improvements** beyond the correction manifest
- **NO changes to actual git commit messages** in Commit Strategy tables — preserve as historical record, annotate with HTML comments if needed
- **NO multi-commit** — all corrections in a single commit

### DO-NOT-TOUCH Plans (11 files)
These plans were verified as sound or are outside audit scope. **Do not modify under any circumstances:**
1. `day-advancement-expansion.md`
2. `financial-system-expansion.md`
3. `rank-system.md`
4. `awards-auto-granting.md`
5. `markets-system.md`
6. `personnel-status-role-expansion.md`
7. `mekhq-campaign-system.md`
8. `campaign-options-presets.md`
9. `campaign-meta-execution.md`
10. `ux-audit.md`
11. `ux-audit-screen-map.md`

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (documentation-only task)
- **User wants tests**: Manual-only
- **Framework**: N/A

### Manual QA Only

Each task includes:
1. **Pre-edit**: Count `[x]` markers with `grep -c "\[x\]" <file>`
2. **Apply corrections**: Edit per manifest
3. **Post-edit**: Re-count `[x]` markers — must match pre-edit count
4. **Cross-grep**: Search all 21 plan files for old incorrect values

---

## Templates

### `## Audit Corrections` Section Template
Place immediately after the `> **✅ COMPLETED**` banner, before `## Context`:

```markdown
## Audit Corrections

> Applied {DATE} — corrections align this plan with MekHQ Java source code.

| # | Old Value | New Value | MekHQ Source |
|---|-----------|-----------|--------------|
| 1 | "40+ skill types" | "109 skill types" | `SkillType.java:98-211` |
| 2 | ... | ... | ... |

**MekStation Enhancements** (features beyond MekHQ, tagged in text):
- [List any items tagged `[MekStation Enhancement]`]
```

### Inline HTML Comment Template
At each correction site in the plan body:

```markdown
109 skill types <!-- AUDIT: Corrected from "40+ skill types". Source: MekHQ SkillType.java:98-211 -->
```

---

## Task Flow

```
                    ┌→ Task 2 (personnel)
Task 1 (skills) ───┤
                    └→ Task 3 (medical)
                                            ┌→ Task 10 (contract)
Task 4 (turnover)  ─┐                      │
Task 5 (acquisition)├── all independent ──┐ │
Task 6 (faction)   ─┤                    │ │
Task 7 (events)  ───┤────────────────────┼─┘
Task 8 (scenario)  ─┤                    │
Task 9 (repair)    ─┘                    │
                                          ↓
                                    Task 11 (verify)
                                          ↓
                                    Task 12 (commit)
```

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Foundational — other plans reference skill counts |
| 2 | 1 | References skill counts from Plan 7 (skills) |
| 3 | 1 | References skill names from Plan 7 |
| 4 | None | Independent corrections |
| 5 | None | Independent corrections |
| 6 | None | Independent corrections |
| 7 | None | Independent corrections |
| 8 | None | Independent corrections |
| 9 | None | Independent corrections |
| 10 | 7 | References event count from random-events |
| 11 | 1-10 | Cross-grep verification after all edits |
| 12 | 11 | Commit after verification passes |

**Parallel Groups:**
| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1 | Must go first (foundational) |
| B | 2, 3 | Depend on 1 |
| C | 4, 5, 6, 7, 8, 9 | Independent of each other |
| D | 10 | Depends on 7 |
| E | 11 | Verification after all |
| F | 12 | Commit after verification |

---

## TODOs

### Task 1: Correct `skills-expansion.md`

- [x] 1. Apply audit corrections to skills-expansion.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site
  - Tag any MekStation-only features with `[MekStation Enhancement]`

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | "40+ skill types" | "109 skill types" | `SkillType.java:98-211` (109 static String constants) | Appears ~14 times throughout file. Change ALL occurrences in narrative text, DoD items. |
  | 2 | "4 experience tiers (Green/Regular/Veteran/Elite)" | "7 gameplay tiers (Ultra-Green/Green/Regular/Veteran/Elite/Heroic/Legendary) + EXP_NONE sentinel" | `SkillType.java` EXP_ULTRA_GREEN=0 through EXP_LEGENDARY=6, EXP_NONE=-1 | Update tier counts and lists everywhere |
  | 3 | (missing) Cost array special values | Add: "-1 means DISABLED_SKILL_LEVEL (inaccessible), 0 means free auto-advance" | `SkillType.java:248` | Add as note near cost/progression discussion |
  | 4 | (missing) Attribute modifier formula | Add: `Math.max(1, Math.round(baseCost * (1 - attrMod * 0.05)))` | `SkillType.java` | Add near attribute modifier discussion |
  | 5 | "6 skill attributes" (if mentioned) | "8 skill attributes" — add WILLPOWER and EDGE | `SkillAttribute.java` | Plan mentions 6 attributes, missing 2 |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks
  - Modify commit messages in Commit Strategy table (annotate with HTML comment if needed)
  - Change task numbering

  **Parallelizable**: NO (must complete before Tasks 2, 3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\SkillType.java` — Lines 98-211 for skill constants, EXP level constants, cost array special values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\enums\SkillAttribute.java` — All 8 attribute enums
  - `.sisyphus/plans/skills-expansion.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present after ✅ banner
  - [ ] All "40+" occurrences changed to "109" (or contextually appropriate number)
  - [ ] All "4 tiers" / "4 experience tiers" changed to "7 gameplay tiers" with full list
  - [ ] Cost array special values documented
  - [ ] Attribute modifier formula added
  - [ ] "8 skill attributes" with WILLPOWER and EDGE
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count
  - [ ] `grep -c "\[x\]" .sisyphus/plans/skills-expansion.md` — same before and after

  **Commit**: NO (batched with Task 12)

---

### Task 2: Correct `personnel-progression.md`

- [x] 2. Apply audit corrections to personnel-progression.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site
  - Tag MekStation-only features with `[MekStation Enhancement]`

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | "Mission XP" sources (missionFailXP, missionSuccessXP, missionOutstandingXP) | Remove or flag as `[MekStation Enhancement]` — NOT found in MekHQ CampaignOptions.java | `CampaignOptions.java` — searched, not present | If these are MekStation additions, tag them. If plan just assumed they exist, add correction note. |
  | 2 | (missing) Reasoning XP cost multiplier | Add: "2.5% per Reasoning rank, applied BEFORE trait multipliers" | `Person.java:7707-7717` | Add near XP cost discussion |
  | 3 | `IPerson.traits` object for trait storage | Correct to: `PersonnelOptions` via `person.getOptions().booleanOption()` | `Person.java` PersonnelOptions pattern | Fix trait storage references |
  | 4 | 6 tech skills listed | Expand to 8: add COMPUTERS, COMMUNICATIONS, SECURITY_SYSTEMS_ELECTRONIC | `SkillType.java:706-715` | Add missing skills to tech skill lists |
  | 5 | SPA purchase method (`purchaseSPA()`) | Flag as `[UNVERIFIED]` — no explicit method found in MekHQ | Searched MekHQ source — not found | Add `[UNVERIFIED]` tag, don't remove |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks
  - Modify commit messages in Commit Strategy table

  **Parallelizable**: YES (with Task 3, after Task 1 completes)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\campaignOptions\CampaignOptions.java` — XP source configuration
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java` — Lines 7707-7717 for Reasoning multiplier; PersonnelOptions usage
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\SkillType.java` — Lines 706-715 for tech skills
  - `.sisyphus/plans/personnel-progression.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] Mission XP sources flagged or removed with audit comment
  - [ ] Reasoning XP cost multiplier documented
  - [ ] Trait storage references corrected to PersonnelOptions
  - [ ] 8 tech skills listed (was 6)
  - [ ] SPA purchase tagged `[UNVERIFIED]`
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 3: Correct `medical-system.md`

- [x] 3. Apply audit corrections to medical-system.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site
  - Tag MekStation-only features with `[MekStation Enhancement]`

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | "3 named systems: STANDARD/ADVANCED/ALTERNATE" | "2 boolean flags: `useAdvancedMedical`, `useAlternativeAdvancedMedical`" | `CampaignOptions.java` | MekHQ doesn't name 3 systems — it has 2 boolean toggles |
  | 2 | "Medicine skill" | "Surgery skill" (`S_SURGERY`) | `SkillType.java:129` | The healing skill is Surgery, not Medicine |
  | 3 | `healingRateMultiplier` | Remove or flag as `[MekStation Enhancement]` — not in MekHQ CampaignOptions | `CampaignOptions.java` — searched, not present | |
  | 4 | Surgery mechanic (if presented as MekHQ feature) | Tag as `[MekStation Enhancement]` | Not in MekHQ source | Surgery mechanic beyond basic Surgery skill is MekStation-specific |
  | 5 | (missing) naturalHealingWaitingPeriod | Add: "default 15 days" | `CampaignOptions.java` | MekHQ feature not in plan |
  | 6 | (missing) MASH theatre capacity | Add: "default 25" | `CampaignOptions.java` | MekHQ feature not in plan |
  | 7 | (missing) SPA modifiers for Alternate system | Add note about SPA modifiers | MekHQ Alternate system code | |
  | 8 | (missing) Fatigue effects on healing | Add note | MekHQ medical code | |
  | 9 | (missing) tougherHealing option | Add note | `CampaignOptions.java` | |
  | 10 | (missing) useKinderAlternativeAdvancedMedical | Add note about this option | `CampaignOptions.java` | |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks
  - Modify commit messages in Commit Strategy table

  **Parallelizable**: YES (with Task 2, after Task 1 completes)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\campaignOptions\CampaignOptions.java` — Medical options, boolean flags
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\SkillType.java:129` — S_SURGERY constant
  - `.sisyphus/plans/medical-system.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] "3 systems" replaced with "2 boolean flags" description
  - [ ] "Medicine skill" → "Surgery skill" everywhere
  - [ ] `healingRateMultiplier` flagged/removed
  - [ ] Surgery mechanic tagged `[MekStation Enhancement]`
  - [ ] Missing MekHQ features noted (6 items: naturalHealingWaitingPeriod, MASH capacity, SPA modifiers, fatigue, tougherHealing, kinder variant)
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 4: Correct `turnover-retention-system.md`

- [x] 4. Apply audit corrections to turnover-retention-system.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | Age bracket modifiers (incorrect values) | Correct to: age ≤ 20: -1, 50-64: +3, 65-74: +4, 75-84: +5, 85-94: +6, 95-104: +7, 105+: +8 | `RetirementDefectionTracker.java:818-838` | Fix all age bracket references |
  | 2 | "19 modifiers" | "27 modifiers" | Metis validated 27 unique modifiers in RetirementDefectionTracker.java | Change count everywhere it appears (~8 times) |
  | 3 | (missing) Tactical Genius ability modifier | Add: "+1 for non-officers" | `RetirementDefectionTracker.java:416-417` | |
  | 4 | (missing) Wartime modifier | Add: "+4 when faction at war with origin faction" | `RetirementDefectionTracker.java:350-353` | |
  | 5 | Faction modifiers (described as single item) | Expand: "7 distinct faction checks" | `RetirementDefectionTracker.java:321-355` | 7 separate checks, not 1 |
  | 6 | Morale level (implied personnel-level) | Correct: "morale is CONTRACT-level, not PERSONNEL-level" | `MHQMorale.java` | Important architectural note |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks
  - Modify commit messages in Commit Strategy table

  **Parallelizable**: YES (with Tasks 5, 6, 7, 8, 9)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\turnoverAndRetention\RetirementDefectionTracker.java` — Lines 321-355 (faction), 416-417 (Tactical Genius), 818-838 (age brackets)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\MHQMorale.java` — Contract-level morale
  - `.sisyphus/plans/turnover-retention-system.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] Age bracket modifiers match MekHQ values exactly
  - [ ] "19 modifiers" → "27 modifiers" everywhere
  - [ ] Tactical Genius modifier documented
  - [ ] Wartime modifier documented
  - [ ] 7 faction checks described (was single item)
  - [ ] Morale noted as contract-level
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 5: Correct `acquisition-supply-chain.md`

- [x] 5. Apply audit corrections to acquisition-supply-chain.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | Planetary modifiers described as hardcoded | Correct: "values are CONFIGURABLE via CampaignOptions, not hardcoded" | `Planet.java:729-734` reads from campaign options | Important architectural difference |
  | 2 | (missing) Tech level modifiers | Add: "INTRO/STANDARD tech: -2 to TN, ADVANCED tech: -1 to TN" | `Procurement.java:237-245` | |
  | 3 | (missing) Resupply modifier | Add: "-2 to TN when isResupply=true" | `Procurement.java:183-185` | |
  | 4 | Delivery time formula | Flag as `[UNVERIFIED]` — `max(1, (7 + 1d6 + availIndex) / 4)` not found in MekHQ source | Searched MekHQ — not found | Don't remove, just flag |
  | 5 | "7 availability ratings" | "8 availability ratings" — add F_STAR (soft extinction) | `Availability.java` (class in `mekhq/campaign/parts/`) | MekHQ has 8 values not 7. Note: class is `Availability`, not `AvailabilityRating` |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks

  **Parallelizable**: YES (with Tasks 4, 6, 7, 8, 9)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\universe\Planet.java:729-734` — Configurable planetary modifiers
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\procurement\Procurement.java` — Lines 183-185 (resupply), 237-245 (tech level)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\parts\Availability.java` — 8 availability ratings (class name is `Availability`, not `AvailabilityRating`)
  - `.sisyphus/plans/acquisition-supply-chain.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] Planetary modifiers noted as configurable (not hardcoded)
  - [ ] Tech level modifiers documented
  - [ ] Resupply modifier documented
  - [ ] Delivery time formula tagged `[UNVERIFIED]`
  - [ ] 8 availability ratings (was 7) with F_STAR
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 6: Correct `faction-standing-system.md`

- [x] 6. Apply audit corrections to faction-standing-system.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | "5 accolade levels" | "15 accolade levels" (NO_ACCOLADE through LETTER_FROM_HEAD_OF_STATE) | `FactionAccoladeLevel.java` | Major count difference |
  | 2 | "5 censure levels" | "6 censure levels" (CENSURE_LEVEL_0 through CENSURE_LEVEL_5) | `FactionCensureLevel.java` | |
  | 3 | "11 gameplay effects" | "15 distinct modifiers" — add: resupply weight modifier (0.0-2.0), recruitment rolls modifier (0.0-2.0), recruitment tickets (0-15) | Faction standing code | 4 additional modifiers |
  | 4 | "11 effect toggles" | "12+ effect toggles" — add resupply, support start, support periodic toggles | Faction standing code | Additional toggles |
  | 5 | Batchall "disabled" at Level 0-1 | Correct to: "not allowed" at Level 0-1 | Faction standing code | Semantic difference matters |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks

  **Parallelizable**: YES (with Tasks 4, 5, 7, 8, 9)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\universe\factionStanding\FactionAccoladeLevel.java` — 15 enum values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\universe\factionStanding\FactionCensureLevel.java` — 6 enum values
  - `.sisyphus/plans/faction-standing-system.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] "5 accolade levels" → "15 accolade levels" everywhere
  - [ ] "5 censure levels" → "6 censure levels" everywhere
  - [ ] "11 effects" → "15 modifiers" with additions listed
  - [ ] "11 toggles" → "12+ toggles" with additions listed
  - [ ] Batchall "disabled" → "not allowed"
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 7: Correct `random-events.md`

- [x] 7. Apply audit corrections to random-events.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | "51 prisoner event types" | "57 prisoner event types" | `PrisonerEvent.java` — 57 enum values | |
  | 2 | "weekly on Mondays" | "fortnightly on Mondays" (every 2 weeks: `WEEK_OF_WEEK_BASED_YEAR % 2 == 0`) | `PrisonerEventManager.java:144` | Important frequency change |
  | 3 | Commander's Day = March 15 | Commander's Day = June 16 | `CommandersDayAnnouncement.java:66-67` | Wrong date |
  | 4 | Freedom Day = July 4 | Freedom Day = March 18 | `FreedomDayAnnouncement.java:68-69` | Wrong date |
  | 5 | Winter Holiday = December 25 | Winter Holiday = December 10 & 27 (two dates) | `WinterHolidayAnnouncement.java:69-70` | Wrong date, also 2 dates not 1 |
  | 6 | (missing) PrisonerCaptureStyle.MEKHQ gate | Add: prisoner events require `PrisonerCaptureStyle.MEKHQ` | `PrisonerEventManager.java:156` | Gate requirement not documented |
  | 7 | "10 contract event types" | "11 contract event types" — add SPORADIC_UPRISINGS | `AtBEventType.java:39` | |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks

  **Parallelizable**: YES (with Tasks 4, 5, 6, 8, 9)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\prisoners\enums\PrisonerEvent.java` — 57 enum values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\randomEvents\prisoners\PrisonerEventManager.java` — Line 144 (fortnightly), line 156 (capture style gate)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\lifeEvents\CommandersDayAnnouncement.java:66-67` — June 16
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\lifeEvents\FreedomDayAnnouncement.java:68-69` — March 18
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\lifeEvents\WinterHolidayAnnouncement.java:69-70` — Dec 10 & 27
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBEventType.java:39` — SPORADIC_UPRISINGS
  - `.sisyphus/plans/random-events.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] "51 prisoner events" → "57 prisoner events"
  - [ ] "weekly" → "fortnightly" for prisoner events
  - [ ] All 3 calendar dates corrected
  - [ ] PrisonerCaptureStyle.MEKHQ gate documented
  - [ ] "10 contract events" → "11 contract events" with SPORADIC_UPRISINGS
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 8: Correct `scenario-combat-expansion.md`

- [x] 8. Apply audit corrections to scenario-combat-expansion.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | BV range "75-125%" or "85-125%" | Correct to: "85-120%" — `randomInt(8)` returns 0-7, `(0-3)*5=-15` to `(7-3)*5=+20`, giving 85% to 120% | `AtBDynamicScenarioFactory.java:348` | CRITICAL math correction |
  | 2 | (missing) Total scenario types | Add: "21+ total scenario types (9 core + 12+ special)" | `AtBScenario.java:117-140` | |
  | 3 | Scenario type selection tables | Flag as `[UNVERIFIED]` — not found in AtBScenarioFactory.java | Searched MekHQ — not found | Don't remove, just flag |
  | 4 | (implied) AtBScenarioType enum | Note: "AtBScenarioType enum doesn't exist — MekHQ uses int constants (0-21)" | `AtBScenario.java` — uses int constants | Architecture note |
  | 5 | Battle chance percentages | Flag as `[UNVERIFIED]` — not found in CombatTeam.java | Searched MekHQ — not found | Don't remove, just flag |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks

  **Parallelizable**: YES (with Tasks 4, 5, 6, 7, 9)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\AtBDynamicScenarioFactory.java:348` — BV calculation
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\AtBScenario.java:117-140` — Scenario type int constants
  - `.sisyphus/plans/scenario-combat-expansion.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] BV range corrected to "85-120%" with math explanation
  - [ ] 21+ scenario types noted
  - [ ] Selection tables tagged `[UNVERIFIED]`
  - [ ] Int constants (not enum) noted
  - [ ] Battle chance tagged `[UNVERIFIED]`
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 9: Correct `repair-quality-cascade.md`

- [x] 9. Apply audit corrections to repair-quality-cascade.md

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below — this plan has the **most critical** correction (quality-dependent thresholds)
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | **CRITICAL**: Fixed maintenance thresholds | Quality-DEPENDENT thresholds per MekHQ: | `Maintenance.java:288-369` | This is the most important correction |
  |   | | Quality A: improve ≥ 4, can't degrade, damage at margin < -1 (1), < -4 (2), == -4 (2), < -4 (3), < -6 (4) | | |
  |   | | Quality B: improve ≥ 4, degrade < -5, damage at margin < -2 (1), < -6 (2) | | |
  |   | | Quality C: improve ≥ 5, degrade < -4, damage at margin < -3 (1), < -6 (2) | | |
  |   | | Quality D: improve ≥ 5, degrade < -3, damage at margin < -4 (1) | | |
  |   | | Quality E: improve ≥ 6, degrade < -2, damage at margin < -5 (1) | | |
  |   | | Quality F: can't improve, degrade < -2, damage at margin < -6 (1) | | |
  | 2 | Plan comment: "A = 0.8x (good parts = cheaper)" | Correct to: "A = 1.5x (worst quality = expensive), F = 0.8x (best quality = cheap)" — plan comment was backwards | `PartQuality.ts` code is correct; plan description was inverted | The code is right, the plan text is wrong |
  | 3 | Maintenance processor (task 3.5 marked complete) | Note: "maintenance processor is NOT implemented — task marked complete but processor doesn't exist" | Searched codebase — not found | Add as audit note, do NOT uncheck the task |

  **Must NOT do**:
  - Change `[x]` checkmarks (even for task 3.5 — add note instead)
  - Add or remove tasks
  - Modify the actual code (PartQuality.ts is correct)

  **Parallelizable**: YES (with Tasks 4, 5, 6, 7, 8)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\unit\Maintenance.java:288-369` — Quality-dependent threshold tables
  - `.sisyphus/plans/repair-quality-cascade.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] Fixed thresholds replaced with quality-dependent table (6 quality levels)
  - [ ] Cost multiplier description corrected (A=expensive, F=cheap)
  - [ ] Maintenance processor non-implementation noted (task 3.5 checkmark preserved)
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 10: Correct `contract-types-expansion.md`

- [x] 10. Apply audit corrections to contract-types-expansion.md (minor corrections)

  **What to do**:
  - Add `## Audit Corrections` section after the ✅ banner
  - Apply all corrections from the manifest below
  - Add inline `<!-- AUDIT: ... -->` comments at each correction site

  **Correction Manifest**:

  | # | Old Value | New Value | MekHQ Source | Notes |
  |---|-----------|-----------|--------------|-------|
  | 1 | PIRATE_HUNTING combat role: PATROL | Correct to: FRONTLINE | `AtBContractType.java:270` | |
  | 2 | "10 event types" | "11 event types" — add SPORADIC_UPRISINGS | `AtBEventType.java:39` | Same correction as random-events |
  | 3 | "special" contract group | Tag as `[MekStation Enhancement]` — MekHQ doesn't formalize this grouping | MekHQ source — not found | |

  **Must NOT do**:
  - Change `[x]` checkmarks
  - Add or remove tasks

  **Parallelizable**: YES (after Task 7 for event count consistency)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBContractType.java:270` — PIRATE_HUNTING role
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\enums\AtBEventType.java:39` — SPORADIC_UPRISINGS
  - `.sisyphus/plans/contract-types-expansion.md` — The file to edit

  **Acceptance Criteria**:
  - [ ] `## Audit Corrections` section present
  - [ ] PIRATE_HUNTING role corrected to FRONTLINE
  - [ ] "10 events" → "11 events" with SPORADIC_UPRISINGS
  - [ ] "special" group tagged `[MekStation Enhancement]`
  - [ ] Every correction has inline `<!-- AUDIT: ... -->` comment
  - [ ] Pre-edit `[x]` count == Post-edit `[x]` count

  **Commit**: NO (batched with Task 12)

---

### Task 11: Cross-Plan Verification

- [x] 11. Verify all corrections across all 21 plan files

  **What to do**:
  - Grep ALL 21 plan files for every old incorrect value
  - Verify the 11 DO-NOT-TOUCH plans have zero modifications
  - Verify `[x]` counts in all 10 corrected plans

  **Verification Manifest**:

  | Old Value to Grep | Should Appear | Context |
  |-------------------|---------------|---------|
  | "40+ skill" | 0 times (unless in Audit Corrections summary or commit messages) | Was in skills-expansion, possibly others |
  | "4 experience tiers" or "4 tiers" (in tier context) | 0 times (unless in Audit Corrections summary) | Was in skills-expansion |
  | "19 modifiers" (in turnover context) | 0 times (unless in Audit Corrections summary) | Was in turnover-retention |
  | "51 prisoner" | 0 times (unless in Audit Corrections summary) | Was in random-events |
  | "weekly on Mondays" (in prisoner context) | 0 times (unless in Audit Corrections summary) | Was in random-events |
  | "75-125%" or "85-125%" (in BV context) | 0 times (unless in Audit Corrections summary) | Was in scenario-combat |
  | "5 accolade" | 0 times (unless in Audit Corrections summary) | Was in faction-standing |
  | "5 censure" | 0 times (unless in Audit Corrections summary) | Was in faction-standing |
  | "10 event types" (in contract context) | 0 times (unless in Audit Corrections summary) | Was in random-events, contract-types |
  | "Medicine skill" (should be Surgery) | 0 times (unless in Audit Corrections summary) | Was in medical-system |

  **Must NOT do**:
  - Make any edits during this task — verification only
  - If issues found, report them; do NOT fix without explicit instruction

  **Parallelizable**: NO (depends on Tasks 1-10)

  **Acceptance Criteria**:
  - [ ] All old incorrect values show 0 hits (or only in Audit Corrections summaries / commit message text)
  - [ ] `git diff --stat` shows exactly 10 files changed
  - [ ] All 10 files are in `.sisyphus/plans/`
  - [ ] 11 DO-NOT-TOUCH files show no modifications
  - [ ] `[x]` counts verified for all 10 corrected files

  **Commit**: NO (this is verification)

---

### Task 12: Commit All Corrections

- [x] 12. Create single commit with all corrections

  **What to do**:
  - Stage all 10 corrected plan files
  - Commit with message: `docs(plans): apply MekHQ source audit corrections to 10 implementation plans`
  - Verify commit success

  **Must NOT do**:
  - Include any files outside `.sisyphus/plans/`
  - Create multiple commits
  - Push to remote (unless explicitly asked)

  **Parallelizable**: NO (depends on Task 11)

  **Acceptance Criteria**:
  - [ ] `git add .sisyphus/plans/` stages exactly 10 files
  - [ ] Commit succeeds
  - [ ] `git log -1 --oneline` shows expected message
  - [ ] `git diff --stat HEAD~1` shows exactly 10 files

  **Commit**: YES
  - Message: `docs(plans): apply MekHQ source audit corrections to 10 implementation plans`
  - Files: `.sisyphus/plans/skills-expansion.md`, `.sisyphus/plans/personnel-progression.md`, `.sisyphus/plans/medical-system.md`, `.sisyphus/plans/turnover-retention-system.md`, `.sisyphus/plans/acquisition-supply-chain.md`, `.sisyphus/plans/faction-standing-system.md`, `.sisyphus/plans/random-events.md`, `.sisyphus/plans/scenario-combat-expansion.md`, `.sisyphus/plans/repair-quality-cascade.md`, `.sisyphus/plans/contract-types-expansion.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 12 | `docs(plans): apply MekHQ source audit corrections to 10 implementation plans` | 10 plan files in `.sisyphus/plans/` | `git diff --stat HEAD~1` shows 10 files |

---

## Success Criteria

### Verification Commands
```bash
# Exactly 10 files changed
git diff --stat HEAD~1  # Expected: 10 files changed

# No files outside plans directory
git diff --name-only HEAD~1 | grep -v "^.sisyphus/plans/"  # Expected: no output

# All Audit Corrections sections present
grep -l "## Audit Corrections" .sisyphus/plans/*.md  # Expected: 10 files

# Old values gone (spot check)
grep -r "40+ skill" .sisyphus/plans/ --include="*.md" | grep -v "Audit Corrections" | grep -v "Corrected from"  # Expected: only in commit message text
```

### Final Checklist
- [ ] All 10 plans corrected per manifests
- [ ] All 10 plans have `## Audit Corrections` sections
- [ ] All correction sites have inline HTML comments
- [ ] `[x]` counts preserved in all files
- [ ] No structural changes to any plan
- [ ] 11 DO-NOT-TOUCH plans unmodified
- [ ] Cross-plan grep shows no stale incorrect values
- [ ] Single commit on `chore/plan-updates-audit` branch
