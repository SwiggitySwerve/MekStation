import {
  addAmmunitionAliases,
  ammunitionAliasKey,
  isPhysicalAmmunitionBin,
} from '@/services/equipment/aliases/ammunition';
import { TechBase } from '@/types/enums/TechBase';

import type { EquipmentCatalogEntry } from '../types';

import {
  isLegacyEquipmentId,
  preferRegistryEquipment,
} from '../../equipmentBVCatalogData';
import {
  initializeCatalog,
  loadAmmunitionCatalog,
  resetCatalogCache,
} from '../catalogLoader';
import { getAmmunitionEntry, getAmmunitionWeightEntry } from '../resolution';

/**
 * getAmmunitionWeightEntry used to rebuild the whole physical-bin alias map on
 * every call. The map is now built once per catalog; this suite pins that the
 * results did not change by comparing against the previous implementation,
 * reproduced verbatim below, over every real ammunition id and name.
 */
const normalize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The previous implementation's alias-map loop, verbatim. */
function legacyAliases(): Map<string, string> {
  const catalog = loadAmmunitionCatalog(),
    aliases = new Map<string, string>();
  for (const entry of catalog.values())
    if (
      isLegacyEquipmentId(entry.id) &&
      entry.weight !== undefined &&
      entry.shotsPerTon !== undefined
    )
      addAmmunitionAliases(
        {
          ...entry,
          weight: entry.weight,
          shotsPerTon: entry.shotsPerTon,
          techBase:
            entry.techBase === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE,
        },
        aliases,
        normalize,
      );
  return aliases;
}

/**
 * The previous implementation: it rebuilt the map on every call. The map is a
 * pure function of the catalog, so a map built once for a given catalog is what
 * every one of those rebuilds produced; callers comparing many probes against
 * one catalog pass it in instead of paying the rebuild per probe.
 */
function legacyAmmunitionWeightEntry(
  ammoId: string,
  aliases: Map<string, string> = legacyAliases(),
): EquipmentCatalogEntry | undefined {
  const catalog = loadAmmunitionCatalog();
  const alias = aliases.get(ammunitionAliasKey(ammoId, normalize) ?? '');
  const imported = getAmmunitionEntry(ammoId);
  const entry = preferRegistryEquipment(
    (alias ? catalog.get(alias) : undefined) ?? imported,
    imported,
    ammoId,
  );
  return entry?.weight !== undefined &&
    isPhysicalAmmunitionBin({ ...entry, weight: entry.weight })
    ? entry
    : undefined;
}

const fakeAmmo = (
  id: string,
  name: string,
  shotsPerTon: number,
): EquipmentCatalogEntry => ({
  id,
  name,
  category: 'Ammunition',
  techBase: 'IS',
  weight: 1,
  battleValue: 1,
  shotsPerTon,
});

describe('getAmmunitionWeightEntry alias map', () => {
  afterEach(() => resetCatalogCache());

  it('returns exactly what the per-call rebuild returned, for every real ammunition id and name', () => {
    const catalog = loadAmmunitionCatalog();
    const probes = new Set<string>();
    for (const entry of catalog.values()) {
      probes.add(entry.id);
      probes.add(entry.name);
      probes.add(`IS ${entry.name}`);
      probes.add(`Clan ${entry.name}`);
      probes.add(`${entry.name} (Clan)`);
      probes.add(`${entry.name} (Omnipod)`);
    }
    probes.add('not-an-ammo-id');
    expect(probes.size).toBeGreaterThan(1000);
    const aliases = legacyAliases();
    expect(aliases.size).toBeGreaterThan(100);
    for (const probe of probes)
      expect([probe, getAmmunitionWeightEntry(probe)]).toEqual([
        probe,
        legacyAmmunitionWeightEntry(probe, aliases),
      ]);
  });

  it('gives the same answer on every call', () => {
    const first = getAmmunitionWeightEntry('MG Ammo');
    expect(first).toBeDefined();
    for (let call = 0; call < 3; call++)
      expect(getAmmunitionWeightEntry('MG Ammo')).toBe(first);
  });

  // Aliases are stored under prefixed spellings, so probe a few and take the
  // first hit; every answer is also pinned to the previous implementation.
  const found = (name: string) => {
    const probes = [name, `IS ${name}`, `Clan ${name}`, `IS${name}`];
    for (const probe of probes)
      expect([probe, getAmmunitionWeightEntry(probe)]).toEqual([
        probe,
        legacyAmmunitionWeightEntry(probe),
      ]);
    return probes.map(getAmmunitionWeightEntry).find(Boolean)?.id;
  };

  it('follows a catalog that is reset or re-initialised', () => {
    initializeCatalog([], undefined, [fakeAmmo('zz-ammo-a', 'Zed A Ammo', 10)]);
    expect(found('Zed A Ammo')).toBe('zz-ammo-a');
    expect(found('Zed B Ammo')).toBeUndefined();

    initializeCatalog([], undefined, [fakeAmmo('zz-ammo-b', 'Zed B Ammo', 20)]);
    expect(found('Zed B Ammo')).toBe('zz-ammo-b');
    expect(found('Zed A Ammo')).toBeUndefined();

    resetCatalogCache();
    expect(found('Zed B Ammo')).toBeUndefined();
    expect(found('MG Ammo')).toBeDefined();
  });

  it('notices an entry added to the same catalog Map', () => {
    initializeCatalog([], undefined, [fakeAmmo('zz-ammo-a', 'Zed A Ammo', 10)]);
    expect(found('Zed C Ammo')).toBeUndefined();
    loadAmmunitionCatalog().set(
      'zz-ammo-c',
      fakeAmmo('zz-ammo-c', 'Zed C Ammo', 30),
    );
    expect(found('Zed C Ammo')).toBe('zz-ammo-c');
  });
});
