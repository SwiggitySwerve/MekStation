/**
 * Shared Campaign State — sync module barrel (CO1).
 *
 * The campaign-tier server-authoritative sync surface: a typed campaign
 * event log, the shared event reducer, and the in-memory event store.
 * The `CampaignMatchHost` and `CampaignSyncSession` live under
 * `src/lib/multiplayer/server/` alongside their combat-tier analogues.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

export { applyCampaignEvent, replayCampaignEvents } from './applyCampaignEvent';
export { CampaignEventLog, getCampaignEvents } from './campaignEventLog';
export {
  CampaignEventSequenceCollisionError,
  type ICampaignEventStore,
} from './ICampaignEventStore';
export { InMemoryCampaignEventStore } from './InMemoryCampaignEventStore';
