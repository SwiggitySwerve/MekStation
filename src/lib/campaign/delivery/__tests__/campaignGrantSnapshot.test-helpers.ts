/**
 * Ledger scripts and leak-scan helpers for scoped-snapshot tests.
 * Not a test file; loaded by the suites beside it.
 */

import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { EVENT_TS } from './grantProjectionHarness';

export const SNAPSHOT_VISIBLE_FUNDS_ONE = 'VISIBLE-FUNDS-1';
export const SNAPSHOT_VISIBLE_FUNDS_TWO = 'VISIBLE-FUNDS-2';
export const SNAPSHOT_PILOT_ALICE = 'pilot-alice';
export const SNAPSHOT_PILOT_BOB = 'pilot-bob';
export const SNAPSHOT_WITHHELD_GM = 'WITHHELD-GM-SECRET';
export const SNAPSHOT_WITHHELD_GM_B = 'WITHHELD-GM-BURST';
export const SNAPSHOT_WITHHELD_PILOT = 'WITHHELD-GM-PILOT';

export const SNAPSHOT_JOURNAL_LEAK_KEYS: readonly string[] = [
  'streamRevision',
  'commitPosition',
  'eventDigest',
  'previousStreamEventDigest',
  'commit_position',
  'event_digest',
  'stream_revision',
  'projectedEventIdentity',
  'sequence',
  'revision',
];

const AUTHOR = 'pid-host';

/** Envelope shared by every scripted ledger event. */
function envelope(
  campaignId: string,
  sequence: number,
  scope: CampaignEventScope,
): Pick<
  ICampaignEvent,
  'sequence' | 'campaignId' | 'ts' | 'authorPlayerId' | 'scope'
> {
  return {
    sequence,
    campaignId,
    ts: EVENT_TS,
    authorPlayerId: AUTHOR,
    scope,
  };
}

/** In-scope plus withheld GM events. extraGmCount only changes withheld volume. */
export function buildInterleavedLedger(
  campaignId: string,
  extraGmCount: number,
): readonly ICampaignEvent[] {
  const events: ICampaignEvent[] = [];
  let sequence = 0;
  const next = (): number => {
    const current = sequence;
    sequence += 1;
    return current;
  };

  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'CampaignDayAdvanced',
    payload: { newDay: 1 },
  });
  events.push({
    ...envelope(campaignId, next(), 'gm'),
    type: 'FundsChanged',
    payload: { delta: 0, reason: SNAPSHOT_WITHHELD_GM, balance: 9999 },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'FundsChanged',
    payload: {
      delta: 100,
      reason: SNAPSHOT_VISIBLE_FUNDS_ONE,
      balance: 100,
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'PilotHired',
    payload: {
      pilot: { pilotId: SNAPSHOT_PILOT_ALICE, name: 'Alice' },
      cost: 0,
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'gm'),
    type: 'PilotHired',
    payload: {
      pilot: { pilotId: SNAPSHOT_WITHHELD_PILOT, name: SNAPSHOT_WITHHELD_GM },
      cost: 0,
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'ContractAccepted',
    payload: {
      contract: {
        contractId: 'contract-visible',
        name: 'Visible Contract',
        employerFactionId: 'house-davion',
      },
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'RosterUnitChanged',
    payload: {
      change: 'added',
      unit: {
        unitId: 'unit-visible',
        designation: 'Griffin GRF-1N',
        status: 'operational',
      },
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'SalvageAllocated',
    payload: {
      value: 10,
      poolRemaining: 50,
      recoveredUnit: {
        unitId: 'unit-recovered',
        designation: 'Locust LCT-1V',
        status: 'damaged',
      },
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'gm'),
    type: 'SalvageAllocated',
    payload: {
      value: 50,
      poolRemaining: 0,
      recoveredUnit: {
        unitId: 'unit-gm-secret',
        designation: SNAPSHOT_WITHHELD_GM,
        status: 'operational',
      },
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'FundsChanged',
    payload: {
      delta: -20,
      reason: SNAPSHOT_VISIBLE_FUNDS_TWO,
      balance: 80,
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'CampaignDayAdvanced',
    payload: { newDay: 2 },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'PilotHired',
    payload: {
      pilot: { pilotId: SNAPSHOT_PILOT_BOB, name: 'Bob' },
      cost: 0,
    },
  });
  events.push({
    ...envelope(campaignId, next(), 'campaign'),
    type: 'RosterUnitChanged',
    payload: {
      change: 'repaired',
      unit: {
        unitId: 'unit-visible',
        designation: 'Griffin GRF-1N',
        status: 'operational',
      },
    },
  });

  for (let extra = 0; extra < extraGmCount; extra += 1) {
    events.push({
      ...envelope(campaignId, next(), 'gm'),
      type: 'FundsChanged',
      payload: {
        delta: 0,
        reason: `${SNAPSHOT_WITHHELD_GM_B}-${extra}`,
        balance: extra,
      },
    });
  }
  return events;
}

/** Counts campaign-scope events so tests can pin the 8+ in-scope floor. */
export function countInScope(
  events: readonly ICampaignEvent[],
  scope: CampaignEventScope,
): number {
  return events.filter(function (event) {
    return event.scope === scope;
  }).length;
}

/** Collects own enumerable keys from a JSON tree. */
export function collectJsonKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectJsonKeys(entry, into);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const key of Object.keys(value)) {
    into.add(key);
    collectJsonKeys(Reflect.get(value, key), into);
  }
}

/** Names withheld markers or journal fields found in a serialized snapshot. */
export function snapshotLeakScan(
  serialized: string,
  parsed: unknown,
): readonly string[] {
  const leaks: string[] = [];
  if (
    serialized.includes(SNAPSHOT_WITHHELD_GM) ||
    serialized.includes(SNAPSHOT_WITHHELD_GM_B) ||
    serialized.includes(SNAPSHOT_WITHHELD_PILOT)
  ) {
    leaks.push('withheld-payload-marker');
  }
  const keys = new Set<string>();
  collectJsonKeys(parsed, keys);
  for (const key of SNAPSHOT_JOURNAL_LEAK_KEYS) {
    if (keys.has(key)) leaks.push(key);
  }
  return leaks;
}

/** Replaces campaign and grant ids so withheld-count pairs can compare. */
export function normalizeSnapshotIds(
  serialized: string,
  campaignId: string,
  grantId: string,
  deliveryEpochId: string,
): string {
  return serialized
    .split(grantId)
    .join('GRANT')
    .split(campaignId)
    .join('CAMPAIGN')
    .split(deliveryEpochId)
    .join('EPOCH');
}
