/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import {
  getEquipmentEntry,
  initializeCatalog,
  normalizeEquipmentId,
  resetCatalogCache,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

afterEach(resetCatalogCache);

// Actual registry identity/BV observations from pinned MegaMek 48fcb2f6.
const nativeCases = [
  ['CLLBXAC2', 'clan-lb-2-x-ac', 47.0],
  ['cllbxac2', 'clan-lb-2-x-ac', 47.0],
  ['CLLBXAC5', 'clan-lb-5-x-ac', 93.0],
  ['cllbxac5', 'clan-lb-5-x-ac', 93.0],
  ['CLLBXAC10', 'clan-lb-10-x-ac', 148.0],
  ['cllbxac10', 'clan-lb-10-x-ac', 148.0],
  ['CLLBXAC20', 'clan-lb-20-x-ac', 237.0],
  ['cllbxac20', 'clan-lb-20-x-ac', 237.0],
  ['CLStreakSRM2', 'clan-streak-srm-2', 40.0],
  ['clstreaksrm2', 'clan-streak-srm-2', 40.0],
  ['CLSTREAKSRM2', 'clan-streak-srm-2', 40.0],
  ['CLStreakSRM4', 'clan-streak-srm-4', 79.0],
  ['clstreaksrm4', 'clan-streak-srm-4', 79.0],
  ['CLSTREAKSRM4', 'clan-streak-srm-4', 79.0],
  ['CLStreakSRM6', 'clan-streak-srm-6', 118.0],
  ['clstreaksrm6', 'clan-streak-srm-6', 118.0],
  ['CLSTREAKSRM6', 'clan-streak-srm-6', 118.0],
  ['CLGaussRifle', 'clan-gauss-rifle', 320.0],
  ['clgaussrifle', 'clan-gauss-rifle', 320.0],
  ['CLGAUSSRIFLE', 'clan-gauss-rifle', 320.0],
  ['CLUltraAC2', 'clan-uac-2', 62.0],
  ['clultraac2', 'clan-uac-2', 62.0],
  ['CLULTRAAC2', 'clan-uac-2', 62.0],
  ['CLUltraAC5', 'clan-uac-5', 122.0],
  ['clultraac5', 'clan-uac-5', 122.0],
  ['CLULTRAAC5', 'clan-uac-5', 122.0],
  ['CLUltraAC10', 'clan-uac-10', 210.0],
  ['clultraac10', 'clan-uac-10', 210.0],
  ['CLULTRAAC10', 'clan-uac-10', 210.0],
  ['CLUltraAC20', 'clan-uac-20', 335.0],
  ['clultraac20', 'clan-uac-20', 335.0],
  ['CLULTRAAC20', 'clan-uac-20', 335.0],
] as const;

it.each(nativeCases)('keeps native Clan identity for %s', (name, id, bv) => {
  expect(normalizeEquipmentId(name)).toBe(id);
  expect(getEquipmentEntry(name)).toMatchObject({
    id,
    techBase: 'CLAN',
    battleValue: bv,
  });
  expect(resolveEquipmentBV(name)).toMatchObject({
    resolved: true,
    battleValue: bv,
  });
});

it.each([
  'lb-2-x-ac',
  'lb-5-x-ac',
  'lb-10-x-ac',
  'lb-20-x-ac',
  'streak-srm-2',
  'streak-srm-4',
  'streak-srm-6',
  'gauss-rifle',
  'uac-2',
  'uac-5',
  'uac-10',
  'uac-20',
])('preserves explicit Inner Sphere catalog identity %s', (id) => {
  expect(normalizeEquipmentId(id)).toBe(id);
  expect(getEquipmentEntry(id)).toMatchObject({ id, techBase: 'INNER_SPHERE' });
});

it('keeps missing equipment unresolved instead of inventing a Clan entry', () => {
  expect(getEquipmentEntry('CLStreakSRM999')).toBeUndefined();
  expect(resolveEquipmentBV('CLStreakSRM999')).toEqual({
    resolved: false,
    battleValue: 0,
    heat: 0,
  });
});

it('preserves an explicit name mapping ahead of Clan pattern candidates', () => {
  const innerSphere = getEquipmentEntry('streak-srm-2');
  const clan = getEquipmentEntry('clan-streak-srm-2');
  if (!innerSphere || !clan) throw new Error('Missing test catalog entries');
  initializeCatalog([innerSphere, clan], { CLStreakSRM2: innerSphere.id });
  expect(getEquipmentEntry('CLStreakSRM2')).toEqual(innerSphere);
});

it('keeps the existing generic fallback when the Clan catalog entry is absent', () => {
  const innerSphere = getEquipmentEntry('streak-srm-2');
  if (!innerSphere) throw new Error('Missing test catalog entry');
  initializeCatalog([innerSphere], {});
  expect(getEquipmentEntry('CLStreakSRM2')).toEqual(innerSphere);
});
