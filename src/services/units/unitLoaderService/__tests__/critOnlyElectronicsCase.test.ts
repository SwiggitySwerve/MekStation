import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { UnitState } from '@/stores/unitState';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import gustav from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Schwerer Gustav Unknown.json';
import temax from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Temax Cat Ninjabolt TMC-NB.json';
import poseidon from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Poseidon PSD-V2.json';
import triskelion from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Triskelion TRK-4V.json';
import celerity from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Celerity CLR-03-O.json';
import anastasia from "../../../../../public/data/units/battlemechs/6-dark-age/standard/Hunchback HBK-LGN-Pin 'Anastasia'.json";
import sneede from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Hybrid Rifleman RFL-3N (Sneede II).json';
import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';
import {
  recognizeCriticalSlotEntries,
  restoreCriticalSlotEquipmentWithDiagnostics,
} from '../criticalSlotEquipment';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const L = MechLocation;
type Source = Parameters<typeof parseUnit>[0];

function loadAndReopen(source: unknown): {
  loaded: UnitState;
  reopened: UnitState;
} {
  const loader = new UnitLoaderService();
  const loaded = loader.mapToUnitState(parseUnit(source as Source), true);
  const saved = serializeCustomUnitState(loaded, {
    id: 'pr-d1-evidence',
    chassis: loaded.chassis,
    variant: loaded.model,
    era: Era.DARK_AGE,
  });
  const reopened = loader.mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
  return { loaded, reopened };
}

/** Semantic mount vector: identity, mass, placement and flags; never instance ids. */
function mounts(state: UnitState, equipmentId: string) {
  return state.equipment
    .filter((item) => item.equipmentId === equipmentId)
    .map((item) => ({
      location: item.location,
      slots: item.slots,
      weight: item.weight,
      criticalSlots: item.criticalSlots,
      isOmniPodMounted: item.isOmniPodMounted,
    }))
    .sort((a, b) =>
      `${a.location}${a.slots}`.localeCompare(`${b.location}${b.slots}`),
    );
}

function expectBoth(
  source: unknown,
  equipmentId: string,
  expected: ReturnType<typeof mounts>,
) {
  const { loaded, reopened } = loadAndReopen(source);
  expect(mounts(loaded, equipmentId)).toEqual(expected);
  expect(mounts(reopened, equipmentId)).toEqual(expected);
}

const mount = (
  location: MechLocation,
  slots: number[],
  weight: number,
  isOmniPodMounted = false,
) => ({
  location,
  slots,
  weight,
  criticalSlots: slots.length,
  isOmniPodMounted,
});

// MiscType.java:4713,4813,4843; Sensor.java:92 / MiscType.java:5724 (48fcb2f64).
describe('Scarecrow UCU-F4', () => {
  it('recovers one 2 t Bloodhound probe over its three cells', () => {
    expectBoth(scarecrow, 'bloodhound-active-probe', [
      mount(L.LEFT_TORSO, [7, 8, 9], 2),
    ]);
  });
  it('keeps ISCASEII on this mixed unit as IS CASE II, 1 t (#3303)', () => {
    expectBoth(scarecrow, 'caseii', [mount(L.RIGHT_TORSO, [8], 1)]);
    expect(mounts(loadAndReopen(scarecrow).reopened, 'clan-caseii')).toEqual(
      [],
    );
  });
});

describe('Triskelion TRK-4V', () => {
  it('recovers both Clan Artemis V groups at their native cells', () => {
    expectBoth(triskelion, 'artemisv', [
      mount(L.LEFT_TORSO, [4, 5], 1.5),
      mount(L.RIGHT_TORSO, [4, 5], 1.5),
    ]);
  });
  it('recovers both IS CASE II mounts, 1 t each', () => {
    expectBoth(triskelion, 'caseii', [
      mount(L.LEFT_TORSO, [8], 1),
      mount(L.RIGHT_TORSO, [8], 1),
    ]);
  });
  it('recovers the Guardian ECM and the TC through the TC owner', () => {
    expectBoth(triskelion, 'guardian-ecm', [
      mount(L.CENTER_TORSO, [10, 11], 1.5),
    ]);
    expectBoth(triskelion, 'targeting-computer', [mount(L.HEAD, [3], 1)]);
  });
  it('drops every recovered cell from the residual and keeps the four ammo bins', () => {
    const { loaded } = loadAndReopen(triskelion);
    const residual = (loaded.unrecoveredCriticalSlots ?? []).map(
      (cell) => cell.text,
    );
    for (const token of [
      'CLArtemisV',
      'ISCASEII',
      'ISGuardianECMSuite',
      'ISTargeting Computer',
    ])
      expect(residual).not.toContain(token);
    expect(
      loaded.equipment.filter((item) => item.equipmentId.includes('ammo')),
    ).toHaveLength(4);
  });
});

describe('Poseidon PSD-V2', () => {
  it('recovers both genuine Clan CASE II mounts as clan-caseii, 0.5 t each', () => {
    expectBoth(poseidon, 'clan-caseii', [
      mount(L.LEFT_TORSO, [10], 0.5),
      mount(L.RIGHT_TORSO, [10], 0.5),
    ]);
    expect(mounts(loadAndReopen(poseidon).reopened, 'caseii')).toEqual([]);
  });
});

describe('Celerity CLR-03-O', () => {
  it('recovers the C3 slave at Head [5]', () => {
    expectBoth(celerity, 'c3-slave', [mount(L.HEAD, [5], 1)]);
  });
  // The pinned MTF is a Quad OmniMek; the committed JSON omits isOmni, so the
  // pod projection only applies once the unit is declared Omni.
  it('keeps the native pod flag on a declared OmniMek', () => {
    expectBoth({ ...celerity, isOmni: true }, 'c3-slave', [
      mount(L.HEAD, [5], 1, true),
    ]);
  });
});

describe('FrankenMek save/reopen acceptance units', () => {
  it('Anastasia: one 4-cell Clan TC sized by the TC owner', () => {
    expectBoth(anastasia, 'clan-targeting-computer', [
      mount(L.LEFT_TORSO, [3, 4, 5, 6], 4),
    ]);
  });
  it('Temax: ISCASE', () => {
    expectBoth(temax, 'case', [mount(L.LEFT_TORSO, [8], 0.5)]);
  });
  it('Schwerer Gustav: one Bloodhound over three cells and ISCASE', () => {
    expectBoth(gustav, 'bloodhound-active-probe', [
      mount(L.CENTER_TORSO, [8, 9, 10], 2),
    ]);
    expectBoth(gustav, 'case', [mount(L.RIGHT_TORSO, [8], 0.5)]);
  });
  it('Sneede II: TC x2, Artemis V, ECM and Clan CASE II', () => {
    expectBoth(sneede, 'clan-targeting-computer', [
      mount(L.RIGHT_TORSO, [5, 6], 2),
    ]);
    expectBoth(sneede, 'artemisv', [mount(L.LEFT_TORSO, [4, 5], 1.5)]);
    expectBoth(sneede, 'ecmsuite', [mount(L.HEAD, [3], 1)]);
    expectBoth(sneede, 'clan-caseii', [mount(L.LEFT_TORSO, [10], 0.5)]);
  });
});

describe('residual membership', () => {
  it('loses exactly the recovered PR-D1 cells; deferred Chameleon stays explicit', () => {
    const { loaded } = loadAndReopen(scarecrow);
    const residual = (loaded.unrecoveredCriticalSlots ?? []).map(
      (cell) => cell.text,
    );
    expect(residual).not.toContain('BloodhoundActiveProbe');
    expect(residual).not.toContain('ISCASEII');
    expect(
      residual.filter((text) => text === 'Chameleon Light Polarization Shield'),
    ).toHaveLength(6);
  });
});

const IS = {
  equipment: [],
  unitTechBase: TechBase.INNER_SPHERE,
  unitTechBaseMode: TechBaseMode.INNER_SPHERE,
  tonnage: 50,
};

describe('exact identity, never substring', () => {
  it.each([
    // Notice table says electronics, but no PR-D1 vocabulary row: deferred or not PR-D1.
    'Chameleon Light Polarization Shield',
    'Mek Null Signature System',
    'Mek Void Signature System',
    'Blue Shield Particle Field Damper',
    'Communications Equipment:SIZE:2.0',
    'ISTAG',
    // Contains "c3"/"sensor": a weapon.
    'ISC3RemoteSensorLauncher',
    // Contains "artemis": ammunition.
    'Clan Ammo LRM-15 (Clan) Artemis V-capable',
  ])('%s is not admitted as a PR-D1 kind', (token) => {
    const cells = recognizeCriticalSlotEntries({
      ...IS,
      criticalSlots: { LEFT_TORSO: [token] },
    }).cells;
    expect(cells.map((cell) => cell.kind)).not.toContain('electronics');
    expect(cells.map((cell) => cell.kind)).not.toContain('case');
  });

  it('never recovers a deferred spread system or a 0 t comms stub', () => {
    const { equipment, unrecoveredCriticalSlots } =
      restoreCriticalSlotEquipmentWithDiagnostics(
        [],
        [],
        IS.unitTechBase,
        IS.unitTechBaseMode,
        {
          LEFT_TORSO: [
            'Chameleon Light Polarization Shield',
            'Blue Shield Particle Field Damper',
            'Communications Equipment:SIZE:2.0',
            'Communications Equipment:SIZE:2.0',
          ],
        },
        50,
      );
    expect(equipment).toEqual([]);
    expect(unrecoveredCriticalSlots.map((cell) => cell.slot)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it.each([
    ['ISCASE', 'case'],
    ['ISCASEII', 'case'],
    ['ISCASE (OMNIPOD)', 'case'],
    ['ISGuardianECMSuite', 'electronics'],
    ['BloodhoundActiveProbe (ARMORED)', 'electronics'],
    ['ISTargeting Computer', 'electronics'],
    ['Searchlight (R)', 'electronics'],
  ])('%s is the PR-D1 kind %s', (token, kind) => {
    const cells = recognizeCriticalSlotEntries({
      ...IS,
      criticalSlots: { LEFT_TORSO: [token] },
    }).cells;
    expect(cells.map((cell) => cell.kind)).toEqual([kind]);
  });
});

describe('grouping', () => {
  const restore = (cells: string[], tonnage = 50) =>
    restoreCriticalSlotEquipmentWithDiagnostics(
      [],
      [],
      IS.unitTechBase,
      IS.unitTechBaseMode,
      { LEFT_TORSO: cells },
      tonnage,
    );
  it('keeps a multi-cell probe as ONE mount and two adjacent probes as two', () => {
    expect(
      restore(Array(3).fill('BloodhoundActiveProbe')).equipment.map(
        (item) => item.slots,
      ),
    ).toEqual([[0, 1, 2]]);
    expect(
      restore(Array(6).fill('BloodhoundActiveProbe')).equipment.map(
        (item) => item.slots,
      ),
    ).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
  it('leaves an incomplete group explicit instead of inventing a partial mount', () => {
    const result = restore(Array(2).fill('BloodhoundActiveProbe'));
    expect(result.equipment).toEqual([]);
    expect(result.unrecoveredCriticalSlots).toHaveLength(2);
  });
  it('never duplicates a mount already listed at its cells', () => {
    const listed = restoreCriticalSlotEquipmentWithDiagnostics(
      [{ id: 'guardian-ecm', slots: [0, 1] }],
      [
        {
          ...getEquipmentLookupService().getById('guardian-ecm')!,
          instanceId: 'listed',
          equipmentId: 'guardian-ecm',
          location: L.LEFT_TORSO,
          slots: [0, 1],
          isRearMounted: false,
          isRemovable: true,
          isOmniPodMounted: false,
          heat: 0,
          linkedAmmoId: undefined,
        },
      ] as never,
      IS.unitTechBase,
      IS.unitTechBaseMode,
      { LEFT_TORSO: ['ISGuardianECMSuite', 'ISGuardianECMSuite'] },
      50,
    );
    expect(listed.equipment).toHaveLength(1);
    expect(listed.unrecoveredCriticalSlots).toEqual([]);
  });
  it('applies superheavy entry demand once', () => {
    expect(
      restore(Array(2).fill('BloodhoundActiveProbe'), 105).equipment.map(
        (item) => [item.slots, item.criticalSlots, item.weight],
      ),
    ).toEqual([[[0, 1], 2, 2]]);
  });
  it('keeps the rear flag of a rear-mounted searchlight', () => {
    expect(
      restore(['Searchlight (R)']).equipment.map((item) => item.isRearMounted),
    ).toEqual([true]);
  });
});
