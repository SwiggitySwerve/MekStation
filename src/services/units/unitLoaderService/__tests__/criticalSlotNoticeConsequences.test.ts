import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { UnitState } from '@/stores/unitState';

import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { Era } from '@/types/temporal/Era';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { scanCrits } from '../../../../../scripts/validate-bv-crit-scan';
import { deriveBvHeatAndMovement } from '../../../../../scripts/validate-bv-movement-derived';
import { mapArmorType } from '../../../../../scripts/validate-bv-unit-derived';
import { getCriticalSlotsForLocation } from '../criticalSlotEquipment';
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

function roundTrip(file: string) {
  const source = parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${file}.json`),
        'utf8',
      ),
    ),
  );
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(source, true);
  const saved = serializeCustomUnitState(state, {
    id: 'notice-evidence',
    chassis: state.chassis,
    variant: state.model,
    era: Era.LATE_SUCCESSION_WARS,
  });
  const reopened = loader.mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
  return { source, state, saved, reopened };
}
function metrics(state: UnitState) {
  const input = buildEditableMechBVInput(
    projectEditableMech(state, Math.floor(state.engineRating / state.tonnage)),
  );
  const scan = scanCrits(input, input.id);
  const bv = calculateUnitBV(input, input.id);
  if (!bv.breakdown) throw new Error('Missing BV evidence breakdown');
  return {
    input,
    scan,
    movement: deriveBvHeatAndMovement(
      input,
      scan,
      scan.detectedArmorType || mapArmorType(input.armor.type),
    ),
    bv: { ...bv, breakdown: bv.breakdown },
  };
}

it('CASE protection and BV: King Crab KGC-000', () => {
  const { state, reopened } = roundTrip(
    '2-star-league/advanced/King Crab KGC-000',
  );
  const before = metrics(state),
    after = metrics(reopened);
  expect(before.scan.caseLocs).toEqual(expect.arrayContaining(['LT', 'RT']));
  expect(after.scan.caseLocs).toEqual([]);
  expect(after.bv.breakdown.totalExplosivePenalty).toBeGreaterThan(
    before.bv.breakdown.totalExplosivePenalty ?? 0,
  );
  expect(after.bv.bv).not.toBe(before.bv.bv);
});

it.each([
  [
    'MASC run MP: Celerity CLR-03-O',
    '6-dark-age/standard/Celerity CLR-03-O',
    'runMP',
    32,
    24,
  ],
  [
    'TSM walk MP: Seraph C-SRP-O Invictus',
    '5-civil-war/advanced/Seraph C-SRP-O Invictus',
    'bvWalk',
    4,
    3,
  ],
  [
    'Supercharger run MP: Warwolf H',
    '6-dark-age/experimental/Warwolf H',
    'runMP',
    10,
    8,
  ],
  [
    'Partial Wing jump and heat: Butcherbird A',
    '6-dark-age/experimental/Butcherbird A',
    'jumpMP',
    10,
    8,
  ],
] as const)('%s', (name, file, property, initial, final) => {
  const { state, reopened } = roundTrip(file);
  const before = metrics(state),
    after = metrics(reopened);
  expect(before.movement[property]).toBe(initial);
  expect(after.movement[property]).toBe(final);
  if (name.startsWith('TSM')) {
    expect(before.movement.runMP).toBe(6);
    expect(after.movement.runMP).toBe(5);
  }
  if (name.startsWith('Partial Wing')) {
    expect(before.movement.heatDiss).toBe(23);
    expect(after.movement.heatDiss).toBe(20);
  }
});

it('UMU underwater MP: Arctic Fox AF1U', () => {
  const { state, reopened } = roundTrip('5-civil-war/standard/Arctic Fox AF1U');
  expect(metrics(state).scan.umuMP).toBe(5);
  expect(metrics(reopened).scan.umuMP).toBe(0);
});
it('standard jump MP and heat retained: Scarecrow UCU-F4', () => {
  const { state, reopened } = roundTrip('6-dark-age/standard/Scarecrow UCU-F4');
  const before = metrics(state),
    after = metrics(reopened);
  expect(
    state.unrecoveredCriticalSlots?.filter((e) => e.text === 'Jump Jet'),
  ).toHaveLength(3);
  expect(before.movement.jumpMP).toBe(3);
  expect(after.movement.jumpMP).toBe(3);
  expect(after.bv.breakdown.moveHeat).toBe(before.bv.breakdown.moveHeat);
});
it('improved jump heat lost: Nova Cat F', () => {
  const { state, reopened } = roundTrip('5-civil-war/advanced/Nova Cat F');
  const before = metrics(state),
    after = metrics(reopened);
  expect(before.scan.hasImprovedJJ).toBe(true);
  expect(after.scan.hasImprovedJJ).toBe(false);
  expect(after.movement.jumpMP).toBe(before.movement.jumpMP);
  expect(before.bv.breakdown.moveHeat).toBe(3);
  expect(after.bv.breakdown.moveHeat).toBe(6);
});
it('supercooled myomer heat lost: Wendigo-XR (Prime)', () => {
  const { state, reopened } = roundTrip(
    '6-dark-age/standard/Wendigo-XR (Prime)',
  );
  const before = metrics(state),
    after = metrics(reopened);
  expect(before.scan.hasSCM).toBe(true);
  expect(after.scan.hasSCM).toBe(false);
  expect(before.bv.breakdown.moveHeat).toBe(0);
  expect(after.bv.breakdown.moveHeat).toBe(2);
});
it.each([
  [
    'Tracks and Conversion Gear identity: Boreas A',
    '6-dark-age/experimental/Boreas A',
    ['Tracks', 'Conversion Gear'],
  ],
  [
    'wheel identity: Notos A',
    '6-dark-age/experimental/Notos A',
    ['QuadVee Wheels'],
  ],
  [
    'turret identity: Sarath SRTH-1O',
    '6-dark-age/experimental/Sarath SRTH-1O',
    ['ISQuadTurret'],
  ],
] as const)('%s', (_name, file, texts) => {
  const { state, reopened, saved } = roundTrip(file);
  for (const text of texts) {
    const entries =
      state.unrecoveredCriticalSlots?.filter((e) => e.text === text) ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries)
      expect(
        getCriticalSlotsForLocation(saved.criticalSlots, entry.location)?.[
          entry.slot
        ] ?? null,
      ).toBeNull();
    expect(reopened.equipment.some((e) => e.name === text)).toBe(false);
  }
  expect(reopened.configuration).toBe(state.configuration);
});
it.each([
  ['2-star-league/advanced/King Crab KGC-000'],
  ['6-dark-age/standard/Scarecrow UCU-F4'],
  ['6-dark-age/standard/Celerity CLR-03-O'],
])('marker configuration retained: %s', (file) => {
  const { state, reopened } = roundTrip(file);
  expect(reopened.armorType).toBe(state.armorType);
  expect(reopened.armorAllocation).toEqual(state.armorAllocation);
  expect(reopened.internalStructureType).toBe(state.internalStructureType);
  expect(reopened.tonnage).toBe(state.tonnage);
});
it('weapon mounts retained: Uni ATAE-70 ArtilleryMech', () => {
  const { state, reopened } = roundTrip(
    '6-dark-age/standard/Uni ATAE-70 ArtilleryMech',
  );
  expect(
    state.unrecoveredCriticalSlots?.filter((e) => e.text === 'ISThumper'),
  ).toHaveLength(15);
  expect(
    state.equipment.filter((e) => e.equipmentId === 'isthumper-registry'),
  ).toHaveLength(2);
  expect(
    reopened.equipment.filter((e) => e.equipmentId === 'isthumper-registry'),
  ).toHaveLength(2);
});

// These tests establish loss of cells only. They deliberately make no capability
// claim; the corresponding notice must explicitly say the effect is unestablished.
it.each([
  [
    'unestablished electronics: Scarecrow UCU-F4',
    '6-dark-age/standard/Scarecrow UCU-F4',
    'BloodhoundActiveProbe',
  ],
  [
    'unestablished cargo: Uni ATAE-70 ArtilleryMech',
    '6-dark-age/standard/Uni ATAE-70 ArtilleryMech',
    'Cargo:SIZE:1.0',
  ],
  [
    'unestablished ammo: Dig Lord RCL-4 MiningMech',
    '4-clan-invasion/experimental/Dig Lord RCL-4 MiningMech',
    'ISFluidGun Ammo',
  ],
  [
    'unestablished heat sinks: Jabberwocky JAW-65A EngineerMech',
    '1-age-of-war/advanced/Jabberwocky JAW-65A EngineerMech',
    'Heat Sink',
  ],
  [
    'unestablished miscellaneous: Jabberwocky JAW-65A EngineerMech',
    '1-age-of-war/advanced/Jabberwocky JAW-65A EngineerMech',
    'Environmental Sealing (Mech)',
  ],
  [
    'unestablished system boundary: Screamer LAM SCR-1X-LAM',
    '2-star-league/advanced/Screamer LAM SCR-1X-LAM',
    'Avionics',
  ],
] as const)('%s', (_name, file, text) => {
  const { state, saved } = roundTrip(file);
  const entries =
    state.unrecoveredCriticalSlots?.filter((e) => e.text === text) ?? [];
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries)
    expect(
      getCriticalSlotsForLocation(saved.criticalSlots, entry.location)?.[
        entry.slot
      ] ?? null,
    ).toBeNull();
});
