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
 * U35j pins: the roster unit each production producer writes (the genesis
 * snapshot, the co-op host's baseline snapshot, the combat outcome's
 * RosterUnitChanged), carrying `sourceVersion`, parses; an unknown extra
 * field and an ill-typed or out-of-range `sourceVersion` are still refused;
 * and the pipeline fingerprint changes for, and only for, histories that
 * hold a payload nesting the roster unit.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ZodError } from 'zod';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  CampaignEventType,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildCampaignAuthoritativeState } from '@/lib/campaign/coop/campaignAuthoritativeState';
import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  INVALID_ROSTER_UNIT_SOURCE_VERSIONS,
  VALID_CAMPAIGN_EVENT_PAYLOADS,
} from '../__fixtures__/CampaignBaselineSchemaPack.fixture';
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
  'ParticipantRemoved',
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
  ParticipantRemoved: [
    (p) => delete p['participantId'],
    (p) => (p['unexpected'] = true),
    (p) => (p['reason'] = 42),
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

/** The payloads that nest the roster unit. */
const ROSTER_UNIT_EVENT_TYPES = [
  'RosterUnitChanged',
  'SalvageAllocated',
  'CampaignSnapshotPublished',
] as const satisfies readonly CampaignEventType[];

type RosterUnitEventType = (typeof ROSTER_UNIT_EVENT_TYPES)[number];

/** Where each valid fixture holds its pinned roster unit. */
const ROSTER_UNIT_PATHS: Readonly<
  Record<RosterUnitEventType, readonly string[]>
> = {
  RosterUnitChanged: ['unit'],
  SalvageAllocated: ['recoveredUnit'],
  CampaignSnapshotPublished: ['state', 'rosterUnits', 'unit-atlas-1'],
};

/** The library version pin the producer rows put on every roster unit. */
const SOURCE_VERSION = 3;
const NOW = '3025-01-03T00:00:00.000Z';

interface IZodRefusal {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly keys?: readonly string[];
}

/**
 * Runs `payload` through the parse the pack registers for `eventType` and
 * returns each zod issue's code, path and (for unknown keys) keys, or null
 * when the payload parses.
 */
function refusal(
  eventType: CampaignEventType,
  payload: unknown,
): readonly IZodRefusal[] | null {
  const parse = CAMPAIGN_BASELINE_SCHEMA_PACK.find(
    (registration) => registration.eventType === eventType,
  )?.schemas[0]?.parse;
  if (!parse) throw new Error(`No registered parse for ${eventType}`);
  try {
    parse(payload);
    return null;
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    return error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      ...('keys' in issue ? { keys: issue.keys } : {}),
    }));
  }
}

/**
 * A deep copy of `eventType`'s valid fixture whose pinned roster unit has
 * `sourceVersion` set to `value`.
 */
function withSourceVersion(
  eventType: RosterUnitEventType,
  value: unknown,
): MutablePayload {
  const payload = clone(VALID_CAMPAIGN_EVENT_PAYLOADS[eventType]);
  const unit = ROSTER_UNIT_PATHS[eventType].reduce<MutablePayload>(
    (node, key) => node[key] as MutablePayload,
    payload,
  );
  unit['sourceVersion'] = value;
  return payload;
}

/**
 * The shared populated campaign with each force re-mapped to its own unit,
 * because both roster builders refuse a unit claimed by two forces.
 */
function disjointCampaign(): ICampaign {
  const campaign = buildPopulatedCampaign();
  const forces = new Map(
    Array.from(campaign.forces.values()).map((force, index) => [
      force.id,
      { ...force, unitIds: [`unit-${index}`] },
    ]),
  );
  return { ...campaign, forces };
}

/** One canonical roster unit per force unit, each pinned at SOURCE_VERSION. */
function pinnedRosterUnits(
  campaign: ICampaign,
): readonly IRosterUnitProjection[] {
  return Array.from(campaign.forces.values())
    .flatMap((force) => force.unitIds)
    .map(
      (unitId, index): IRosterUnitProjection => ({
        unitId,
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
        sourceVersion: SOURCE_VERSION,
        unitName: `Unit ${index}`,
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      }),
    );
}

/** The sourceVersion of each roster unit in a snapshot event's state. */
function snapshotSourceVersions(
  event: ICampaignEvent | undefined,
): readonly (number | undefined)[] {
  if (event?.type !== 'CampaignSnapshotPublished') {
    throw new Error('Expected a CampaignSnapshotPublished event');
  }
  return Object.values(event.payload.state.rosterUnits).map(
    (unit) => unit.sourceVersion,
  );
}

describe('campaign baseline schema pack: roster units production writes', () => {
  const registry = new ReplaySchemaRegistry({
    events: CAMPAIGN_BASELINE_SCHEMA_PACK,
  });
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-pack-roster-unit-'));
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /**
   * Opens a co-op host over the SQLite journal store, seeded with the co-op
   * builder's state for a campaign whose roster units carry sourceVersion;
   * `open` commits the host's baseline snapshot.
   */
  async function openCoopHost(): Promise<{
    readonly campaign: ICampaign;
    readonly host: CampaignMatchHost;
    readonly store: JournalCampaignEventStore;
  }> {
    const campaign = disjointCampaign();
    getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(
        getSQLiteService().getDatabase(),
        () => NOW,
      ),
    );
    const host = new CampaignMatchHost({
      campaignId: campaign.id,
      hostPlayerId: 'host-roster-unit',
      eventStore: store,
      initialState: buildCampaignAuthoritativeState(
        campaign,
        pinnedRosterUnits(campaign),
      ),
    });
    await host.open();
    return { campaign, host, store };
  }

  it('parses the genesis snapshot the campaign source journals', async () => {
    const campaign = disjointCampaign();
    const journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(
      () => NOW,
    );
    const genesis = await appendCampaignGenesis(journal, () => undefined, {
      envelope: buildSerializedCampaign(campaign, 'device-roster-unit', 1, {
        campaignId: campaign.id,
        units: pinnedRosterUnits(campaign),
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      }),
      occurredAt: NOW,
    });
    expect(genesis.kind).toBe('genesis-appended');

    const [snapshot] = await new JournalCampaignEventStore(journal).getEvents(
      campaign.id,
    );
    expect(snapshotSourceVersions(snapshot)).toEqual([
      SOURCE_VERSION,
      SOURCE_VERSION,
    ]);
    expect(refusal('CampaignSnapshotPublished', snapshot?.payload)).toBeNull();
  });

  it('parses the baseline snapshot the co-op host commits on open', async () => {
    const { campaign, store } = await openCoopHost();

    const [snapshot] = await store.getEvents(campaign.id);
    expect(snapshotSourceVersions(snapshot)).toEqual([
      SOURCE_VERSION,
      SOURCE_VERSION,
    ]);
    expect(refusal('CampaignSnapshotPublished', snapshot?.payload)).toBeNull();
  });

  it('parses the RosterUnitChanged events a combat outcome commits', async () => {
    const { campaign, host } = await openCoopHost();

    const outcome = await reconcileCoopBattle(host, {
      campaignId: campaign.id,
      matchId: 'match-roster-unit',
      fundsDelta: 0,
      fundsReason: 'No payout',
      salvageValue: 0,
      rosterChanges: [
        { unitId: 'unit-0', designation: 'Unit 0', status: 'destroyed' },
        { unitId: 'unit-1', designation: 'Unit 1', status: 'damaged' },
      ],
    });
    expect(outcome.ok).toBe(true);
    const changes = outcome.events.flatMap((event) =>
      event.type === 'RosterUnitChanged' ? [event.payload] : [],
    );
    expect(changes.map((change) => change.unit.sourceVersion)).toEqual([
      SOURCE_VERSION,
      SOURCE_VERSION,
    ]);
    expect(
      changes.map((change) => refusal('RosterUnitChanged', change)),
    ).toEqual([null, null]);
  });

  it('still refuses an unknown extra field on a roster unit', () => {
    const payload = clone(VALID_CAMPAIGN_EVENT_PAYLOADS['RosterUnitChanged']);
    (payload['unit'] as MutablePayload)['tonnage'] = 100;

    expect(refusal('RosterUnitChanged', payload)).toEqual([
      { code: 'unrecognized_keys', path: ['unit'], keys: ['tonnage'] },
    ]);
  });

  it.each(
    ROSTER_UNIT_EVENT_TYPES.flatMap((eventType) =>
      INVALID_ROSTER_UNIT_SOURCE_VERSIONS.map(
        (value) => [eventType, value] as const,
      ),
    ),
  )('%s refuses sourceVersion %p', (eventType, value) => {
    const issues = refusal(eventType, withSourceVersion(eventType, value));

    expect(issues?.map((issue) => issue.path)).toEqual([
      [...ROSTER_UNIT_PATHS[eventType], 'sourceVersion'],
    ]);
    let code: string | null = null;
    try {
      registry.upcast(eventType, 1, withSourceVersion(eventType, value));
    } catch (error) {
      if (error instanceof UnsupportedReplayHistoryError) code = error.code;
      else throw error;
    }
    expect(code).toBe('invalid-payload');
  });

  it('changes the pipeline fingerprint for, and only for, histories holding a roster unit', () => {
    // The registrations as they stood before the roster unit gained
    // sourceVersion: every schema id was campaign.<type>.v1.
    const before = new ReplaySchemaRegistry({
      events: CAMPAIGN_BASELINE_SCHEMA_PACK.map((registration) => ({
        ...registration,
        schemas: registration.schemas.map((schema) => ({
          ...schema,
          schemaId: `campaign.${registration.eventType}.v1`,
        })),
      })),
    });
    // A history holding each given type once, at stored version 1.
    const history = (types: readonly string[]) =>
      types.map((eventType) => ({ eventType, schemaVersion: 1 }));
    const untouched = CAMPAIGN_BASELINE_EVENT_TYPES.filter(
      (eventType) =>
        !(ROSTER_UNIT_EVENT_TYPES as readonly string[]).includes(eventType),
    );

    expect(registry.fingerprintPipeline(history(untouched))).toBe(
      before.fingerprintPipeline(history(untouched)),
    );
    for (const eventType of ROSTER_UNIT_EVENT_TYPES) {
      expect(registry.fingerprintPipeline(history([eventType]))).not.toBe(
        before.fingerprintPipeline(history([eventType])),
      );
    }
  });
});
