export { OptionGroupId } from './options/campaignOptionMeta';
export type { ICampaignOptionMeta } from './options/campaignOptionMeta';

import type { ICampaignOptionMeta } from './options/campaignOptionMeta';

import { COMBAT_FORCE_OPTIONS } from './options/combatForceOptions';
import { FINANCIAL_OPTIONS } from './options/financialOptions';
import { GENERAL_EVENT_OPTIONS } from './options/generalEventOptions';
import { PERSONNEL_OPTIONS } from './options/personnelOptions';
import { TURNOVER_MARKET_OPTIONS } from './options/turnoverMarketOptions';
import { XP_PROGRESSION_OPTIONS } from './options/xpProgressionOptions';

export const OPTION_META: Record<string, ICampaignOptionMeta> = {
  ...PERSONNEL_OPTIONS,
  ...XP_PROGRESSION_OPTIONS,
  ...FINANCIAL_OPTIONS,
  ...COMBAT_FORCE_OPTIONS,
  ...GENERAL_EVENT_OPTIONS,
  ...TURNOVER_MARKET_OPTIONS,
};
