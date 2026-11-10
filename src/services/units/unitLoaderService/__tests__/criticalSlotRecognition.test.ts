import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

import { recognizeCriticalSlotEntries } from '../criticalSlotEquipment';

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
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

const context = {
  unitTechBase: TechBase.INNER_SPHERE,
  unitTechBaseMode: TechBaseMode.INNER_SPHERE,
  equipment: [],
};
it('retains resolved and unknown raw cells while excluding existing system components', () => {
  const result = recognizeCriticalSlotEntries({
    ...context,
    criticalSlots: {
      LEFT_TORSO: ['Fusion Engine', 'IS Ferro-Fibrous', 'not-a-known-item'],
    },
  });
  expect(result.cells).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: 'IS Ferro-Fibrous',
        location: MechLocation.LEFT_TORSO,
        slot: 1,
        kind: 'armor-marker',
        effect: 'placement-only',
        represented: false,
      }),
      expect.objectContaining({
        text: 'not-a-known-item',
        slot: 2,
        kind: 'unclassified',
        effect: 'unknown',
      }),
    ]),
  );
  expect(result.cells).toHaveLength(2);
  expect(result.missing).toEqual(result.cells);
});

it('uses actual split and spread cells, rather than a listed name or summary reservation, as coverage', () => {
  const definition = getEquipmentLookupService().getById('medium-laser');
  if (!definition) throw new Error('Missing medium laser test definition');
  const equipment = [
    {
      ...createMountedEquipment(definition, 'coverage-control'),
      location: MechLocation.LEFT_TORSO,
      slots: [0],
      splitSlots: { location: MechLocation.RIGHT_TORSO, slots: [1] },
      spreadSlots: [{ location: MechLocation.HEAD, slots: [3] }],
    },
  ];
  const result = recognizeCriticalSlotEntries({
    ...context,
    equipment,
    criticalSlots: {
      LEFT_TORSO: ['IS Ferro-Fibrous', 'IS Ferro-Fibrous'],
      RIGHT_TORSO: [null, 'IS Ferro-Fibrous'],
      HEAD: [null, null, null, 'IS Ferro-Fibrous'],
    },
  });
  expect(result.cells).toHaveLength(4);
  expect(result.missing).toEqual([
    expect.objectContaining({ location: MechLocation.LEFT_TORSO, slot: 1 }),
  ]);
});

it.each([
  ['Cargo (OMNIPOD):SIZE:2.5', { size: { raw: '2.5', value: 2.5 } }],
  [
    'Communications Equipment (4 tons)',
    { legacySize: { raw: '(4 tons)', value: 4, unit: 'tons' } },
  ],
  ['Ladder (40 m)', { legacySize: { raw: '(40 m)', value: 40, unit: 'm' } }],
  [
    'Cargo (500 kg)',
    { legacySize: { raw: '(500 kg)', value: 500, unit: 'kg' } },
  ],
  [
    'Cargo (4 ton):SIZE:0',
    {
      size: { raw: '0', value: 0 },
      legacySize: { raw: '(4 ton)', value: 4, unit: 'ton' },
    },
  ],
  ['Cargo:SIZE:broken', { size: { raw: 'broken', value: undefined } }],
  ['Cargo', {}],
])(
  'passes all token size evidence for %s to recovery without applying a sizing rule',
  (token, parameters) => {
    const { missing } = recognizeCriticalSlotEntries({
      ...context,
      tonnage: 55,
      criticalSlots: { LEFT_TORSO: [token] },
    });
    expect(missing).toHaveLength(1);
    expect(missing[0].parsedToken.parameters).toEqual(parameters);
    expect(missing[0].text).toBe(token);
  },
);

it('keeps the native pod suffix metadata, without inferring a pod from category', () => {
  const result = recognizeCriticalSlotEntries({
    ...context,
    criticalSlots: {
      LEFT_TORSO: ['Supercharger (OMNIPOD) (ARMORED)', 'Supercharger'],
    },
  });
  expect(result.cells.map((cell) => cell.isOmniPodMounted)).toEqual([
    true,
    false,
  ]);
});

it('has a single vocabulary owner for every pinned marker spelling', () => {
  const markers = vocabulary.criticalSlotMarkers;
  expect(Object.keys(markers)).toHaveLength(20);
  for (const [name, marker] of Object.entries(markers)) {
    expect(marker.source).toMatch(
      /48fcb2f64.*(?:ArmorType|MiscType)\.java:\d+/,
    );
    const result = recognizeCriticalSlotEntries({
      ...context,
      criticalSlots: { LEFT_TORSO: [name] },
    });
    expect(result.missing).toEqual([
      expect.objectContaining({
        text: name,
        kind: marker.kind,
        represented: false,
      }),
    ]);
  }
});
