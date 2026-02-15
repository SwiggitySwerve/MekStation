/**
 * Campaign Option Metadata Types
 * Shared types and defaults for campaign option definitions.
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';

export enum OptionGroupId {
  General = 'general',
  Personnel = 'personnel',
  XpProgression = 'xp_progression',
  Turnover = 'turnover',
  Financial = 'financial',
  RepairMaintenance = 'repair_maintenance',
  Combat = 'combat',
  ForceOrganization = 'force',
  Medical = 'medical',
  FactionStanding = 'faction',
  Markets = 'markets',
  Events = 'events',
  Advanced = 'advanced',
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
  readonly requiresSystem?: string;
}

/** Cached default campaign options for option metadata definitions */
export const defaults = createDefaultCampaignOptions();
