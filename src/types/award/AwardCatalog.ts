export { AWARD_CATALOG } from './AwardCatalogData';

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

export {
  getAwardById,
  getAwardsByCategory,
  getAwardsByRarity,
  getVisibleAwards,
  getSortedAwards,
  getAutoGrantableAwards,
} from './awardUtils';
