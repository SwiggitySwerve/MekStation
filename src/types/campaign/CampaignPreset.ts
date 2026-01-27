import type { ICampaignOptions } from './Campaign';

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

export const PRESET_CASUAL: IPresetDefinition = {
  id: CampaignPreset.CASUAL,
  name: 'Casual',
  description: 'Relaxed gameplay with fewer systems. Focus on combat and story without financial or turnover pressure.',
  icon: '☕',
  overrides: {
    useTurnover: false,
    useTaxes: false,
    trackFactionStanding: false,
    useRandomEvents: false,
    healingRateMultiplier: 2.0,
    maintenanceCycleDays: 0,
    payForMaintenance: false,
  },
};

export const PRESET_STANDARD: IPresetDefinition = {
  id: CampaignPreset.STANDARD,
  name: 'Standard',
  description: 'Balanced gameplay with core systems enabled. Good starting point for most campaigns.',
  icon: '⚔️',
  overrides: {
    useTurnover: true,
    useRoleBasedSalaries: true,
    trackFactionStanding: true,
    useRandomEvents: true,
    useTaxes: false,
    useLoanSystem: true,
    turnoverCheckFrequency: 'monthly',
  },
};

export const PRESET_FULL: IPresetDefinition = {
  id: CampaignPreset.FULL,
  name: 'Full',
  description: 'All systems enabled for maximum realism. Taxes, acquisition, food & housing, and full turnover.',
  icon: '🏰',
  overrides: {
    useTurnover: true,
    useRoleBasedSalaries: true,
    useTaxes: true,
    trackFactionStanding: true,
    useRandomEvents: true,
    useLoanSystem: true,
    turnoverCheckFrequency: 'monthly',
    useAcquisitionSystem: true,
    useFoodAndHousing: true,
  },
};

export const PRESET_CUSTOM: IPresetDefinition = {
  id: CampaignPreset.CUSTOM,
  name: 'Custom',
  description: 'Start from defaults and configure every option manually.',
  icon: '🔧',
  overrides: {},
};

export const ALL_PRESETS: readonly IPresetDefinition[] = [
  PRESET_CASUAL,
  PRESET_STANDARD,
  PRESET_FULL,
  PRESET_CUSTOM,
] as const;
