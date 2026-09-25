/**
 * Valid baseline-v1 payload fixtures — one per `CampaignEventType` variant,
 * with populated nested roster / pilot / contract / whole-snapshot shapes so
 * the mutation matrix in the pack suite exercises real nesting.
 */

import type { CampaignEventType } from '@/types/campaign/CampaignSync';

// A roster unit as production writes it: the campaign creation page pins
// `sourceVersion` (the enrolled library version) on every unit it adds.
const rosterUnit = {
  unitId: 'unit-atlas-1',
  designation: 'Atlas AS7-D',
  status: 'operational',
  unitRef: 'atlas-as7-d',
  unitSource: 'canonical',
  sourceVersion: 3,
} as const;

// A legacy roster unit, projected before `sourceVersion` existed.
const legacyRosterUnit = {
  unitId: 'unit-legacy-1',
  designation: 'Locust LCT-1V',
  status: 'damaged',
  unitRef: 'locust-lct-1v',
  unitSource: 'canonical',
} as const;

/**
 * `sourceVersion` values the pack refuses on every payload that nests a
 * roster unit: a non-number, zero, a negative, a fraction, and null.
 */
export const INVALID_ROSTER_UNIT_SOURCE_VERSIONS: readonly unknown[] =
  Object.freeze(['3', 0, -1, 1.5, null]);

const pilot = { pilotId: 'pilot-1', name: 'Natasha Kerensky' } as const;

const contract = {
  contractId: 'contract-1',
  name: 'Garrison Duty',
  employerFactionId: 'kurita',
} as const;

export const VALID_CAMPAIGN_EVENT_PAYLOADS: Readonly<
  Record<CampaignEventType, unknown>
> = Object.freeze({
  CampaignDayAdvanced: { newDay: 12 },
  FundsChanged: { delta: -25_000, reason: 'repair', balance: 4_975_000 },
  PilotHired: { pilot, cost: 150_000 },
  ContractAccepted: { contract },
  RosterUnitChanged: { change: 'repaired', unit: rosterUnit },
  SalvageAllocated: {
    value: 80_000,
    poolRemaining: 20_000,
    recoveredUnit: rosterUnit,
  },
  ParticipantRemoved: {
    participantId: 'player-unavailable',
    reason: 'unavailable',
  },
  CampaignSnapshotPublished: {
    state: {
      campaignId: 'campaign-snapshot',
      day: 12,
      balance: 4_975_000,
      rosterUnits: {
        [rosterUnit.unitId]: rosterUnit,
        [legacyRosterUnit.unitId]: legacyRosterUnit,
      },
      forceUnits: { 'force-1': [rosterUnit.unitId] },
      pilots: { [pilot.pilotId]: pilot },
      contracts: { [contract.contractId]: contract },
      factionStanding: { kurita: 2 },
      salvagePool: 20_000,
    },
    matchId: 'match-1',
    revision: 41,
  },
});
