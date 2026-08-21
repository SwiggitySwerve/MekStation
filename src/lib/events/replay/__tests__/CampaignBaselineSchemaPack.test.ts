/**
 * Campaign baseline schema pack contract (replay-safety PR 3).
 *
 * Pins: the pack's discriminants exactly equal the canonical campaign event
 * union (per the frozen schema-pack-inventory row for task/PR 3); every
 * variant has a valid fixture that parses at baseline v1 and a
 * missing/extra/ill-typed mutation matrix — including nested roster, pilot,
 * contract, salvage, and whole-snapshot payloads — that fails validation
 * rather than establishing support; unknown discriminants fail closed.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { VALID_CAMPAIGN_EVENT_PAYLOADS } from '../__fixtures__/CampaignBaselineSchemaPack.fixture';
import {
  CAMPAIGN_BASELINE_EVENT_TYPES,
  CAMPAIGN_BASELINE_SCHEMA_PACK,
} from '../CampaignBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-3 inventory row (schema-pack-inventory.md). */
const INVENTORY_CAMPAIGN_DISCRIMINANTS = [
  'CampaignDayAdvanced',
  'FundsChanged',
  'PilotHired',
  'ContractAccepted',
  'RosterUnitChanged',
  'SalvageAllocated',
  'CampaignSnapshotPublished',
] as const;

type MutablePayload = Record<string, unknown>;

const clone = (value: unknown): MutablePayload =>
  JSON.parse(JSON.stringify(value)) as MutablePayload;

/**
 * Per-variant mutation matrix: one missing required field, one extra field,
 * one ill-typed field — several targeting nested shapes on purpose.
 */
const MUTATIONS: Readonly<
  Record<string, readonly ((payload: MutablePayload) => void)[]>
> = {
  CampaignDayAdvanced: [
    (p) => delete p['newDay'],
    (p) => (p['unexpected'] = true),
    (p) => (p['newDay'] = 'twelve'),
  ],
  FundsChanged: [
    (p) => delete p['balance'],
    (p) => (p['unexpected'] = true),
    (p) => (p['delta'] = Number.NaN),
  ],
  PilotHired: [
    (p) => delete (p['pilot'] as MutablePayload)['name'],
    (p) => ((p['pilot'] as MutablePayload)['callsign'] = 'Black Widow'),
    (p) => (p['cost'] = '150000'),
  ],
  ContractAccepted: [
    (p) => delete (p['contract'] as MutablePayload)['employerFactionId'],
    (p) => ((p['contract'] as MutablePayload)['payout'] = 1),
    (p) => (p['contract'] = 'contract-1'),
  ],
  RosterUnitChanged: [
    (p) => delete (p['unit'] as MutablePayload)['designation'],
    (p) => (p['unexpected'] = true),
    (p) => ((p['unit'] as MutablePayload)['status'] = 'scrapped'),
  ],
  SalvageAllocated: [
    (p) => delete p['poolRemaining'],
    (p) => ((p['recoveredUnit'] as MutablePayload)['tonnage'] = 100),
    (p) => (p['recoveredUnit'] = 42),
  ],
  CampaignSnapshotPublished: [
    (p) => delete (p['state'] as MutablePayload)['salvagePool'],
    (p) => ((p['state'] as MutablePayload)['weather'] = 'clear'),
    (p) => {
      const units = (p['state'] as MutablePayload)[
        'rosterUnits'
      ] as MutablePayload;
      (units['unit-atlas-1'] as MutablePayload)['status'] = 7;
    },
  ],
};

describe('campaign baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: CAMPAIGN_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the canonical campaign union', () => {
    const packTypes = [...CAMPAIGN_BASELINE_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_CAMPAIGN_DISCRIMINANTS].sort());
    expect(
      [...CAMPAIGN_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(CAMPAIGN_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_CAMPAIGN_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_CAMPAIGN_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_CAMPAIGN_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_CAMPAIGN_EVENT_PAYLOADS[eventType]);
        mutate(payload);
        let code: string | null = null;
        try {
          registry.upcast(eventType, 1, payload);
        } catch (error) {
          if (error instanceof UnsupportedReplayHistoryError) code = error.code;
          else throw error;
        }
        expect(code).toBe('invalid-payload');
      }
    },
  );

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('CampaignRenamed', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'FundsChanged',
        2,
        VALID_CAMPAIGN_EVENT_PAYLOADS['FundsChanged'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('fingerprints the campaign pipeline deterministically', () => {
    const versions = INVENTORY_CAMPAIGN_DISCRIMINANTS.map((eventType) => ({
      eventType,
      schemaVersion: 1,
    }));
    const fingerprint = registry.fingerprintPipeline(versions);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(registry.fingerprintPipeline([...versions].reverse())).toBe(
      fingerprint,
    );
  });
});
