import fs from 'fs';
import path from 'path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import {
  getEquipmentRegistry,
  resetEquipmentRegistry,
} from '@/services/equipment/EquipmentRegistry';

/**
 * A not-found lookup suggests similar names. The scan behind it ran for every
 * miss and is now remembered per normalized name and stops at the fifth id.
 * This suite pins the suggestions against the previous scan, reproduced below,
 * over the real catalog.
 */
const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

/** The previous findSimilar, over the registry's own name map. */
function referenceSimilar(
  nameToIdMap: Map<string, string>,
  name: string,
): string[] {
  const normalized = normalize(name);
  const similar: string[] = [];
  for (const [mappedName, id] of nameToIdMap) {
    const normalizedMapped = normalize(mappedName);
    if (
      normalizedMapped.includes(normalized) ||
      normalized.includes(normalizedMapped)
    ) {
      if (!similar.includes(id)) similar.push(id);
    }
  }
  return similar.slice(0, 5);
}

async function initializeRealCatalog(): Promise<void> {
  const transport = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => {
      const url = String(input);
      if (!url.startsWith('/data/equipment/official/'))
        throw new Error(`Unexpected asset request: ${url}`);
      const value: unknown = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'public', url), 'utf8'),
      );
      return { ok: true, status: 200, json: async () => value } as Response;
    });
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  transport.mockRestore();
}

describe('EquipmentRegistry suggestions for a not-found name', () => {
  beforeAll(async () => {
    resetEquipmentRegistry();
    await initializeRealCatalog();
  });

  it('match the previous scan for catalog names, ids, truncations and unknown words', () => {
    const registry = getEquipmentRegistry();
    const nameToIdMap = (
      registry as unknown as { nameToIdMap: Map<string, string> }
    ).nameToIdMap;
    expect(nameToIdMap.size).toBeGreaterThan(1000);

    const probes = new Set<string>(['', 'x', 'zzzz-not-equipment', 'Laser']);
    let step = 0;
    for (const [name, id] of nameToIdMap) {
      if (step++ % 4 !== 0) continue;
      probes.add(`${name}-unlisted`);
      probes.add(name.slice(0, Math.max(2, name.length - 2)));
      probes.add(id.split('-').slice(0, 2).join(' '));
      probes.add(`${name} Prototype`);
    }
    expect(probes.size).toBeGreaterThan(1000);

    let withSuggestions = 0;
    let capped = 0;
    for (const probe of probes) {
      const expected = referenceSimilar(nameToIdMap, probe);
      // twice: the second call is served from the remembered answer
      for (let call = 0; call < 2; call++) {
        const result = registry.lookup(probe);
        if (result.found) continue;
        expect([probe, result.alternateIds]).toEqual([probe, expected]);
      }
      if (expected.length > 0) withSuggestions++;
      if (expected.length === 5) capped++;
    }
    // the probes must exercise both an empty and a full (capped) answer
    expect(withSuggestions).toBeGreaterThan(50);
    expect(capped).toBeGreaterThan(5);
  });

  it('hand out a copy, so a caller cannot change later answers', () => {
    const registry = getEquipmentRegistry();
    const first = registry.lookup('zzzz-not-equipment-laser').alternateIds;
    expect(first).toBeDefined();
    const snapshot = [...(first ?? [])];
    first?.push('tampered');
    first?.shift();
    expect(registry.lookup('zzzz-not-equipment-laser').alternateIds).toEqual(
      snapshot,
    );
  });
});
