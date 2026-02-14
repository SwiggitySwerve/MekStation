import type { IAward } from './AwardInterfaces';

import { AUTO_INJURY_AWARDS } from './categories/AutoInjuryAwards';
import { AUTO_KILL_AWARDS } from './categories/AutoKillAwards';
import { AUTO_RANK_AWARDS } from './categories/AutoRankAwards';
import { AUTO_SCENARIO_AWARDS } from './categories/AutoScenarioAwards';
import { AUTO_SKILL_AWARDS } from './categories/AutoSkillAwards';
import { AUTO_TIME_AWARDS } from './categories/AutoTimeAwards';
import { CAMPAIGN_AWARDS } from './categories/CampaignAwards';
import { COMBAT_AWARDS } from './categories/CombatAwards';
import { SERVICE_AWARDS } from './categories/ServiceAwards';
import { SPECIAL_AWARDS } from './categories/SpecialAwards';
import { SURVIVAL_AWARDS } from './categories/SurvivalAwards';

export const AWARD_CATALOG: readonly IAward[] = [
  ...COMBAT_AWARDS,
  ...SURVIVAL_AWARDS,
  ...CAMPAIGN_AWARDS,
  ...SERVICE_AWARDS,
  ...SPECIAL_AWARDS,
  ...AUTO_KILL_AWARDS,
  ...AUTO_SCENARIO_AWARDS,
  ...AUTO_TIME_AWARDS,
  ...AUTO_INJURY_AWARDS,
  ...AUTO_RANK_AWARDS,
  ...AUTO_SKILL_AWARDS,
];
