import { IAward } from './AwardInterfaces';
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

export { COMBAT_AWARDS } from './categories/CombatAwards';
export { SURVIVAL_AWARDS } from './categories/SurvivalAwards';
export { CAMPAIGN_AWARDS } from './categories/CampaignAwards';
export { SERVICE_AWARDS } from './categories/ServiceAwards';
export { SPECIAL_AWARDS } from './categories/SpecialAwards';
export { AUTO_KILL_AWARDS } from './categories/AutoKillAwards';
export { AUTO_SCENARIO_AWARDS } from './categories/AutoScenarioAwards';
export { AUTO_TIME_AWARDS } from './categories/AutoTimeAwards';
export { AUTO_INJURY_AWARDS } from './categories/AutoInjuryAwards';
export { AUTO_RANK_AWARDS } from './categories/AutoRankAwards';
export { AUTO_SKILL_AWARDS } from './categories/AutoSkillAwards';

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

export {
  getAwardById,
  getAwardsByCategory,
  getAwardsByRarity,
  getVisibleAwards,
  getSortedAwards,
  getAutoGrantableAwards,
} from './awardUtils';
