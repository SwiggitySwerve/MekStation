/**
 * Campaign Services Barrel Export
 *
 * Re-exports all campaign-related services for convenient importing.
 */

export {
  CampaignInstanceStateService,
  getCampaignInstanceStateService,
  _resetCampaignInstanceStateService,
  type ICampaignInstanceStateService,
  type IApplyDamageResult,
  type IApplyWoundsResult,
  type IMissionCompletionResult,
} from './CampaignInstanceStateService';
