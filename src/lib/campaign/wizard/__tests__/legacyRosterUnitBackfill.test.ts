import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  disableDiagnosticCapture,
  enableDiagnosticCapture,
  getCapturedDiagnostics,
} from '@/utils/logger';

import { backfillLegacyRosterUnitRefs } from '../legacyRosterUnitBackfill';

function makeRosterUnit(
  unitId: string,
  unitName: string,
  unitRef?: string,
): IRosterUnitProjection {
  return {
    unitId,
    unitName,
    unitRef,
    chassisVariant: unitName,
    readiness: 'Ready',
  };
}

describe('backfillLegacyRosterUnitRefs', () => {
  afterEach(() => {
    disableDiagnosticCapture(true);
  });

  it('fills legacy placeholder units from the wizard representative mapping', () => {
    enableDiagnosticCapture();

    const backfilled = backfillLegacyRosterUnitRefs(
      [
        makeRosterUnit('unit-light', 'Light Mech'),
        makeRosterUnit('unit-medium', 'Medium Mech'),
        makeRosterUnit('unit-heavy', 'Heavy Mech'),
        makeRosterUnit('unit-assault', 'Assault Mech'),
      ],
      { campaignId: 'campaign-legacy', source: 'test' },
    );

    expect(backfilled.map((unit) => unit.unitRef)).toEqual([
      'locust-lct-1v',
      'hunchback-hbk-4g',
      'marauder-mad-3r',
      'atlas-as7-d',
    ]);
    expect(getCapturedDiagnostics()[0]).toMatchObject({
      service: 'campaign-roster-backfill',
      event: 'legacy_roster_unit_refs_backfilled',
      entityIds: { campaignId: 'campaign-legacy' },
      metadata: expect.objectContaining({
        source: 'test',
        mappedUnitCount: 4,
      }),
    });
  });

  it('uses explicit tonnage when legacy unit names are not template labels', () => {
    const backfilled = backfillLegacyRosterUnitRefs([
      {
        ...makeRosterUnit('unit-tonnage', 'Legacy 55t Placeholder'),
        tonnage: 55,
      } as IRosterUnitProjection,
    ]);

    expect(backfilled[0].unitRef).toBe('hunchback-hbk-4g');
  });

  it('is idempotent and never overwrites existing unitRef values', () => {
    const alreadyResolved = makeRosterUnit(
      'unit-resolved',
      'Light Mech',
      'custom-real-unit-ref',
    );
    const firstPass = backfillLegacyRosterUnitRefs([
      alreadyResolved,
      makeRosterUnit('unit-placeholder', 'Heavy Mech'),
    ]);
    const secondPass = backfillLegacyRosterUnitRefs(firstPass);

    expect(firstPass[0]).toBe(alreadyResolved);
    expect(firstPass[0].unitRef).toBe('custom-real-unit-ref');
    expect(firstPass[1].unitRef).toBe('marauder-mad-3r');
    expect(secondPass).toBe(firstPass);
    expect(secondPass.map((unit) => unit.unitRef)).toEqual([
      'custom-real-unit-ref',
      'marauder-mad-3r',
    ]);
  });
});
