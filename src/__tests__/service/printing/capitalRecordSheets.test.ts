import fs from 'fs';
import path from 'path';

import {
  extractCapitalData,
  selectCapitalTemplate,
} from '@/services/printing/recordsheet/dataExtractors.capital';
import { bindCapital } from '@/services/printing/svgRecordSheetRenderer/capital/bindings';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { UnitContract } from '@/types/contracts';
import { capitalStructure } from '@/utils/construction/aerospace/capitalStructure';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import { initializeEquipment } from './catalogRecordSheets.helpers';

beforeAll(initializeEquipment);
const root = 'public/data/units/capital';
const entries: { id: string; path: string }[] = JSON.parse(
  fs.readFileSync(`${root}/index.json`, 'utf8'),
).units;
const load = (entry: (typeof entries)[number]) => {
  const source = UnitContract.parse(
    JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8')),
  );
  if (!isDefinitionForFamily('capital', source))
    throw new Error('Wrong catalog family');
  return source;
};

test('all 394 capital definitions retain every printed owner figure and source row', () => {
  const rows = entries.map((entry) => {
    const source = load(entry);
    const data = extractCapitalData(source);
    const bindings = bindCapital(data);
    expect(bindings.texts.bv).toContain(
      data.bv.scope === 'complete'
        ? '(complete)'
        : data.bv.scope === 'defensive-only'
          ? '(defensive only)'
          : 'unavailable',
    );
    for (const armor of data.armor) {
      expect(bindings.texts[`textArmor_${armor.code}`]).toBe(
        `(${armor.points})`,
      );
      expect(
        bindings.pips.find((p) => p.groupId === `armorPips${armor.code}`)
          ?.count,
      ).toBe(armor.points);
    }

    const differences: { field: string; actual: unknown; expected: unknown }[] =
      [];
    const check = (field: string, actual: unknown, expected: unknown) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        differences.push({ field, actual, expected });
    };
    const owner = calculateBattleValueForUnit(
      contractUnitToBVUnit(source as IContractBVSource),
    );
    if (owner?.kind !== 'dropship' && owner?.kind !== 'capital-ship')
      throw new Error('Wrong BV owner');
    const bv = owner.breakdown;
    check('BV.scope', data.bv.scope, bv.calculationScope);
    check(
      'BV.total',
      data.header.battleValue,
      bv.calculationScope === 'complete' ? bv.final : 0,
    );
    check(
      'BV.value',
      data.bv.scope === 'complete'
        ? data.bv.total
        : data.bv.scope === 'defensive-only'
          ? data.bv.defensive
          : undefined,
      bv.calculationScope === 'complete' ? bv.final : bv.defensive,
    );
    check(
      'armor',
      Object.fromEntries(data.armor.map((a) => [a.arc, a.points])),
      source.armor?.byArc,
    );
    check('SI', data.structuralIntegrity, source.structuralIntegrity);
    check(
      'thrust',
      [data.safeThrust, data.maxThrust],
      [source.movement?.safeThrust, source.movement?.maxThrust],
    );
    check('fuel', data.fuel, source.fuel);
    check('heatSinks', data.heatSinkCount, source.heatSinks?.count);
    for (const [field, label] of [
      ['officers', 'Officers'],
      ['gunners', 'Gunners'],
      ['otherCrew', 'Other Crew'],
      ['battleArmor', 'Battle Armor'],
      ['otherPassengers', 'Other Passengers'],
      ['escapePods', 'Escape Pods'],
      ['lifeBoats', 'Lifeboats'],
    ] as const)
      check(
        field,
        data.crew.find((r) => r.label === label)?.count ?? 0,
        source[field] ?? 0,
      );
    check(
      'transport.count',
      data.transport.reduce((sum, r) => sum + r.count, 0),
      source.transporters?.length ?? 0,
    );

    check(
      'crew',
      data.crew.find((r) => r.label === 'Crew')?.count,
      source.crew,
    );
    check(
      'passengers',
      data.crew.find((r) => r.label === 'Passengers')?.count ?? 0,
      source.passengers ?? 0,
    );
    check(
      'marines',
      data.crew.find((r) => r.label === 'Marines')?.count ?? 0,
      source.marines ?? 0,
    );
    check(
      'equipment.names',
      data.weaponBays.flatMap((b) => b.items.map((i) => i.name)),
      source.equipment?.map((i) => i.name ?? i.id) ?? [],
    );
    const expected =
      source.unitType === 'DropShip'
        ? `dropship_${source.motionType === 'SPHEROID' ? 'spheroid' : 'aerodyne'}_default`
        : (
            {
              JumpShip: 'jumpship_default',
              WarShip: 'warship_default',
              'Space Station': 'spacestation_default',
            } as Record<string, string>
          )[source.unitType];
    check('template', selectCapitalTemplate(data), expected);
    return {
      id: entry.id,
      subtype: source.unitType,
      template: selectCapitalTemplate(data),
      differences,
      unresolved: data.unresolved,
      scope: data.bv.scope,
    };
  });
  const summary = {
    total: rows.length,
    rejected: 0,
    differing: rows.filter((r) => r.differences.length).length,
    unresolved: rows.filter((r) => r.unresolved.length).length,
    unresolvedCatalog: rows.filter((r) =>
      r.unresolved.some((u) => /Unresolved/.test(u.reason)),
    ).length,
    unsupported: rows.filter((r) =>
      r.unresolved.some((u) => !/Unresolved/.test(u.reason)),
    ).length,
    scopes: rows.reduce<Record<string, number>>((out, r) => {
      out[r.scope] = (out[r.scope] ?? 0) + 1;
      return out;
    }, {}),
  };
  if (process.env.RECORD_SHEET_AUDIT)
    fs.writeFileSync(
      `${process.env.RECORD_SHEET_AUDIT}/capital.json`,
      JSON.stringify({ summary, rows }, null, 2),
    );
  expect(summary.total).toBe(394);
  expect(
    rows.flatMap((r) => r.differences.map((d) => ({ id: r.id, ...d }))),
  ).toEqual([]);
});

test('KF and sail integrity use the pinned capital structure owner', () => {
  expect(capitalStructure('JumpShip', 100000, 0, 30, true)).toEqual({
    kf: 3,
    sail: 4,
  });
  expect(capitalStructure('WarShip', 1000000, 1, 30, true)).toEqual({
    kf: 21,
    sail: 5,
  });
  expect(capitalStructure('Space Station', 100000, 3, 30, false)).toEqual({});
});

test('unknown hulls refuse instead of selecting another ship sheet', () => {
  expect(() =>
    selectCapitalTemplate({ shipType: 'DropShip', motionType: 'UNKNOWN' }),
  ).toThrow(/hull/i);
  expect(() =>
    selectCapitalTemplate({ shipType: 'Small Craft', motionType: 'AERODYNE' }),
  ).toThrow(/capital/i);
});

test('a source bay marker counts its first weapon and rear arcs retain their heat', () => {
  const source = load(entries[0]);
  const data = extractCapitalData(
    UnitContract.parse({
      ...source,
      equipment: [
        { id: 'b-ppc', name: '(B) PPC', location: 'NOSE' },
        { id: 'ppc', name: 'PPC', location: 'NOSE' },
        { id: 'ams', name: 'AMS', location: 'NOSE' },
        { id: 'r-ppc', name: '(R) PPC', location: 'LEFT_SIDE' },
        { id: 'missing-catalog-weapon', name: 'Unknown', location: 'AFT' },
      ],
    }),
  );
  expect(data.weaponBays.map((b) => [b.arc, b.number, b.items.length])).toEqual(
    [
      ['Nose', 1, 3],
      ['AL', 0, 1],
      ['Aft', 0, 1],
    ],
  );
  expect(data.heatByArc.find((a) => a.arc === 'Nose')?.heat).toBe(21);
  expect(data.heatByArc.find((a) => a.arc === 'AL')?.heat).toBe(10);
  expect(data.heatByArc.find((a) => a.arc === 'Aft')?.heat).toBeUndefined();
  expect(data.bv.scope).toBe('defensive-only');
  expect(data.header.battleValue).toBe(0);
});
