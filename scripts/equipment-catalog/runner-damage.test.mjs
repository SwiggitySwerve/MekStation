import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import routing from '../../public/data/equipment/registry-routing.json' with { type: 'json' };

// Standing gate: an approved route moves native names onto a generated record.
// The combat runner must never deal less damage with the routed record than it
// did with the record the names previously resolved to.
const require = createRequire(import.meta.url);
require('tsx/cjs');
const {
  buildWeaponLookupFromCatalogFiles,
} = require('../../src/simulation/runner/UnitHydrationCatalogLookup.ts');
const {
  toAIWeapon,
} = require('../../src/simulation/runner/UnitHydrationWeapons.ts');
const {
  AMMUNITION_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} = require('../../src/utils/construction/equipmentBVCatalogData.ts');
// Ammo routes (e.g. IS LB 2-X AC Ammo) can share their previous id with a weapon
// record; the runner never fires an ammunition record, so they are out of scope.
const ammunitionIds = new Set(
  AMMUNITION_CATALOG_FILES.flatMap((file) => file.items ?? []).map(
    (item) => item.id,
  ),
);

const weapon = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);
const runnerDamage = (id) => {
  const entry = weapon(id);
  return entry ? toAIWeapon(entry, 0).damage : undefined;
};

// Every (routed id, previous id) pair in the routing file.
const routes = Object.entries(routing.nativeNames).flatMap(([id, route]) =>
  typeof route === 'string'
    ? [[id, routing.previousIds[id], [route]]]
    : [...new Set(Object.values(route))].map((previous) => [
        id,
        previous,
        Object.keys(route).filter((name) => route[name] === previous),
      ]),
);

test('no route lowers combat-runner damage below its previous target', () => {
  assert(routes.length > 0);
  const lowered = [];
  for (const [id, previous, names] of routes) {
    const before = runnerDamage(previous);
    // Previous target is not a weapon, or the route is an ammunition identity.
    if (before === undefined || ammunitionIds.has(id)) continue;
    const after = runnerDamage(id);
    if (after === undefined || after < before)
      lowered.push(
        `${id} (was ${previous}): ${before} -> ${after} [${names.join(', ')}]`,
      );
  }
  assert.deepEqual(lowered, []);
});

// Pinned MegaMek 48fcb2f6 damage of the routed launchers: per missile
// MissileWeaponHandler.java:308-318 (1), SRMHandler.java:66-78 (2), times the
// rack size; artillery deals its rack size (ArtilleryWeaponDistantFireHandler.java:746-747).
const JAVA_RUNNER_DAMAGE = {
  'issniper-registry': 20,
  'issrm4os-registry': 8,
  'issrm2ios-registry': 4,
  'issrm4ios-registry': 8,
  'isbalrm1-registry': 1,
  'isbalrm2-registry': 2,
  'isbalrm3-registry': 3,
  'isbalrm4-registry': 4,
  'isbalrm1os-registry': 1,
  'isbalrm2os-registry': 2,
  'isbalrm3os-registry': 3,
  'isbalrm4os-registry': 4,
  'isbasrm1-registry': 2,
  'isbasrm3-registry': 6,
  'isbasrm5-registry': 10,
  'isbasrm1os-registry': 2,
  'isbasrm5os-registry': 10,
  'mrm-1-registry': 1,
  'mrm-2-registry': 2,
  'mrm-3-registry': 3,
  'mrm-4-registry': 4,
  'mrm-5-registry': 5,
  'mrm-1-os-registry': 1,
  'mrm-2-os-registry': 2,
  'mrm-3-os-registry': 3,
  'mrm-4-os-registry': 4,
  'mrm-5-os-registry': 5,
};

test('routed launchers deal their pinned Java damage in the combat runner', () => {
  const actual = Object.fromEntries(
    Object.keys(JAVA_RUNNER_DAMAGE).map((id) => [id, runnerDamage(id)]),
  );
  assert.deepEqual(actual, JAVA_RUNNER_DAMAGE);
});
