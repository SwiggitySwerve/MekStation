# Campaign Options & Presets System

> **✅ COMPLETED** — Implemented, merged, and archived. PR #208.

## Context

### Original Request
Replace MekStation's flat 40-option configuration with a preset-based system. MekHQ has 700+ configurable settings across 15 GUI tabs — we won't reach that count, but we need structured option groups and preset templates (Casual/Standard/Full/Custom) so new players aren't overwhelmed while veterans can fine-tune everything.

### Interview Summary
**Key Discussions**:
- Presets are NOT difficulty levels — they're configuration bundles (which systems are active)
- Casual preset: minimal systems enabled (no turnover, no maintenance, no taxes)
- Standard preset: core systems (turnover, basic maintenance, salaries)
- Full preset: all systems (quality cascade, faction standing, loans, taxes, random events)
- Custom: player adjusts everything manually
- Existing 40 flat options remain — just organized into groups with preset defaults
- All Phase 2 plans add options to ICampaignOptions — this plan organizes them

**Research Findings**:
- `ICampaignOptions` currently has 40 fields in 5 loose categories
- `createDefaultCampaignOptions()` factory exists
- No campaign type enum, no preset system
- Plans 1-5 collectively add ~50 new options to ICampaignOptions
- Plans 6-17 will add ~30 more options

### Metis Review
**Identified Gaps** (addressed):
- Preset must not lock options — just set defaults, user can override any
- Campaign type (Mercenary/House/Clan) is separate from difficulty preset
- Option validation: min/max ranges for numeric options
- Import/export presets as JSON for community sharing
- Preset versioning for forward compatibility

---

## Work Objectives

### Core Objective
Organize campaign options into logical groups with preset templates that configure multiple options at once, making campaign creation accessible while preserving full customization.

### Concrete Deliverables
- `src/types/campaign/CampaignPreset.ts` — Preset types and definitions
- `src/types/campaign/CampaignType.ts` — Campaign type enum
- `src/lib/campaign/presetService.ts` — Preset application and management
- Updated `src/types/campaign/Campaign.ts` — Option groups, validation
- Campaign creation wizard UI with preset selection

### Definition of Done
- [x] 4 built-in presets (Casual, Standard, Full, Custom) with distinct option sets
- [x] Campaign type enum (Mercenary, House, Clan, Pirate, ComStar)
- [x] Option groups for organized settings UI
- [x] Preset applies defaults, user can override any option
- [x] Export/import presets as JSON
- [x] Campaign creation wizard uses presets

### Must Have
- `CampaignPreset` enum: CASUAL, STANDARD, FULL, CUSTOM
- `CampaignType` enum: MERCENARY, HOUSE_COMMAND, CLAN, PIRATE, COMSTAR
- `ICampaignOptionGroup` for UI organization
- `applyPreset()` function that sets multiple options at once
- Preset definitions as typed constant objects
- Option validation (ranges, type checks)

### Must NOT Have (Guardrails)
- Option locking (presets suggest, never enforce)
- Difficulty scaling (presets configure systems, not difficulty)
- Per-session option changes (options set at campaign creation, some mutable later)
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
6.1 (Campaign type enum) → 6.2 (Option groups) → 6.3 (Preset definitions) → 6.4 (Preset service) → 6.5 (Option validation) → 6.6 (UI wizard)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 6.1, 6.2 | Type enum and option groups are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 6.3 | 6.1, 6.2 | Presets reference type + groups |
| 6.4 | 6.3 | Service applies presets |
| 6.5 | 6.2 | Validation uses group definitions |
| 6.6 | 6.4, 6.5 | UI needs service + validation |

---

## TODOs

- [x] 6.1 Define Campaign Type Enum

  **What to do**:
  - Create `src/types/campaign/CampaignType.ts`:
    ```typescript
    export enum CampaignType {
      MERCENARY = 'mercenary',       // Independent mercenary company
      HOUSE_COMMAND = 'house_command', // House military unit
      CLAN = 'clan',                 // Clan touman
      PIRATE = 'pirate',             // Pirate band
      COMSTAR = 'comstar',           // ComStar/Word of Blake
    }

    export const CAMPAIGN_TYPE_DISPLAY: Record<CampaignType, string> = {
      [CampaignType.MERCENARY]: 'Mercenary Company',
      [CampaignType.HOUSE_COMMAND]: 'House Command',
      [CampaignType.CLAN]: 'Clan Touman',
      [CampaignType.PIRATE]: 'Pirate Band',
      [CampaignType.COMSTAR]: 'ComStar / Word of Blake',
    };

    export const CAMPAIGN_TYPE_DESCRIPTIONS: Record<CampaignType, string> = {
      [CampaignType.MERCENARY]: 'Manage a mercenary company. Full financial pressure, contract negotiation, and reputation mechanics.',
      [CampaignType.HOUSE_COMMAND]: 'Command a Great House military unit. Regular salary, fixed contracts, equipment supplied.',
      [CampaignType.CLAN]: 'Lead a Clan touman. Trial-based advancement, strict honor codes, Clan equipment.',
      [CampaignType.PIRATE]: 'Run a pirate band. High risk, salvage-focused economy, outlaw mechanics.',
      [CampaignType.COMSTAR]: 'Operate as ComStar or WoB. HPG access, unique equipment, information warfare.',
    };
    ```
  - Add `campaignType: CampaignType` to ICampaign (required field, not optional)
  - Campaign type affects which preset defaults are appropriate but doesn't lock options

  **Must NOT do**:
  - Lock options based on campaign type
  - Implement type-specific gameplay rules (those come from other plans)

  **Parallelizable**: YES (with 6.2)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — ICampaign interface to extend
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignOptions.java` — MekHQ campaign types

  **Acceptance Criteria**:
  - [x] RED: Test all 5 campaign types defined with display names
  - [x] RED: Test ICampaign requires campaignType field
  - [x] GREEN: Types compile, tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define campaign type enum`
  - Files: `src/types/campaign/CampaignType.ts`, `src/types/campaign/Campaign.ts`

---

- [x] 6.2 Define Option Groups for UI Organization

  **What to do**:
  - Create `src/types/campaign/CampaignOptionGroup.ts`:
    ```typescript
    export enum OptionGroupId {
      GENERAL = 'general',
      PERSONNEL = 'personnel',
      TURNOVER = 'turnover',
      FINANCIAL = 'financial',
      REPAIR_MAINTENANCE = 'repair_maintenance',
      COMBAT = 'combat',
      FORCE_ORGANIZATION = 'force',
      MEDICAL = 'medical',
      SKILLS_PROGRESSION = 'skills',
      FACTION_STANDING = 'faction',
      MARKETS = 'markets',
      EVENTS = 'events',
      ADVANCED = 'advanced',
    }

    export interface ICampaignOptionMeta {
      readonly key: keyof ICampaignOptions;
      readonly group: OptionGroupId;
      readonly label: string;
      readonly description: string;
      readonly type: 'boolean' | 'number' | 'string' | 'enum';
      readonly min?: number;
      readonly max?: number;
      readonly step?: number;
      readonly enumValues?: readonly string[];
      readonly defaultValue: unknown;
      readonly requiresSystem?: string; // e.g., 'turnover' — disabled if system off
    }

    export const OPTION_META: Record<string, ICampaignOptionMeta> = {
      // Populated with metadata for every ICampaignOptions field
    };
    ```
  - Define metadata for all existing 40 options
  - Group structure enables generating settings UI automatically

  **Must NOT do**:
  - Change ICampaignOptions shape (metadata is separate)
  - Add new options (other plans do that)

  **Parallelizable**: YES (with 6.1)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts:53-193` — Current ICampaignOptions (40 fields)
  - `E:\Projects\mekhq\MekHQ\src\mekhq\gui\dialog\CampaignOptionsDialog.java` — MekHQ settings tabs

  **Acceptance Criteria**:
  - [x] RED: Test every ICampaignOptions key has a matching OPTION_META entry
  - [x] RED: Test each meta entry has valid group, type, and default
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define option groups and metadata for settings UI`
  - Files: `src/types/campaign/CampaignOptionGroup.ts`

---

- [x] 6.3 Define Built-in Preset Configurations

  **What to do**:
  - Create `src/types/campaign/CampaignPreset.ts`:
    ```typescript
    export enum CampaignPreset {
      CASUAL = 'casual',
      STANDARD = 'standard',
      FULL = 'full',
      CUSTOM = 'custom',
    }

    export interface IPresetDefinition {
      readonly id: CampaignPreset;
      readonly name: string;
      readonly description: string;
      readonly icon: string;
      readonly overrides: Partial<ICampaignOptions>;
    }
    ```
  - Define 4 presets:
    ```typescript
    export const PRESET_CASUAL: IPresetDefinition = {
      id: CampaignPreset.CASUAL,
      name: 'Casual',
      description: 'Relaxed campaign with minimal bookkeeping. Focus on combat and story.',
      icon: '☕',
      overrides: {
        useTurnover: false,
        useQualityGrades: false,
        useRoleBasedSalaries: false,
        useTaxes: false,
        useLoanSystem: false,
        trackFactionStanding: false,
        useRandomEvents: false,
        maintenanceCycleDays: 0, // Disable maintenance
        turnoverCheckFrequency: 'never',
        healingRateMultiplier: 2.0, // Faster healing
      },
    };

    export const PRESET_STANDARD: IPresetDefinition = {
      id: CampaignPreset.STANDARD,
      name: 'Standard',
      description: 'Balanced campaign with core management systems. The recommended experience.',
      icon: '⚔️',
      overrides: {
        useTurnover: true,
        useQualityGrades: false, // Skip quality cascade
        useRoleBasedSalaries: true,
        useTaxes: false,
        useLoanSystem: true,
        trackFactionStanding: true,
        useRandomEvents: true,
        turnoverCheckFrequency: 'monthly',
      },
    };

    export const PRESET_FULL: IPresetDefinition = {
      id: CampaignPreset.FULL,
      name: 'Full Simulation',
      description: 'Complete MekHQ-style simulation. Every system active. For experienced players.',
      icon: '🎖️',
      overrides: {
        useTurnover: true,
        useQualityGrades: true,
        useRoleBasedSalaries: true,
        useTaxes: true,
        useLoanSystem: true,
        trackFactionStanding: true,
        useRandomEvents: true,
        turnoverCheckFrequency: 'monthly',
        useAdvancedMedical: true,
      },
    };

    export const PRESET_CUSTOM: IPresetDefinition = {
      id: CampaignPreset.CUSTOM,
      name: 'Custom',
      description: 'Configure every option manually. Start from default values.',
      icon: '🔧',
      overrides: {}, // No overrides — uses createDefaultCampaignOptions()
    };
    ```

  **Must NOT do**:
  - Lock options after preset selection
  - Create difficulty presets (Easy/Normal/Hard)

  **Parallelizable**: NO (depends on 6.1, 6.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignPreset.java` — MekHQ presets
  - Plans 1-5 option names — presets reference options added by other plans

  **Acceptance Criteria**:
  - [x] RED: Test 4 preset definitions exist with valid overrides
  - [x] RED: Test CASUAL preset disables turnover, taxes, quality
  - [x] RED: Test FULL preset enables all systems
  - [x] RED: Test CUSTOM preset has empty overrides
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): define 4 built-in campaign presets`
  - Files: `src/types/campaign/CampaignPreset.ts`

---

- [x] 6.4 Implement Preset Service

  **What to do**:
  - Create `src/lib/campaign/presetService.ts`:
    ```typescript
    export function applyPreset(
      preset: CampaignPreset,
      campaignType: CampaignType,
    ): ICampaignOptions {
      const defaults = createDefaultCampaignOptions();
      const presetDef = getPresetDefinition(preset);
      const typeDefaults = getCampaignTypeDefaults(campaignType);

      return {
        ...defaults,
        ...typeDefaults,   // Campaign type adjustments
        ...presetDef.overrides, // Preset overrides on top
      };
    }

    export function getCampaignTypeDefaults(type: CampaignType): Partial<ICampaignOptions> {
      // Campaign type adjustments:
      // CLAN: allowClanEquipment=true, useFactionRules=true
      // PIRATE: startingFunds=lower, salvageRights=better
      // HOUSE_COMMAND: salaryMultiplier=0 (paid by house)
      // COMSTAR: techLevel=higher, allowClanEquipment=false
    }

    export function getPresetDefinition(preset: CampaignPreset): IPresetDefinition;
    export function getAllPresets(): readonly IPresetDefinition[];

    export function exportPreset(options: ICampaignOptions): string; // JSON string
    export function importPreset(json: string): Partial<ICampaignOptions>;
    ```

  **Must NOT do**:
  - Persist presets to database (they're just option bundles)
  - Allow modifying built-in presets (only custom)

  **Parallelizable**: NO (depends on 6.3)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts` — createDefaultCampaignOptions()

  **Acceptance Criteria**:
  - [x] RED: Test applyPreset(CASUAL) returns options with useTurnover=false
  - [x] RED: Test applyPreset(FULL) returns options with all systems enabled
  - [x] RED: Test campaign type defaults apply correctly (CLAN enables Clan equipment)
  - [x] RED: Test export/import roundtrip preserves all options
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): implement preset application and export/import`
  - Files: `src/lib/campaign/presetService.ts`

---

- [x] 6.5 Add Option Validation

  **What to do**:
  - Create `src/lib/campaign/optionValidation.ts`:
    ```typescript
    export interface IValidationResult {
      readonly valid: boolean;
      readonly errors: readonly IValidationError[];
      readonly warnings: readonly IValidationWarning[];
    }

    export function validateCampaignOptions(options: ICampaignOptions): IValidationResult;
    ```
  - Validate:
    - Numeric ranges (salaryMultiplier >= 0, taxRate 0-100, etc.)
    - Logical consistency (useTaxes=true requires useRoleBasedSalaries=true)
    - Dependencies (turnoverCheckFrequency != 'never' when useTurnover=true)
  - Return warnings for suboptimal combinations, errors for invalid

  **Parallelizable**: NO (depends on 6.2)

  **References**:
  - `E:\Projects\MekStation\src\types\campaign\Campaign.ts:53-193` — All option fields

  **Acceptance Criteria**:
  - [x] RED: Test negative salary multiplier returns error
  - [x] RED: Test tax rate > 100 returns error
  - [x] RED: Test useTaxes without useRoleBasedSalaries returns warning
  - [x] GREEN: All tests pass
  - [x] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add option validation with error/warning system`
  - Files: `src/lib/campaign/optionValidation.ts`

---

- [x] 6.6 Create Campaign Creation Wizard UI

  **What to do**:
  - Create `src/components/campaign/CampaignWizard.tsx` — Multi-step wizard:
    1. **Step 1: Campaign Type** — Select Mercenary/House/Clan/Pirate/ComStar with description cards
    2. **Step 2: Preset** — Select Casual/Standard/Full/Custom with feature comparison table
    3. **Step 3: Customize** — Grouped option panels (collapsible by OptionGroupId)
    4. **Step 4: Summary** — Review all settings, name campaign, create
  - Create `src/components/campaign/OptionGroupPanel.tsx` — Renders all options in a group
  - Create `src/components/campaign/PresetCard.tsx` — Preset selection card with highlights
  - Integrate into campaign creation flow

  **Must NOT do**:
  - Full settings editor for existing campaigns (defer — this is creation only)
  - Option tooltips with MekHQ cross-references

  **Parallelizable**: NO (depends on 6.4, 6.5)

  **References**:
  - `E:\Projects\MekStation\src\pages\gameplay\campaigns\index.tsx` — Campaign list page
  - `E:\Projects\mekhq\MekHQ\src\mekhq\gui\dialog\CampaignOptionsDialog.java` — MekHQ settings dialog

  **Acceptance Criteria**:
  - [x] Wizard shows 4 steps with progress indicator
  - [x] Campaign type selection shows 5 types with descriptions
  - [x] Preset selection shows 4 presets with feature comparison
  - [x] Customize step groups options by category
  - [x] Validation errors shown inline
  - [x] Manual verification: dev server → new campaign → walk through wizard

  **Commit**: YES
  - Message: `feat(ui): create campaign creation wizard with preset selection`
  - Files: `src/components/campaign/CampaignWizard.tsx`, `src/components/campaign/OptionGroupPanel.tsx`, `src/components/campaign/PresetCard.tsx`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 6.1 | `feat(campaign): define campaign type enum` | `npm test` |
| 6.2 | `feat(campaign): define option groups and metadata` | `npm test` |
| 6.3 | `feat(campaign): define 4 built-in campaign presets` | `npm test` |
| 6.4 | `feat(campaign): implement preset service` | `npm test` |
| 6.5 | `feat(campaign): add option validation` | `npm test` |
| 6.6 | `feat(ui): create campaign creation wizard` | Manual verify |

---

## Success Criteria

```bash
npm test                    # All tests pass
npm run build              # Build succeeds
```

### Final Checklist
- [x] 5 campaign types defined
- [x] 4 presets with correct option overrides
- [x] Option groups cover all ICampaignOptions fields
- [x] Preset application works (defaults + type + preset layers)
- [x] Export/import presets as JSON
- [x] Validation catches invalid combinations
- [x] Campaign wizard UI functional

---

## Migration Notes

- `campaignType` is a new REQUIRED field on ICampaign — existing campaigns default to MERCENARY
- `activePreset` is a new optional field on ICampaign — existing campaigns default to CUSTOM
- No option values change — presets only affect new campaign creation
- Option metadata is separate from ICampaignOptions (no breaking changes)

---

*Plan generated by Prometheus. Execute with `/start-work`.*
