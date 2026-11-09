import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from '../equipmentResolution';

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
afterEach(() => jest.restoreAllMocks());

// Pinned MegaMek 48fcb2f64 MiscType.java:4809-4815 (IS 1 t), 4839-4845 (Clan 0.5 t).
it.each([
  ['CASE II [IS]', TechBase.CLAN, TechBaseMode.CLAN, undefined, 'caseii', 1],
  [
    'CASE II [IS]',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    undefined,
    'caseii',
    1,
  ],
  [
    'CASE II [IS]',
    TechBase.CLAN,
    TechBaseMode.MIXED,
    ['CLCASEII'],
    'caseii',
    1,
  ],
  [
    'CASE II [IS]',
    TechBase.INNER_SPHERE,
    TechBaseMode.MIXED,
    ['CLCASEII'],
    'caseii',
    1,
  ],
  ['caseii', TechBase.CLAN, TechBaseMode.MIXED, ['CASE II [IS]'], 'caseii', 1],
  ['ISCASEII', TechBase.CLAN, TechBaseMode.CLAN, undefined, 'caseii', 1],
  [
    'CLCASEII',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    undefined,
    'clan-caseii',
    0.5,
  ],
  ['CASEII', TechBase.CLAN, TechBaseMode.CLAN, undefined, 'clan-caseii', 0.5],
  [
    'CASEII',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    undefined,
    'caseii',
    1,
  ],
] as const)(
  '%s preserves source side on %s / %s',
  (name, tech, mode, slots, id, mass) => {
    const resolved = resolveEquipmentId(name, tech, mode, slots);
    expect(resolved.equipmentDef?.id).toBe(id);
    expect(resolved.equipmentDef?.weight).toBe(mass);
  },
);

it('preserves #3211 admission: a pure-mode critical grid retains unit-mode routing', () => {
  const result = resolveEquipmentId(
    'CASE II [IS]',
    TechBase.CLAN,
    TechBaseMode.CLAN,
    [],
  );
  expect(result.resolvedId).toBe('clan-caseii');
});

it.each(['CASE II [IS] (R) (OMNIPOD)', 'CASE II [IS] (Rear) (ARMORED)'])(
  'retains source markers through the native wrapper parser: %s',
  (name) => {
    const parsed = parseCriticalSlotToken(name);
    expect(parsed.isRearMounted).toBe(true);
    expect(parsed.lookupToken).toBe('CASE II [IS]');
    const result = resolveEquipmentId(
      parsed.lookupToken,
      TechBase.CLAN,
      TechBaseMode.CLAN,
      undefined,
    );
    expect(result.equipmentDef?.id).toBe('caseii');
    expect(result.equipmentDef?.weight).toBe(1);
  },
);

it('does not treat the lexical CL in Claws as a catalog-bound native side', () => {
  expect(
    resolveEquipmentId('Claws', TechBase.CLAN, TechBaseMode.CLAN, undefined)
      .resolvedId,
  ).toBe('claws');
});

it('keeps the available IS definition when the Clan twin is absent', () => {
  const lookup = getEquipmentLookupService(),
    get = lookup.getById.bind(lookup);
  jest
    .spyOn(lookup, 'getById')
    .mockImplementation((id) => (id === 'clan-caseii' ? undefined : get(id)));
  expect(
    resolveEquipmentId(
      'CASE II [IS]',
      TechBase.CLAN,
      TechBaseMode.CLAN,
      undefined,
    ).equipmentDef?.id,
  ).toBe('caseii');
});

// C5-CASE-II-CLAN-LITERAL stays open: this PR does not add a candidate fallback.
it.each([TechBaseMode.INNER_SPHERE, TechBaseMode.CLAN, TechBaseMode.MIXED])(
  'retains the named unresolved Clan spelling in %s',
  (mode) => {
    const result = resolveEquipmentId(
      'CASE II [Clan]',
      TechBase.INNER_SPHERE,
      mode,
      undefined,
    );
    expect(result.equipmentDef).toBeUndefined();
    expect(result.resolvedId).toBe('case ii [clan]');
  },
);

it('retains existing Mixed-grid matching for the unresolved Clan literal', () => {
  expect(
    resolveEquipmentId('caseii', TechBase.INNER_SPHERE, TechBaseMode.MIXED, [
      'CASE II [Clan]',
    ]).resolvedId,
  ).toBe('caseii');
});

// Pinned MiscType.java:5803-5838,5848-5884 at 48fcb2f64: both types are Clan.
it.each([
  ['Active Probe [IS]', 'clan-active-probe'],
  ['Light Active Probe [IS]', 'clan-light-active-probe'],
] as const)(
  'retains the real Clan record when %s has no IS counterpart',
  (name, expectedId) => {
    const result = resolveEquipmentId(
      name,
      TechBase.CLAN,
      TechBaseMode.CLAN,
      undefined,
    );
    expect(result.equipmentDef?.id).toBe(expectedId);
    expect(result.equipmentDef?.techBase).toBe(TechBase.CLAN);
    expect(result.equipmentDef?.rulesLevel).toBe(RulesLevel.STANDARD);
  },
);
