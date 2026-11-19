// Reopen (b) for vehicles: the document and mount comparisons and the editor-owned key list.
//   node --test scripts/lib/runtime-parity/vehicle-document.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EDITOR_OWNED_KEYS,
  MOUNT_LIST_KEY,
  documentDiff,
  documentLeaves,
  isEditorOwned,
  mountDiff,
} from './vehicle-document.mjs';

const source = {
  id: 'puma-assault-tank',
  chassis: 'Puma Assault Tank',
  fuelType: 'Gasoline',
  quirks: ['easy_maintain', 'rugged_1'],
  armor: { type: 'STANDARD', barRating: 7, byLocation: { FRONT: 40 } },
  fluff: { overview: 'text' },
  transporters: [],
  [MOUNT_LIST_KEY]: [
    { id: 'ISMediumLaser', location: 'TURRET', name: 'Medium Laser' },
  ],
};

test('leaves walk objects, keep arrays whole, and leave the mount list to mountDiff', () => {
  const leaves = documentLeaves(source);
  assert.deepEqual([...leaves.keys()].sort(), [
    'armor.barRating',
    'armor.byLocation.FRONT',
    'armor.type',
    'chassis',
    'fluff.overview',
    'fuelType',
    'id',
    'quirks[]',
    'transporters[]',
  ]);
  assert.equal(leaves.get('quirks[]'), '["easy_maintain","rugged_1"]');
  // An empty object is a leaf of its own, so losing it is visible.
  assert.equal(documentLeaves({ fluff: {} }).get('fluff'), '{}');
});

test('the diff names lost and changed source paths, sorted, and never a key only the saved document has', () => {
  const saved = {
    id: 'puma-assault-tank',
    chassis: 'Puma Assault Tank',
    quirks: ['easy_maintain'],
    armor: { byLocation: { FRONT: 40 }, type: 'STANDARD' },
    fluff: { overview: 'text' },
    transporters: [],
    // The writer's own keys: not losses.
    schemaVersion: '1.0',
    family: 'vehicles',
    vehicleEditor: { name: 'Puma Assault Tank' },
    [MOUNT_LIST_KEY]: [],
  };
  assert.deepEqual(documentDiff(source, saved), [
    { path: 'armor.barRating', change: 'lost' },
    { path: 'fuelType', change: 'lost' },
    { path: 'quirks[]', change: 'changed' },
  ]);
  // The same document, keys in any order, has no losses; equipment is not compared here.
  assert.deepEqual(
    documentDiff(source, {
      ...Object.fromEntries(Object.entries(source).reverse()),
      armor: { byLocation: { FRONT: 40 }, barRating: 7, type: 'STANDARD' },
      [MOUNT_LIST_KEY]: [],
    }),
    [],
  );
  // A value whose type changes is a change; a nested object that disappears loses every leaf under it.
  assert.deepEqual(
    documentDiff(
      { armor: { barRating: 7 }, year: 3050 },
      { armor: 7, year: '3050' },
    ),
    [
      { path: 'armor.barRating', change: 'lost' },
      { path: 'year', change: 'changed' },
    ],
  );
});

test('an editor-owned key hides its own paths and nothing else, and every listed key names its reason', () => {
  const owned = [{ key: 'id', reason: 'the library save assigns its own id' }];
  assert.equal(isEditorOwned('id', owned), true);
  assert.equal(isEditorOwned('id.part', owned), true);
  assert.equal(isEditorOwned('id[]', owned), true);
  assert.equal(isEditorOwned('idx', owned), false);
  assert.deepEqual(
    documentDiff({ id: 'a', idx: 1 }, { id: 'b', idx: 2 }, owned),
    [{ path: 'idx', change: 'changed' }],
  );
  // The committed list: each entry has a key and a one-line reason (C2's ruling); fluff, role, source and
  // weightClass are measured, not owned.
  for (const entry of EDITOR_OWNED_KEYS) {
    assert.equal(typeof entry.key, 'string');
    assert.ok(entry.reason && !entry.reason.includes('\n'));
  }
  for (const measured of ['fluff.overview', 'role', 'source', 'weightClass'])
    assert.equal(isEditorOwned(measured), false);
});

test('mounts compare as multisets by location and id, one numbered entry per surplus copy', () => {
  const laser = {
    id: 'ISMediumLaser',
    location: 'TURRET',
    name: 'Medium Laser',
  };
  const mg = { id: 'ISMachineGun', location: 'FRONT', name: 'Machine Gun' };
  // Order and display names do not matter.
  assert.deepEqual(mountDiff([laser, mg], [{ ...mg, name: 'MG' }, laser]), {
    losses: [],
    additions: [],
  });
  // Two of three copies lost, one moved to another location.
  assert.deepEqual(
    mountDiff([laser, laser, laser, mg], [laser, { ...mg, location: 'BODY' }]),
    {
      losses: [
        'FRONT:ISMachineGun#1',
        'TURRET:ISMediumLaser#1',
        'TURRET:ISMediumLaser#2',
      ],
      additions: ['BODY:ISMachineGun#1'],
    },
  );
  assert.deepEqual(mountDiff(undefined, [mg]), {
    losses: [],
    additions: ['FRONT:ISMachineGun#1'],
  });
});
