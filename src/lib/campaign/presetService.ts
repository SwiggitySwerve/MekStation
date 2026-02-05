import {
  createDefaultCampaignOptions,
  ICampaignOptions,
} from '../../types/campaign/Campaign';
import {
  CampaignPreset,
  PRESET_CASUAL,
  PRESET_STANDARD,
  PRESET_FULL,
  PRESET_CUSTOM,
  IPresetDefinition,
  ALL_PRESETS,
} from '../../types/campaign/CampaignPreset';
import { CampaignType } from '../../types/campaign/CampaignType';

export function getPresetDefinition(preset: CampaignPreset): IPresetDefinition {
  switch (preset) {
    case CampaignPreset.CASUAL:
      return PRESET_CASUAL;
    case CampaignPreset.STANDARD:
      return PRESET_STANDARD;
    case CampaignPreset.FULL:
      return PRESET_FULL;
    case CampaignPreset.CUSTOM:
      return PRESET_CUSTOM;
    default:
      return PRESET_CUSTOM;
  }
}

export function getAllPresets(): readonly IPresetDefinition[] {
  return ALL_PRESETS;
}

export function getCampaignTypeDefaults(
  type: CampaignType,
): Partial<ICampaignOptions> {
  switch (type) {
    case CampaignType.CLAN:
      return { allowClanEquipment: true, useFactionRules: true };
    case CampaignType.HOUSE_COMMAND:
      return { salaryMultiplier: 0, payForSalaries: false };
    case CampaignType.PIRATE:
      return { startingFunds: 500000, trackFactionStanding: false };
    case CampaignType.COMSTAR:
      return { techLevel: 2, allowClanEquipment: false };
    case CampaignType.MERCENARY:
    default:
      return {};
  }
}

export function applyPreset(
  preset: CampaignPreset,
  campaignType: CampaignType,
): ICampaignOptions {
  const defaults = createDefaultCampaignOptions();
  const typeDefaults = getCampaignTypeDefaults(campaignType);
  const presetDef = getPresetDefinition(preset);
  return { ...defaults, ...typeDefaults, ...presetDef.overrides };
}

export function exportPreset(options: ICampaignOptions): string {
  return JSON.stringify(options, null, 2);
}

export function importPreset(json: string): Partial<ICampaignOptions> {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid preset format: expected an object');
  }
  return parsed as Partial<ICampaignOptions>;
}
