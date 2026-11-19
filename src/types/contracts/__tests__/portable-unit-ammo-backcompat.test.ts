import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildEditableMechBVInput,
  buildEditableMechProjectionInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { EquipmentCategory } from '@/types/equipment';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { migratePortableUnitDocument } from '@/utils/serialization/portableUnitDocument';

import baseline from './fixtures/portable-battlemechs-before-ammo-identity.expected.json';

let mockIdentity = 0;
jest.mock('uuid', () => ({
  v4: () =>
    `00000000-0000-4000-8000-${String(++mockIdentity).padStart(12, '0')}`,
}));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public', base.replace(/^\/+/, ''), file),
        'utf8',
      ),
    ),
}));

/**
 * Replace the unit id and every mount instance id with a placeholder (`unit-0`, `mount-0`,
 * `mount-1`, ... in order of first appearance in the serialized state), using ONE mapping applied
 * everywhere in a single pass. A field that names another mount by id therefore gets that mount's
 * placeholder, so cross-references stay checked instead of being erased. Loader-minted ids are
 * session-owned (random before fix A, content-derived since), so the state is compared without
 * their spelling but with their identity structure intact.
 */
function normalizeIds(
  state: { id: string; equipment: readonly { instanceId: string }[] },
  text = JSON.stringify(state),
): string {
  const escaped = (id: string) => JSON.stringify(id).slice(1, -1);
  const known = [state.id, ...state.equipment.map((m) => m.instanceId)];
  const appearance = [...new Set(known)]
    .map((id) => ({ id, at: text.indexOf(escaped(id)) }))
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at);
  const placeholders = new Map<string, string>();
  let mounts = 0;
  for (const { id } of appearance)
    placeholders.set(id, id === state.id ? 'unit-0' : `mount-${mounts++}`);
  // Longest ids first so an id that prefixes another cannot split it.
  const pattern = new RegExp(
    [...placeholders.keys()]
      .map(escaped)
      .sort((a, b) => b.length - a.length)
      .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'g',
  );
  const byEscaped = new Map(
    [...placeholders].map(([id, placeholder]) => [escaped(id), placeholder]),
  );
  return text.replace(pattern, (match) => byEscaped.get(match) ?? match);
}

describe('normalizeIds', () => {
  const state = (ids: string[]) => ({
    id: 'unit-id',
    equipment: ids.map((instanceId) => ({ instanceId })),
  });

  it('names ids in order of first appearance and keeps cross-references', () => {
    const s = {
      ...state(['b:2', 'a:1']),
      equipment: [
        { instanceId: 'b:2', linkedAmmoId: 'a:1' },
        { instanceId: 'a:1', linkedAmmoId: 'b:2' },
      ],
    };
    expect(JSON.parse(normalizeIds(s))).toEqual({
      id: 'unit-0',
      equipment: [
        { instanceId: 'mount-0', linkedAmmoId: 'mount-1' },
        { instanceId: 'mount-1', linkedAmmoId: 'mount-0' },
      ],
    });
  });

  it('keeps distinct ids distinct, including an id that prefixes another', () => {
    const out = JSON.parse(
      normalizeIds(state(['mount:x:1', 'mount:x:10', 'mount:x:2'])),
    );
    const names = out.equipment.map(
      (m: { instanceId: string }) => m.instanceId,
    );
    expect(new Set(names).size).toBe(3);
    expect(names).toEqual(['mount-0', 'mount-1', 'mount-2']);
  });

  it('is independent of the ids spelling', () => {
    const a = normalizeIds(state(['x', 'y']));
    const b = normalizeIds(state(['id-one', 'id-two']));
    expect(a).toBe(b);
  });
});

it('imports the exact pre-A portable bytes with main-identical state, ammo and BV', async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  const bytes = readFileSync(
    join(__dirname, 'fixtures/portable-battlemechs-before-ammo-identity.saved'),
  );
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(
    baseline.sourceSha256,
  );
  const original: unknown = JSON.parse(bytes.toString('utf8'));
  const imported = migratePortableUnitDocument(original, {
    family: 'battlemechs',
    id: 'atlas-as7-d',
  });
  expect(imported).toEqual(original);

  // Fix session-only entropy to compare the complete state against plain main,
  // including its source grid, diagnostics and all mounted equipment facts.
  mockIdentity = 0;
  const now = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  try {
    const state = new UnitLoaderService().mapToUnitState(
      parseUnit(imported),
      false,
    );
    const input = buildEditableMechBVInput(
      projectEditableMech(
        buildEditableMechProjectionInput(state),
        Math.floor(state.engineRating / state.tonnage),
      ),
    );
    const result = calculateUnitBV(input, input.id);
    // Mount ids are unique within the loaded state, and loading the same document again gives the
    // same ids (fix A, 0c-UUID-001: they are derived from the unit's content, not drawn at random).
    const mountIds = state.equipment.map((mount) => mount.instanceId);
    expect(new Set(mountIds).size).toBe(mountIds.length);
    const again = new UnitLoaderService().mapToUnitState(
      parseUnit(imported),
      false,
    );
    expect(again.equipment.map((mount) => mount.instanceId)).toEqual(mountIds);
    const facts = {
      normalizedStateSha256: createHash('sha256')
        .update(normalizeIds(state))
        .digest('hex'),
      ammo: state.equipment
        .filter((mount) => mount.category === EquipmentCategory.AMMUNITION)
        .map((mount) => ({
          id: mount.equipmentId,
          category: mount.category,
          techBase: mount.techBase,
          location: mount.location,
          slots: mount.slots,
          weight: mount.weight,
          criticalSlots: mount.criticalSlots,
        })),
      bv: result.bv,
      ammoBV: result.breakdown?.ammoBV,
      ammoPools: result.breakdown?.ammoPools,
    };
    expect(facts).toEqual(baseline.mainImport);
    console.info('LEGACY_PORTABLE_IMPORT', JSON.stringify(facts));
  } finally {
    now.mockRestore();
  }
});
