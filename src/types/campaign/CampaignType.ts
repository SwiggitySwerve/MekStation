/**
 * Campaign Type - Classification of campaign play styles
 *
 * Defines the different campaign types available in MekStation,
 * each with unique mechanics, financial models, and progression systems.
 *
 * @module campaign/CampaignType
 */

// =============================================================================
// Campaign Type Enum
// =============================================================================

export enum CampaignType {
  MERCENARY = 'mercenary',
  HOUSE_COMMAND = 'house_command',
  CLAN = 'clan',
  PIRATE = 'pirate',
  COMSTAR = 'comstar',
}

// =============================================================================
// Display Names & Descriptions
// =============================================================================

export const CAMPAIGN_TYPE_DISPLAY: Record<CampaignType, string> = {
  [CampaignType.MERCENARY]: 'Mercenary Company',
  [CampaignType.HOUSE_COMMAND]: 'House Command',
  [CampaignType.CLAN]: 'Clan Touman',
  [CampaignType.PIRATE]: 'Pirate Band',
  [CampaignType.COMSTAR]: 'ComStar / Word of Blake',
};

export const CAMPAIGN_TYPE_DESCRIPTIONS: Record<CampaignType, string> = {
  [CampaignType.MERCENARY]:
    'Manage a mercenary company. Full financial pressure, contract negotiation, and reputation mechanics.',
  [CampaignType.HOUSE_COMMAND]:
    'Command a Great House military unit. Regular salary, fixed contracts, equipment supplied.',
  [CampaignType.CLAN]:
    'Lead a Clan touman. Trial-based advancement, strict honor codes, Clan equipment.',
  [CampaignType.PIRATE]:
    'Run a pirate band. High risk, salvage-focused economy, outlaw mechanics.',
  [CampaignType.COMSTAR]:
    'Operate as ComStar or WoB. HPG access, unique equipment, information warfare.',
};

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Type guard to check if a value is a valid CampaignType.
 *
 * @param value - The value to check
 * @returns true if the value is a valid CampaignType
 */
export function isCampaignType(value: unknown): value is CampaignType {
  return (
    typeof value === 'string' &&
    Object.values(CampaignType).includes(value as CampaignType)
  );
}
