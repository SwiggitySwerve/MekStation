# Change: Add Campaign Options & Presets System

## Why

MekStation's ICampaignOptions has grown to 80+ fields across 10+ categories. New players face a wall of options during campaign creation. A preset system (Casual/Standard/Full/Custom) bundles sensible defaults so newcomers can start quickly while veterans can fine-tune everything.

## What Changes

- Add `CampaignType` enum (Mercenary, House Command, Clan, Pirate, ComStar) with display metadata
- Add `CampaignPreset` enum (Casual, Standard, Full, Custom) with preset definitions
- Add `ICampaignOptionMeta` metadata for every ICampaignOptions field (group, label, type, range)
- Add `OptionGroupId` enum for UI organization (13 groups)
- Add `applyPreset()` service to apply preset + campaign type defaults
- Add export/import preset as JSON for community sharing
- Add `validateCampaignOptions()` for range and dependency validation
- Add `campaignType` and `activePreset` fields to ICampaign
- Add campaign creation wizard UI with 4-step flow

## Impact

- Affected specs: `campaign-management` (MODIFIED), `campaign-ui` (MODIFIED), `campaign-presets` (NEW)
- Affected code: `src/types/campaign/Campaign.ts`, new type/lib/component files
- **BREAKING**: `campaignType` is a new required field on ICampaign (existing campaigns default to MERCENARY)
