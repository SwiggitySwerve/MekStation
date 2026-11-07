/**
 * Campaign pilot status entry point.
 *
 * The legacy multi-mission campaign entity (CampaignStatus,
 * CampaignMissionStatus, ICampaign, ICampaignMission and their helpers) was
 * removed (owner ruling 2026-11-07, D1). The live campaign model is
 * `Campaign.ts`; only the pilot status enum is still imported from here.
 */

export { CampaignPilotStatus } from './CampaignPilotStatus';
