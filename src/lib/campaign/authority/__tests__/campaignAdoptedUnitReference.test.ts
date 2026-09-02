/**
 * A customized design must survive adoption without substitution.
 *
 * The roster projection carries a catalog reference and nothing about
 * construction, so "the campaign adopted my custom Atlas" and "the
 * campaign adopted the stock Atlas template" look identical through it.
 * These rows put a design with a NON-DEFAULT engine, gyro, structure,
 * armor allocation, equipment list and critical slots through the real
 * custom-unit repository and the real campaign serializer, then read
 * every named field back out of adoption one at a time - a `toEqual`
 * against a fixture the test also wrote would prove only that the test
 * agrees with itself.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Customized Units Adopt Canonically")
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { SerializedCampaignRosterState } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';

import { adoptRosterUnitReference } from '../campaignAdoptedUnitReference';

const ADOPTED_AT = '3025-07-04T00:00:00.000Z';
/** Two provably different instants for the durable record's own clock. */
const CUSTOM_UNIT_CREATED_AT = '3025-01-01T00:00:00.000Z';
const CUSTOM_UNIT_UPDATED_AT = '3025-06-15T12:30:00.000Z';

/**
 * A design nothing in the catalog would produce: XL engine at an odd
 * rating, a Compact gyro, Endo Steel structure, Ferro-Fibrous armor with
 * a hand-tuned allocation including a rear value, two pieces of
 * equipment in different locations, and named critical slots.
 */
function customizedPayload(): Record<string, unknown> {
  return {
    id: 'ignored-inner-id',
    chassis: 'Atlas',
    model: 'AS7-CUSTOM',
    variant: 'Wolfhound Pattern',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'Mixed (IS Chassis)',
    rulesLevel: 'Experimental',
    era: 'Clan Invasion',
    year: 3051,
    tonnage: 95,
    engine: { type: 'XL', rating: 285 },
    gyro: { type: 'Compact' },
    structure: { type: 'Endo Steel' },
    armor: {
      type: 'Ferro-Fibrous',
      allocation: {
        Head: 9,
        CenterTorso: { front: 41, rear: 14 },
        LeftArm: 27,
      },
    },
    heatSinks: { type: 'Double', count: 17 },
    movement: { walk: 3, jump: 0 },
    equipment: [
      {
        id: 'ISGaussRifle',
        location: 'RightTorso',
        slots: [0, 1, 2, 3, 4, 5, 6],
      },
      { id: 'ISERMediumLaser', location: 'LeftArm', slots: [0] },
    ],
    criticalSlots: {
      Head: ['Life Support', 'Sensors', 'Cockpit', null],
      LeftArm: ['Shoulder', 'ISERMediumLaser'],
    },
  };
}

/** Create the design through the shipped repository and return its id. */
function persistCustomUnit(): string {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'AS7-CUSTOM',
    data: customizedPayload(),
    notes: 'campaign adoption fixture',
  });
  if (!created.success) {
    throw new Error(`custom unit create failed: ${created.error.message}`);
  }
  return created.data.id;
}

function customProjection(unitRef: string): IRosterUnitProjection {
  return {
    unitId: 'roster-unit-1',
    unitRef,
    unitSource: 'custom',
    sourceVersion: 4,
    unitName: 'Atlas AS7-CUSTOM',
    chassisVariant: 'AS7-CUSTOM',
    readiness: 'Ready',
  };
}

/** Adopt through the real repository resolver. */
function adopt(projection: IRosterUnitProjection) {
  return adoptRosterUnitReference({
    projection,
    adoptedAt: ADOPTED_AT,
    resolveCustomUnit: (unitRef) => getUnitRepository().getById(unitRef),
  });
}

describe('canonical adoption of a customized unit', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'adopt-unit-'));
    resetSQLiteService();
    resetUnitRepository();
    getSQLiteService({ path: path.join(dir, 'adopt.db') }).initialize();
  });

  afterEach(async () => {
    resetUnitRepository();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('preserves identity and the pinned reference', () => {
    const unitRef = persistCustomUnit();
    const result = adopt(customProjection(unitRef));

    expect(result.kind).toBe('adopted');
    if (result.kind !== 'adopted') return;
    expect(result.reference.unitId).toBe('roster-unit-1');
    expect(result.reference.unitRef).toBe(unitRef);
    expect(result.reference.unitSource).toBe('custom');
    expect(result.reference.sourceVersion).toBe(4);
    expect(result.reference.designation).toBe('Atlas AS7-CUSTOM');
    expect(result.reference.customization?.chassis).toBe('Atlas');
    expect(result.reference.customization?.model).toBe('AS7-CUSTOM');
    expect(result.reference.customization?.variant).toBe('Wolfhound Pattern');
    expect(result.reference.customization?.unitType).toBe('BattleMech');
    expect(result.reference.customization?.configuration).toBe('Biped');
  });

  it('preserves weight, tech base, engine, gyro and structure', () => {
    const unitRef = persistCustomUnit();
    const result = adopt(customProjection(unitRef));

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    const custom = result.reference.customization;
    expect(custom?.tonnage).toBe(95);
    expect(custom?.techBase).toBe('Mixed (IS Chassis)');
    expect(custom?.rulesLevel).toBe('Experimental');
    expect(custom?.engine.type).toBe('XL');
    expect(custom?.engine.rating).toBe(285);
    expect(custom?.gyro.type).toBe('Compact');
    expect(custom?.structure.type).toBe('Endo Steel');
  });

  it('preserves armor, equipment and critical slots', () => {
    const unitRef = persistCustomUnit();
    const result = adopt(customProjection(unitRef));

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    const custom = result.reference.customization;
    expect(custom?.armor.type).toBe('Ferro-Fibrous');
    expect(custom?.armor.allocation.Head).toBe(9);
    expect(custom?.armor.allocation.CenterTorso).toEqual({
      front: 41,
      rear: 14,
    });
    expect(custom?.armor.allocation.LeftArm).toBe(27);
    expect(custom?.equipment).toHaveLength(2);
    expect(custom?.equipment[0]?.id).toBe('ISGaussRifle');
    expect(custom?.equipment[0]?.location).toBe('RightTorso');
    expect(custom?.equipment[1]?.id).toBe('ISERMediumLaser');
    expect(custom?.criticalSlots.Head).toEqual([
      'Life Support',
      'Sensors',
      'Cockpit',
      null,
    ]);
    expect(custom?.criticalSlots.LeftArm).toEqual([
      'Shoulder',
      'ISERMediumLaser',
    ]);
  });

  it('preserves temporal metadata from the durable record', () => {
    const unitRef = persistCustomUnit();
    const stored = getUnitRepository().getById(unitRef);
    const result = adopt(customProjection(unitRef));

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    expect(result.reference.adoptedAt).toBe(ADOPTED_AT);
    expect(result.reference.sourceCreatedAt).toBe(stored?.createdAt);
    expect(result.reference.sourceUpdatedAt).toBe(stored?.updatedAt);
    expect(result.reference.sourceRecordVersion).toBe(1);
    expect(result.reference.customization?.era).toBe('Clan Invasion');
    expect(result.reference.customization?.year).toBe(3051);
  });

  it('carries created-at, updated-at and record version apart from each other', () => {
    // A freshly created record stamps created_at and updated_at from the
    // same `now`, so a row built on one of those alone cannot tell the
    // two fields apart - swapping updatedAt for createdAt in adoption
    // passes it. Drive the repository's own clock so the edit lands at a
    // provably later instant, then bump the record through the shipped
    // update path (which is also what moves currentVersion off 1).
    jest.useFakeTimers();
    jest.setSystemTime(new Date(CUSTOM_UNIT_CREATED_AT));
    const unitRef = persistCustomUnit();
    jest.setSystemTime(new Date(CUSTOM_UNIT_UPDATED_AT));
    const edited = getUnitRepository().update(unitRef, {
      data: {
        ...customizedPayload(),
        engine: { type: 'XL', rating: 300 },
        gyro: { type: 'Heavy Duty' },
      },
    });
    jest.useRealTimers();
    if (!edited.success) throw new Error('fixture update failed');

    const stored = getUnitRepository().getById(unitRef);
    if (!stored) throw new Error('edited record did not persist');
    // The guard that keeps this row from decaying back into the vacuous
    // shape: if the fixture ever stops separating the timestamps, this
    // fails here rather than passing a swapped assignment downstream.
    expect(stored.createdAt).not.toBe(stored.updatedAt);
    expect(stored.createdAt).toBe(CUSTOM_UNIT_CREATED_AT);
    expect(stored.updatedAt).toBe(CUSTOM_UNIT_UPDATED_AT);
    expect(stored.currentVersion).toBe(2);

    const campaign = buildPopulatedCampaign();
    const saved = saveCampaign(
      buildSerializedCampaign(campaign, 'device-1', 0, {
        campaignId: campaign.id,
        units: [customProjection(unitRef)],
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      }),
      0,
    );
    expect(saved.kind).toBe('ok');
    const read = readCampaign(campaign.id);
    if (read.kind !== 'ok') throw new Error(`campaign read was ${read.kind}`);
    const projection = read.record.body.rosterProjection?.units[0];
    if (!projection) throw new Error('roster projection did not survive');
    const result = adopt(projection);

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    expect(result.reference.sourceCreatedAt).toBe(CUSTOM_UNIT_CREATED_AT);
    expect(result.reference.sourceUpdatedAt).toBe(CUSTOM_UNIT_UPDATED_AT);
    expect(result.reference.sourceRecordVersion).toBe(2);
    // Adoption reads the CURRENT record, not the version it was enrolled
    // at - the edit's engine and gyro come through with the timestamps.
    expect(result.reference.customization?.engine.rating).toBe(300);
    expect(result.reference.customization?.gyro.type).toBe('Heavy Duty');
  });

  it('recovers the same design after a campaign serialization round trip', () => {
    const unitRef = persistCustomUnit();
    const campaign = buildPopulatedCampaign();
    const roster: SerializedCampaignRosterState = {
      campaignId: campaign.id,
      units: [customProjection(unitRef)],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    };
    const saved = saveCampaign(
      buildSerializedCampaign(campaign, 'device-1', 0, roster),
      0,
    );
    expect(saved.kind).toBe('ok');

    const read = readCampaign(campaign.id);
    if (read.kind !== 'ok') throw new Error(`campaign read was ${read.kind}`);
    const projection = read.record.body.rosterProjection?.units[0];
    if (!projection) throw new Error('roster projection did not survive');
    const result = adopt(projection);

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    const custom = result.reference.customization;
    expect(result.reference.unitRef).toBe(unitRef);
    expect(result.reference.unitSource).toBe('custom');
    expect(result.reference.sourceVersion).toBe(4);
    expect(custom?.tonnage).toBe(95);
    expect(custom?.techBase).toBe('Mixed (IS Chassis)');
    expect(custom?.engine.rating).toBe(285);
    expect(custom?.gyro.type).toBe('Compact');
    expect(custom?.armor.type).toBe('Ferro-Fibrous');
    expect(custom?.armor.allocation.CenterTorso).toEqual({
      front: 41,
      rear: 14,
    });
    expect(custom?.equipment[0]?.id).toBe('ISGaussRifle');
    expect(custom?.criticalSlots.LeftArm).toEqual([
      'Shoulder',
      'ISERMediumLaser',
    ]);
  });

  it('refuses a custom reference the vault cannot resolve rather than substituting', () => {
    const result = adopt(customProjection('custom-never-saved'));

    expect(result).toEqual({
      kind: 'unresolved',
      unitId: 'roster-unit-1',
      reason: 'custom-unit-record-absent',
    });
  });

  it('refuses a custom record whose payload is missing a named field', () => {
    const partial = { ...customizedPayload() };
    delete partial.gyro;
    const created = getUnitRepository().create({
      chassis: 'Atlas',
      variant: 'AS7-PARTIAL',
      data: partial,
    });
    if (!created.success) throw new Error('fixture create failed');
    const result = adopt(customProjection(created.data.id));

    expect(result).toEqual({
      kind: 'unresolved',
      unitId: 'roster-unit-1',
      reason: 'custom-unit-payload-unreadable',
    });
  });

  it('adopts a canonical unit on its pinned reference with no customization', () => {
    const result = adopt({
      unitId: 'roster-unit-2',
      unitRef: 'atlas-as7-d',
      unitSource: 'canonical',
      unitName: 'Atlas AS7-D',
      chassisVariant: 'AS7-D',
      readiness: 'Ready',
    });

    if (result.kind !== 'adopted') throw new Error('expected an adoption');
    expect(result.reference.unitSource).toBe('canonical');
    expect(result.reference.customization).toBeUndefined();
  });

  it('refuses an unparseable roster source and a reference-less unit', () => {
    const badSource = adopt({
      ...customProjection('custom-anything'),
      unitSource: 'imaginary' as never,
    });
    const noRef = adopt({
      ...customProjection('custom-anything'),
      unitRef: undefined,
    });

    expect(badSource).toMatchObject({ reason: 'invalid-unit-source' });
    expect(noRef).toMatchObject({ reason: 'missing-unit-reference' });
  });
});
