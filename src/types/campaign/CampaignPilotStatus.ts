/**
 * Pilot operational status in campaign.
 *
 * Kept in a leaf module so roster-entry types can reference pilot status
 * without importing the aggregate campaign interface module.
 */
export enum CampaignPilotStatus {
  /** Ready for duty */
  Active = 'active',
  /** Wounded, penalties apply */
  Wounded = 'wounded',
  /** Critically wounded, unavailable */
  Critical = 'critical',
  /** Missing in action */
  MIA = 'mia',
  /** Killed in action */
  KIA = 'kia',
}
