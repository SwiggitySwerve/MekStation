/**
 * Durable entity-link derivation for campaign journal events
 * (design-campaign-authority-and-sync task 5.3 — absorbed adopt PR 3,
 * journal lineage only).
 *
 * Every appended campaign event carries the entity refs its payload
 * names, so the journal's `readEntityHistory` resolves the same durable
 * identity chain the projections use: campaign instance, campaign-unit
 * instance, its canonical or saved-design source (split by `unitSource`),
 * pilot, contract, and the co-op session (match). UI-journey resolution of
 * saved custom units stays receipt-proven by CAMP-01G — this module owns
 * only the journal-level links.
 *
 * Vocabulary note: mission and encounter identities have no carrying event
 * among the seven `CampaignEventType` variants today; their entity types
 * are reserved here and MUST be stamped by whichever future event type
 * first carries them (recorded in the task receipt — no events are
 * invented for them now).
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 */

import type { IEntityEventRef } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignEvent,
  ICampaignRosterUnit,
} from '@/types/campaign/CampaignSync';

export const CAMPAIGN_ENTITY_TYPES = Object.freeze({
  campaign: 'campaign',
  campaignUnit: 'campaign-unit',
  canonicalUnit: 'canonical-unit',
  savedDesign: 'saved-design',
  pilot: 'pilot',
  contract: 'contract',
  match: 'match',
  /** Reserved: no carrying campaign event type exists yet. */
  mission: 'mission',
  /** Reserved: no carrying campaign event type exists yet. */
  encounter: 'encounter',
} as const);

function unitRefs(unit: ICampaignRosterUnit, role: string): IEntityEventRef[] {
  const refs: IEntityEventRef[] = [
    {
      entityType: CAMPAIGN_ENTITY_TYPES.campaignUnit,
      entityId: unit.unitId,
      role,
    },
  ];
  if (unit.unitRef) {
    refs.push({
      entityType:
        unit.unitSource === 'custom'
          ? CAMPAIGN_ENTITY_TYPES.savedDesign
          : CAMPAIGN_ENTITY_TYPES.canonicalUnit,
      entityId: unit.unitRef,
      role: 'source',
    });
  }
  return refs;
}

/**
 * Derive the complete entity-ref set for one campaign event. The campaign
 * itself is always the subject; payload-named identities are appended per
 * type. Whole-state snapshots deliberately stay coarse (campaign +
 * session): per-member refs for an entire imported roster would bloat the
 * ref table without adding a lineage the member-level events do not
 * already carry.
 */
export function campaignEventEntityRefs(
  campaignId: string,
  event: ICampaignEvent,
): readonly IEntityEventRef[] {
  const refs: IEntityEventRef[] = [
    {
      entityType: CAMPAIGN_ENTITY_TYPES.campaign,
      entityId: campaignId,
      role: 'subject',
    },
  ];
  switch (event.type) {
    case 'PilotHired':
      refs.push({
        entityType: CAMPAIGN_ENTITY_TYPES.pilot,
        entityId: event.payload.pilot.pilotId,
        role: 'hired',
      });
      break;
    case 'ContractAccepted':
      refs.push({
        entityType: CAMPAIGN_ENTITY_TYPES.contract,
        entityId: event.payload.contract.contractId,
        role: 'accepted',
      });
      break;
    case 'RosterUnitChanged':
      refs.push(...unitRefs(event.payload.unit, event.payload.change));
      break;
    case 'SalvageAllocated':
      if (event.payload.recoveredUnit) {
        refs.push(...unitRefs(event.payload.recoveredUnit, 'recovered'));
      }
      break;
    case 'CampaignSnapshotPublished':
      if (event.payload.matchId) {
        refs.push({
          entityType: CAMPAIGN_ENTITY_TYPES.match,
          entityId: event.payload.matchId,
          role: 'session',
        });
      }
      break;
    case 'CampaignDayAdvanced':
    case 'FundsChanged':
      break;
  }
  return refs;
}
