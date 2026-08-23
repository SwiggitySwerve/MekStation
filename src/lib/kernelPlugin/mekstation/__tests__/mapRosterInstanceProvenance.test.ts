import type { IInstanceProvenance } from '@/kernel';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  isLibraryBackedEnrollment,
  mapRosterInstanceProvenance,
  pinSourceVersion,
} from '../mapRosterInstanceProvenance';
import { MEKSTATION_GAME_PLUGIN } from '../mekstationGamePlugin';

describe('mapRosterInstanceProvenance', () => {
  it('maps a roster unit onto kernel provenance without BattleTech nouns in the kernel', () => {
    const unit: IRosterUnitProjection = {
      unitId: 'instance-1',
      unitRef: 'saved-design-9',
      unitSource: 'custom',
      sourceVersion: 4,
      unitName: 'Custom',
      chassisVariant: 'WHM-6R',
      readiness: 'Ready',
    };
    const mapped = mapRosterInstanceProvenance(unit);
    const expected: IInstanceProvenance = {
      instanceId: 'instance-1',
      libraryItemId: 'saved-design-9',
      sourceVersion: 4,
      kind: MEKSTATION_GAME_PLUGIN.instanceKind,
    };
    expect(mapped).toEqual(expected);
    expect(isLibraryBackedEnrollment({ unitRef: 'atlas-as7-d' })).toBe(true);
    expect(isLibraryBackedEnrollment({})).toBe(false);
    expect(pinSourceVersion(undefined)).toBe(1);
  });

  it('refuses invalid sources and missing library ids', () => {
    const missingRef: IRosterUnitProjection = {
      unitId: 'instance-2',
      unitName: 'Unknown',
      chassisVariant: 'X',
      readiness: 'Ready',
      unitSource: 'canonical',
    };
    expect(mapRosterInstanceProvenance(missingRef)).toBeNull();
    expect(
      mapRosterInstanceProvenance({
        ...missingRef,
        unitRef: 'atlas-as7-d',
        unitSource: 'forged' as never,
      }),
    ).toBeNull();
  });
});
